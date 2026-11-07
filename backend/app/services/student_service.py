from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status
from app.schemas.student import StudentCreate, StudentUpdate
from app.services.audit_service import create_audit_log
from app.utils.helpers import serialize_doc

async def get_students(
    db: AsyncIOMotorDatabase,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    department: Optional[str] = None,
    course: Optional[str] = None,
    year: Optional[int] = None,
    assigned_status: Optional[str] = None, # "all", "assigned", "unassigned"
):
    query: Dict[str, Any] = {}
    
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"name": search_regex},
            {"roll_number": search_regex},
            {"student_id": search_regex},
            {"email": search_regex}
        ]
        
    if department:
        query["department"] = department
    if course:
        query["course"] = course
    if year:
        query["year"] = year

    # Filter by seat assignment if requested
    if assigned_status == "assigned":
        assigned_student_ids = await db.seats.distinct("student_id", {"student_id": {"$ne": None}})
        query["_id"] = {"$in": assigned_student_ids}
    elif assigned_status == "unassigned":
        assigned_student_ids = await db.seats.distinct("student_id", {"student_id": {"$ne": None}})
        query["_id"] = {"$nin": assigned_student_ids}

    total = await db.students.count_documents(query)
    cursor = db.students.find(query).sort("roll_number", 1).skip(skip).limit(limit)
    students = await cursor.to_list(length=limit)

    # Attach seat assignments
    student_ids = [s["_id"] for s in students]
    seats = await db.seats.find({"student_id": {"$in": student_ids}}).to_list(length=len(students))
    
    # Also fetch section names for assigned seats
    section_ids = list(set([s["section_id"] for s in seats]))
    sections = await db.sections.find({"_id": {"$in": section_ids}}).to_list(length=len(section_ids))
    section_map = {str(s["_id"]): s["name"] for s in sections}
    
    seat_by_student = {}
    for seat in seats:
        seat_by_student[str(seat["student_id"])] = {
            "seat_id": str(seat["_id"]),
            "seat_number": seat["seat_number"],
            "section_id": str(seat["section_id"]),
            "section_name": section_map.get(str(seat["section_id"]), "Unknown")
        }

    results = []
    for s in students:
        s_data = serialize_doc(s)
        s_data["assigned_seat"] = seat_by_student.get(str(s["_id"]))
        results.append(s_data)

    return {"total": total, "items": results}

async def get_student_by_id(db: AsyncIOMotorDatabase, student_id: str):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid student ID format")
    
    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    seat = await db.seats.find_one({"student_id": ObjectId(student_id)})
    res = serialize_doc(student)
    if seat:
        section = await db.sections.find_one({"_id": seat["section_id"]})
        res["assigned_seat"] = {
            "seat_id": str(seat["_id"]),
            "seat_number": seat["seat_number"],
            "section_id": str(seat["section_id"]),
            "section_name": section["name"] if section else "Unknown"
        }
    return res

async def create_student(
    db: AsyncIOMotorDatabase,
    data: StudentCreate,
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    # Check duplicate roll_number
    existing = await db.students.find_one({"roll_number": data.roll_number.strip()})
    if existing:
        raise HTTPException(status_code=400, detail=f"Student with roll number '{data.roll_number}' already exists")
    
    now = datetime.now(timezone.utc)
    student_doc = {
        "roll_number": data.roll_number.strip(),
        "student_id": data.student_id.strip() if data.student_id else data.roll_number.strip(),
        "name": data.name.strip(),
        "department": data.department.strip(),
        "course": data.course.strip(),
        "year": data.year,
        "semester": data.semester,
        "email": data.email.strip() if data.email else None,
        "phone": data.phone.strip() if data.phone else None,
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.students.insert_one(student_doc)
    student_doc["_id"] = result.inserted_id
    
    await create_audit_log(
        db=db,
        action="student_created",
        target_type="student",
        admin_id=admin_id,
        admin_name=admin_name,
        target_id=str(result.inserted_id),
        details=f"Created student {data.name} (Roll: {data.roll_number})",
        new_value={"name": data.name, "roll_number": data.roll_number},
        ip_address=ip_address
    )
    
    return serialize_doc(student_doc)

async def update_student(
    db: AsyncIOMotorDatabase,
    student_id: str,
    data: StudentUpdate,
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid student ID format")
    
    current = await db.students.find_one({"_id": ObjectId(student_id)})
    if not current:
        raise HTTPException(status_code=404, detail="Student not found")

    update_fields = {}
    for field, val in data.model_dump(exclude_unset=True).items():
        if val is not None:
            if isinstance(val, str):
                update_fields[field] = val.strip()
            else:
                update_fields[field] = val

    if "roll_number" in update_fields and update_fields["roll_number"] != current["roll_number"]:
        dup = await db.students.find_one({"roll_number": update_fields["roll_number"], "_id": {"$ne": ObjectId(student_id)}})
        if dup:
            raise HTTPException(status_code=400, detail=f"Roll number '{update_fields['roll_number']}' is already in use")

    if not update_fields:
        return serialize_doc(current)

    update_fields["updated_at"] = datetime.now(timezone.utc)
    await db.students.update_one({"_id": ObjectId(student_id)}, {"$set": update_fields})
    
    updated = await db.students.find_one({"_id": ObjectId(student_id)})
    
    await create_audit_log(
        db=db,
        action="student_updated",
        target_type="student",
        admin_id=admin_id,
        admin_name=admin_name,
        target_id=student_id,
        details=f"Updated student {updated['name']} (Roll: {updated['roll_number']})",
        previous_value={k: current.get(k) for k in update_fields if k in current},
        new_value=update_fields,
        ip_address=ip_address
    )
    
    return serialize_doc(updated)

async def delete_student(
    db: AsyncIOMotorDatabase,
    student_id: str,
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid student ID format")

    student = await db.students.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Important Business Rule 4: Safely handle existing seat assignment
    assigned_seat = await db.seats.find_one({"student_id": ObjectId(student_id)})
    if assigned_seat:
        await db.seats.update_one(
            {"_id": assigned_seat["_id"]},
            {"$set": {"student_id": None, "status": "empty"}}
        )
        await create_audit_log(
            db=db,
            action="seat_released_on_student_deletion",
            target_type="seat",
            admin_id=admin_id,
            admin_name=admin_name,
            target_id=str(assigned_seat["_id"]),
            details=f"Seat {assigned_seat['seat_number']} released due to student {student['name']} deletion",
            ip_address=ip_address
        )

    # Delete student record
    await db.students.delete_one({"_id": ObjectId(student_id)})

    # Also clean up attendance records for this student
    await db.attendance_records.delete_many({"student_id": ObjectId(student_id)})

    await create_audit_log(
        db=db,
        action="student_deleted",
        target_type="student",
        admin_id=admin_id,
        admin_name=admin_name,
        target_id=student_id,
        details=f"Deleted student {student['name']} (Roll: {student['roll_number']})",
        previous_value={"name": student["name"], "roll_number": student["roll_number"]},
        ip_address=ip_address
    )

    return {"message": f"Student {student['name']} successfully deleted and seat released."}

async def import_students(
    db: AsyncIOMotorDatabase,
    rows: List[Dict[str, Any]],
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    now = datetime.now(timezone.utc)
    total_rows = len(rows)
    successful = 0
    duplicates = 0
    invalid_rows = []
    
    # Cache existing roll numbers to minimize database calls during import
    existing_rolls = set(await db.students.distinct("roll_number"))
    batch_to_insert = []
    seen_in_batch = set()

    for idx, row in enumerate(rows, start=1):
        name = str(row.get("name") or row.get("Name") or "").strip()
        roll_number = str(row.get("roll_number") or row.get("Roll Number") or row.get("Roll No") or row.get("roll_no") or "").strip()
        department = str(row.get("department") or row.get("Department") or "General").strip()
        course = str(row.get("course") or row.get("Course") or "General").strip()
        
        # Validate required fields
        if not name or not roll_number:
            invalid_rows.append({"row": idx, "reason": "Name and Roll Number are required", "data": row})
            continue

        if roll_number in existing_rolls or roll_number in seen_in_batch:
            duplicates += 1
            invalid_rows.append({"row": idx, "reason": f"Duplicate Roll Number '{roll_number}'", "data": row})
            continue

        try:
            year = int(row.get("year") or row.get("Year") or 1)
            semester = int(row.get("semester") or row.get("Semester") or 1)
        except (ValueError, TypeError):
            year, semester = 1, 1

        email = str(row.get("email") or row.get("Email") or "").strip() or None
        phone = str(row.get("phone") or row.get("Phone") or "").strip() or None
        student_id = str(row.get("student_id") or row.get("Student ID") or roll_number).strip()

        doc = {
            "roll_number": roll_number,
            "student_id": student_id,
            "name": name,
            "department": department,
            "course": course,
            "year": year,
            "semester": semester,
            "email": email,
            "phone": phone,
            "created_at": now,
            "updated_at": now
        }
        batch_to_insert.append(doc)
        seen_in_batch.add(roll_number)
        successful += 1

    if batch_to_insert:
        await db.students.insert_many(batch_to_insert)

    await create_audit_log(
        db=db,
        action="student_imported",
        target_type="student",
        admin_id=admin_id,
        admin_name=admin_name,
        details=f"Imported {successful} students. Duplicates: {duplicates}, Invalid: {len(invalid_rows)}",
        new_value={"total": total_rows, "successful": successful, "duplicates": duplicates, "invalid": len(invalid_rows)},
        ip_address=ip_address
    )

    return {
        "total_rows": total_rows,
        "successfully_imported": successful,
        "duplicates": duplicates,
        "invalid_rows_count": len(invalid_rows),
        "invalid_rows": invalid_rows[:50] # Top 50 errors
    }
