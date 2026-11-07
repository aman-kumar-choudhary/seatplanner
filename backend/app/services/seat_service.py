from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status
from app.services.audit_service import create_audit_log
from app.utils.helpers import serialize_doc

async def get_seats(
    db: AsyncIOMotorDatabase,
    section_id: Optional[str] = None,
    session_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    query: Dict[str, Any] = {}
    if section_id:
        if not ObjectId.is_valid(section_id):
            raise HTTPException(status_code=400, detail="Invalid section ID format")
        query["section_id"] = ObjectId(section_id)

    seats = await db.seats.find(query).sort([("row", 1), ("column", 1)]).to_list(length=5000)
    if not seats:
        return []

    # Map section names
    section_ids = list(set([s["section_id"] for s in seats]))
    sections = await db.sections.find({"_id": {"$in": section_ids}}).to_list(length=len(section_ids))
    sec_map = {str(s["_id"]): s["name"] for s in sections}

    # Fetch assigned students
    student_ids = [s["student_id"] for s in seats if s.get("student_id")]
    students = []
    if student_ids:
        students = await db.students.find({"_id": {"$in": student_ids}}).to_list(length=len(student_ids))
    student_map = {
        str(s["_id"]): {
            "id": str(s["_id"]),
            "name": s["name"],
            "roll_number": s["roll_number"],
            "course": s.get("course"),
            "department": s.get("department"),
            "year": s.get("year"),
            "email": s.get("email"),
        }
        for s in students
    }

    # If session_id provided, fetch attendance for that session
    attendance_map = {}
    if session_id and ObjectId.is_valid(session_id):
        records = await db.attendance_records.find({"session_id": ObjectId(session_id)}).to_list(length=5000)
        for r in records:
            attendance_map[str(r["student_id"])] = r["status"]

    results = []
    for s in seats:
        seat_data = serialize_doc(s)
        seat_data["section_name"] = sec_map.get(str(s["section_id"]), "Unknown")
        
        stud_id_str = str(s["student_id"]) if s.get("student_id") else None
        if stud_id_str and stud_id_str in student_map:
            seat_data["student"] = student_map[stud_id_str]
            if session_id:
                # If marked in session, use that; otherwise "not_marked"
                seat_data["attendance_status"] = attendance_map.get(stud_id_str, "not_marked")
        else:
            seat_data["student"] = None
            if session_id:
                seat_data["attendance_status"] = None

        results.append(seat_data)

    return results

async def assign_seat(
    db: AsyncIOMotorDatabase,
    seat_id: str,
    student_id: str,
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    if not ObjectId.is_valid(seat_id) or not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid seat or student ID format")

    seat = await db.seats.find_one({"_id": ObjectId(seat_id)})
    if not seat:
        raise HTTPException(status_code=404, detail="Seat not found")

    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Important Business Rule 1: A seat can have at most one assigned student
    if seat.get("student_id") is not None:
        raise HTTPException(status_code=400, detail=f"Seat {seat['seat_number']} is already occupied.")

    # Important Business Rules 2 & 3: A student cannot be assigned to two seats
    existing_seat = await db.seats.find_one({"student_id": ObjectId(student_id)})
    if existing_seat:
        raise HTTPException(
            status_code=400,
            detail=f"Student '{student['name']}' is already assigned to seat {existing_seat['seat_number']}."
        )

    # Assign
    await db.seats.update_one(
        {"_id": ObjectId(seat_id)},
        {"$set": {"student_id": ObjectId(student_id), "status": "assigned"}}
    )

    sec = await db.sections.find_one({"_id": seat["section_id"]})
    sec_name = sec["name"] if sec else "Unknown"

    await create_audit_log(
        db=db,
        action="seat_assigned",
        target_type="seat",
        admin_id=admin_id,
        admin_name=admin_name,
        target_id=seat_id,
        details=f"Assigned {student['name']} (Roll: {student['roll_number']}) to {sec_name} - {seat['seat_number']}",
        new_value={"student_id": student_id, "student_name": student["name"], "seat_number": seat["seat_number"]},
        ip_address=ip_address
    )

    return {
        "message": f"Student '{student['name']}' assigned to seat {seat['seat_number']} successfully.",
        "seat_id": seat_id,
        "seat_number": seat["seat_number"],
        "student_id": student_id,
        "student_name": student["name"]
    }

async def reassign_seat(
    db: AsyncIOMotorDatabase,
    student_id: str,
    target_seat_id: str,
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    if not ObjectId.is_valid(target_seat_id) or not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid target seat or student ID format")

    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    target_seat = await db.seats.find_one({"_id": ObjectId(target_seat_id)})
    if not target_seat:
        raise HTTPException(status_code=404, detail="Target seat not found")

    if target_seat.get("student_id") is not None and str(target_seat["student_id"]) != student_id:
        raise HTTPException(status_code=400, detail=f"Target seat {target_seat['seat_number']} is already occupied.")

    # Find current seat
    current_seat = await db.seats.find_one({"student_id": ObjectId(student_id)})
    prev_seat_number = current_seat["seat_number"] if current_seat else "None"

    # Release current seat if exists
    if current_seat:
        await db.seats.update_one(
            {"_id": current_seat["_id"]},
            {"$set": {"student_id": None, "status": "empty"}}
        )

    # Assign target seat
    await db.seats.update_one(
        {"_id": ObjectId(target_seat_id)},
        {"$set": {"student_id": ObjectId(student_id), "status": "assigned"}}
    )

    await create_audit_log(
        db=db,
        action="seat_reassigned",
        target_type="seat",
        admin_id=admin_id,
        admin_name=admin_name,
        target_id=target_seat_id,
        details=f"Reassigned {student['name']} from {prev_seat_number} to {target_seat['seat_number']}",
        previous_value={"seat_number": prev_seat_number},
        new_value={"seat_number": target_seat["seat_number"]},
        ip_address=ip_address
    )

    return {
        "message": f"Student '{student['name']}' moved from {prev_seat_number} to {target_seat['seat_number']} successfully.",
        "previous_seat": prev_seat_number,
        "new_seat": target_seat["seat_number"]
    }

async def swap_seats(
    db: AsyncIOMotorDatabase,
    seat_id_1: str,
    seat_id_2: str,
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    if not ObjectId.is_valid(seat_id_1) or not ObjectId.is_valid(seat_id_2):
        raise HTTPException(status_code=400, detail="Invalid seat ID format")

    if seat_id_1 == seat_id_2:
        raise HTTPException(status_code=400, detail="Cannot swap a seat with itself")

    s1 = await db.seats.find_one({"_id": ObjectId(seat_id_1)})
    s2 = await db.seats.find_one({"_id": ObjectId(seat_id_2)})
    if not s1 or not s2:
        raise HTTPException(status_code=404, detail="One or both seats not found")

    stud1_id = s1.get("student_id")
    stud2_id = s2.get("student_id")

    if not stud1_id and not stud2_id:
        raise HTTPException(status_code=400, detail="Both seats are empty. Nothing to swap.")

    # In MongoDB with unique sparse index on student_id, swapping requires temporary clearing
    # step 1: clear s1
    await db.seats.update_one({"_id": s1["_id"]}, {"$set": {"student_id": None, "status": "empty"}})
    # step 2: assign s2's student to s1 (or leave s1 empty if s2 had none)
    await db.seats.update_one(
        {"_id": s1["_id"]},
        {"$set": {"student_id": stud2_id, "status": "assigned" if stud2_id else "empty"}}
    )
    # step 3: assign s1's original student to s2 (or leave s2 empty if s1 had none)
    await db.seats.update_one(
        {"_id": s2["_id"]},
        {"$set": {"student_id": stud1_id, "status": "assigned" if stud1_id else "empty"}}
    )

    await create_audit_log(
        db=db,
        action="seats_swapped",
        target_type="seat",
        admin_id=admin_id,
        admin_name=admin_name,
        target_id=f"{seat_id_1}<->{seat_id_2}",
        details=f"Swapped seat {s1['seat_number']} and {s2['seat_number']}",
        ip_address=ip_address
    )

    return {"message": f"Successfully swapped seats {s1['seat_number']} and {s2['seat_number']}."}

async def release_seat(
    db: AsyncIOMotorDatabase,
    seat_id: str,
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    if not ObjectId.is_valid(seat_id):
        raise HTTPException(status_code=400, detail="Invalid seat ID format")

    seat = await db.seats.find_one({"_id": ObjectId(seat_id)})
    if not seat:
        raise HTTPException(status_code=404, detail="Seat not found")

    stud_id = seat.get("student_id")
    stud_name = "Unknown"
    if stud_id:
        stud = await db.students.find_one({"_id": stud_id})
        if stud:
            stud_name = stud["name"]

    await db.seats.update_one(
        {"_id": ObjectId(seat_id)},
        {"$set": {"student_id": None, "status": "empty"}}
    )

    await create_audit_log(
        db=db,
        action="seat_released",
        target_type="seat",
        admin_id=admin_id,
        admin_name=admin_name,
        target_id=seat_id,
        details=f"Released seat {seat['seat_number']} (previously assigned to {stud_name})",
        previous_value={"student_id": str(stud_id) if stud_id else None, "student_name": stud_name},
        ip_address=ip_address
    )

    return {"message": f"Seat {seat['seat_number']} has been released and is now empty."}
