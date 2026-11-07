from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status
from app.schemas.attendance import SessionCreate, SessionUpdate, AttendanceMarkRequest, AttendanceBulkMarkRequest
from app.services.audit_service import create_audit_log
from app.utils.helpers import serialize_doc

async def calculate_session_stats(db: AsyncIOMotorDatabase, session_id: ObjectId) -> Dict[str, Any]:
    # Total assigned students currently in seats
    total_assigned = await db.seats.count_documents({"status": "assigned"})
    
    present_count = await db.attendance_records.count_documents({
        "session_id": session_id,
        "status": "present"
    })
    absent_count = await db.attendance_records.count_documents({
        "session_id": session_id,
        "status": "absent"
    })
    
    # Not marked = total assigned students - (present + absent)
    not_marked_count = max(0, total_assigned - (present_count + absent_count))
    
    marked_total = present_count + absent_count
    pct = round((present_count / total_assigned * 100.0), 1) if total_assigned > 0 else 0.0

    return {
        "total_assigned_students": total_assigned,
        "present_count": present_count,
        "absent_count": absent_count,
        "not_marked_count": not_marked_count,
        "attendance_percentage": pct
    }

async def get_sessions(db: AsyncIOMotorDatabase) -> List[Dict[str, Any]]:
    sessions = await db.attendance_sessions.find().sort("date", -1).to_list(length=200)
    results = []
    for s in sessions:
        stats = await calculate_session_stats(db, s["_id"])
        doc = serialize_doc(s)
        doc.update(stats)
        results.append(doc)
    return results

async def get_session_by_id(db: AsyncIOMotorDatabase, session_id: str) -> Dict[str, Any]:
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    sess = await db.attendance_sessions.find_one({"_id": ObjectId(session_id)})
    if not sess:
        raise HTTPException(status_code=404, detail="Attendance session not found")

    stats = await calculate_session_stats(db, sess["_id"])
    doc = serialize_doc(sess)
    doc.update(stats)
    return doc

async def create_session(
    db: AsyncIOMotorDatabase,
    data: SessionCreate,
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    now = datetime.now(timezone.utc)
    session_doc = {
        "name": data.name.strip(),
        "date": data.date.strip(),
        "start_time": data.start_time.strip() if data.start_time else None,
        "end_time": data.end_time.strip() if data.end_time else None,
        "notes": data.notes.strip() if data.notes else None,
        "status": "active",
        "created_by": ObjectId(admin_id) if ObjectId.is_valid(admin_id) else admin_id,
        "created_at": now
    }

    res = await db.attendance_sessions.insert_one(session_doc)
    sess_id = str(res.inserted_id)

    await create_audit_log(
        db=db,
        action="attendance_session_created",
        target_type="attendance_session",
        admin_id=admin_id,
        admin_name=admin_name,
        target_id=sess_id,
        details=f"Created attendance session '{data.name}' for {data.date}",
        new_value={"name": data.name, "date": data.date},
        ip_address=ip_address
    )

    return await get_session_by_id(db, sess_id)

async def update_session(
    db: AsyncIOMotorDatabase,
    session_id: str,
    data: SessionUpdate,
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    sess = await db.attendance_sessions.find_one({"_id": ObjectId(session_id)})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    update_fields = {}
    for k, v in data.model_dump(exclude_unset=True).items():
        if v is not None:
            update_fields[k] = v.strip() if isinstance(v, str) else v

    if update_fields:
        await db.attendance_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": update_fields}
        )

    await create_audit_log(
        db=db,
        action="attendance_session_updated",
        target_type="attendance_session",
        admin_id=admin_id,
        admin_name=admin_name,
        target_id=session_id,
        details=f"Updated session '{sess['name']}'",
        previous_value={k: sess.get(k) for k in update_fields},
        new_value=update_fields,
        ip_address=ip_address
    )

    return await get_session_by_id(db, session_id)

async def delete_session(
    db: AsyncIOMotorDatabase,
    session_id: str,
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    sess = await db.attendance_sessions.find_one({"_id": ObjectId(session_id)})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.attendance_sessions.delete_one({"_id": ObjectId(session_id)})
    # Clean up attendance records for this session
    del_res = await db.attendance_records.delete_many({"session_id": ObjectId(session_id)})

    await create_audit_log(
        db=db,
        action="attendance_session_deleted",
        target_type="attendance_session",
        admin_id=admin_id,
        admin_name=admin_name,
        target_id=session_id,
        details=f"Deleted session '{sess['name']}' and {del_res.deleted_count} attendance records",
        ip_address=ip_address
    )

    return {"message": f"Session '{sess['name']}' deleted successfully."}

async def mark_attendance(
    db: AsyncIOMotorDatabase,
    data: AttendanceMarkRequest,
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    if not ObjectId.is_valid(data.session_id) or not ObjectId.is_valid(data.student_id):
        raise HTTPException(status_code=400, detail="Invalid session or student ID format")

    sess = await db.attendance_sessions.find_one({"_id": ObjectId(data.session_id)})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    student = await db.students.find_one({"_id": ObjectId(data.student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Find student's assigned seat
    seat = await db.seats.find_one({"student_id": ObjectId(data.student_id)})
    seat_id = seat["_id"] if seat else None

    now = datetime.now(timezone.utc)

    if data.status == "not_marked":
        # Delete existing record
        await db.attendance_records.delete_one({
            "session_id": ObjectId(data.session_id),
            "student_id": ObjectId(data.student_id)
        })
        log_action = "attendance_unmarked"
    else:
        # Upsert attendance record
        await db.attendance_records.update_one(
            {
                "session_id": ObjectId(data.session_id),
                "student_id": ObjectId(data.student_id)
            },
            {
                "$set": {
                    "session_id": ObjectId(data.session_id),
                    "student_id": ObjectId(data.student_id),
                    "seat_id": seat_id,
                    "status": data.status,
                    "marked_at": now,
                    "marked_by": ObjectId(admin_id) if ObjectId.is_valid(admin_id) else admin_id,
                    "marked_by_name": admin_name
                }
            },
            upsert=True
        )
        log_action = f"student_marked_{data.status}"

    await create_audit_log(
        db=db,
        action=log_action,
        target_type="attendance_record",
        admin_id=admin_id,
        admin_name=admin_name,
        target_id=f"{data.session_id}:{data.student_id}",
        details=f"Marked {student['name']} as {data.status} for session '{sess['name']}'",
        new_value={"status": data.status},
        ip_address=ip_address
    )

    return {"message": f"{student['name']} marked as {data.status}.", "status": data.status}

async def bulk_mark_attendance(
    db: AsyncIOMotorDatabase,
    data: AttendanceBulkMarkRequest,
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    if not ObjectId.is_valid(data.session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    sess = await db.attendance_sessions.find_one({"_id": ObjectId(data.session_id)})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    valid_student_ids = [ObjectId(sid) for sid in data.student_ids if ObjectId.is_valid(sid)]
    if not valid_student_ids:
        raise HTTPException(status_code=400, detail="No valid student IDs provided")

    # Map students' seats
    seats = await db.seats.find({"student_id": {"$in": valid_student_ids}}).to_list(length=len(valid_student_ids))
    seat_by_student = {str(s["student_id"]): s["_id"] for s in seats}

    now = datetime.now(timezone.utc)
    for sid in valid_student_ids:
        s_id_str = str(sid)
        await db.attendance_records.update_one(
            {
                "session_id": ObjectId(data.session_id),
                "student_id": sid
            },
            {
                "$set": {
                    "session_id": ObjectId(data.session_id),
                    "student_id": sid,
                    "seat_id": seat_by_student.get(s_id_str),
                    "status": data.status,
                    "marked_at": now,
                    "marked_by": ObjectId(admin_id) if ObjectId.is_valid(admin_id) else admin_id,
                    "marked_by_name": admin_name
                }
            },
            upsert=True
        )

    await create_audit_log(
        db=db,
        action=f"bulk_marked_{data.status}",
        target_type="attendance_session",
        admin_id=admin_id,
        admin_name=admin_name,
        target_id=data.session_id,
        details=f"Bulk marked {len(valid_student_ids)} students as {data.status} in '{sess['name']}'",
        new_value={"count": len(valid_student_ids), "status": data.status},
        ip_address=ip_address
    )

    return {"message": f"Successfully marked {len(valid_student_ids)} students as {data.status}."}

async def get_session_attendance_list(
    db: AsyncIOMotorDatabase,
    session_id: str,
    section_id: Optional[str] = None,
    department: Optional[str] = None,
    course: Optional[str] = None,
    status_filter: Optional[str] = None, # "present", "absent", "not_marked", "all"
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    # 1. Fetch assigned seats to know all eligible students and their seats
    seat_query: Dict[str, Any] = {"status": "assigned"}
    if section_id and ObjectId.is_valid(section_id):
        seat_query["section_id"] = ObjectId(section_id)

    seats = await db.seats.find(seat_query).to_list(length=5000)
    if not seats:
        return []

    # Map section names
    sec_ids = list(set([s["section_id"] for s in seats]))
    sections = await db.sections.find({"_id": {"$in": sec_ids}}).to_list(length=len(sec_ids))
    sec_map = {str(s["_id"]): s["name"] for s in sections}

    # Map student IDs to seat info
    student_seat_map = {}
    for s in seats:
        if s.get("student_id"):
            student_seat_map[str(s["student_id"])] = {
                "seat_id": str(s["_id"]),
                "seat_number": s["seat_number"],
                "section_name": sec_map.get(str(s["section_id"]), "Unknown")
            }

    # 2. Query students
    stud_query: Dict[str, Any] = {
        "_id": {"$in": [ObjectId(sid) for sid in student_seat_map.keys()]}
    }
    if department:
        stud_query["department"] = department
    if course:
        stud_query["course"] = course
    if search:
        s_regex = {"$regex": search, "$options": "i"}
        stud_query["$or"] = [
            {"name": s_regex},
            {"roll_number": s_regex}
        ]

    students = await db.students.find(stud_query).sort("roll_number", 1).to_list(length=5000)
    student_ids = [s["_id"] for s in students]

    # 3. Fetch attendance records for this session
    records = await db.attendance_records.find({
        "session_id": ObjectId(session_id),
        "student_id": {"$in": student_ids}
    }).to_list(length=len(student_ids))

    rec_map = {str(r["student_id"]): r for r in records}

    results = []
    for s in students:
        sid_str = str(s["_id"])
        record = rec_map.get(sid_str)
        curr_status = record["status"] if record else "not_marked"

        if status_filter and status_filter != "all" and curr_status != status_filter:
            continue

        seat_info = student_seat_map.get(sid_str, {})
        item = {
            "id": str(record["_id"]) if record else f"unmarked_{sid_str}",
            "session_id": session_id,
            "student_id": sid_str,
            "student_name": s["name"],
            "student_roll": s["roll_number"],
            "department": s.get("department"),
            "course": s.get("course"),
            "seat_id": seat_info.get("seat_id"),
            "seat_number": seat_info.get("seat_number"),
            "section_name": seat_info.get("section_name"),
            "status": curr_status,
            "marked_at": record["marked_at"].isoformat() if record and record.get("marked_at") else None,
            "marked_by_name": record.get("marked_by_name") if record else None
        }
        results.append(item)

    return results
