import io
import csv
import openpyxl
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from typing import Optional, List, Dict, Any
from app.database import get_database
from app.utils.auth import get_current_admin

router = APIRouter(prefix="/api/admin/reports", tags=["Reports"])

async def query_attendance_report(
    db: AsyncIOMotorDatabase,
    session_id: Optional[str] = None,
    section_id: Optional[str] = None,
    department: Optional[str] = None,
    course: Optional[str] = None,
    year: Optional[int] = None,
    status: Optional[str] = None,
    date: Optional[str] = None
) -> List[Dict[str, Any]]:
    # Find sessions matching filter
    sess_query = {}
    if session_id and ObjectId.is_valid(session_id):
        sess_query["_id"] = ObjectId(session_id)
    if date:
        sess_query["date"] = date

    sessions = await db.attendance_sessions.find(sess_query).sort("date", -1).to_list(length=100)
    if not sessions:
        return []

    sess_map = {str(s["_id"]): s for s in sessions}
    sess_ids = [s["_id"] for s in sessions]

    # Find seats
    seat_query = {"status": "assigned"}
    if section_id and ObjectId.is_valid(section_id):
        seat_query["section_id"] = ObjectId(section_id)
    seats = await db.seats.find(seat_query).to_list(length=5000)
    
    sec_ids = list(set([s["section_id"] for s in seats]))
    sections = await db.sections.find({"_id": {"$in": sec_ids}}).to_list(length=len(sec_ids))
    sec_map = {str(s["_id"]): s["name"] for s in sections}

    seat_by_student = {}
    for s in seats:
        if s.get("student_id"):
            seat_by_student[str(s["student_id"])] = {
                "seat_number": s["seat_number"],
                "section_name": sec_map.get(str(s["section_id"]), "Unknown")
            }

    # Find students
    stud_query = {"_id": {"$in": [ObjectId(sid) for sid in seat_by_student.keys()]}}
    if department:
        stud_query["department"] = department
    if course:
        stud_query["course"] = course
    if year:
        stud_query["year"] = year

    students = await db.students.find(stud_query).to_list(length=5000)
    student_map = {str(s["_id"]): s for s in students}

    # Attendance records
    records = await db.attendance_records.find({
        "session_id": {"$in": sess_ids},
        "student_id": {"$in": [s["_id"] for s in students]}
    }).to_list(length=20000)

    # Key: (session_id, student_id)
    record_map = {(str(r["session_id"]), str(r["student_id"])): r for r in records}

    report_data = []
    for s_id_str, s in sess_map.items():
        for stud_id_str, stud in student_map.items():
            seat_info = seat_by_student.get(stud_id_str, {})
            rec = record_map.get((s_id_str, stud_id_str))
            
            rec_status = rec["status"] if rec else "not_marked"
            if status and status != "all" and rec_status != status:
                continue

            report_data.append({
                "session_id": s_id_str,
                "session_name": s["name"],
                "session_date": s["date"],
                "student_id": stud_id_str,
                "student_name": stud["name"],
                "roll_number": stud["roll_number"],
                "department": stud.get("department", ""),
                "course": stud.get("course", ""),
                "year": stud.get("year", 1),
                "section_name": seat_info.get("section_name", "Unknown"),
                "seat_number": seat_info.get("seat_number", "None"),
                "status": rec_status,
                "marked_at": rec["marked_at"].strftime("%Y-%m-%d %H:%M:%S") if rec and rec.get("marked_at") else "-",
                "marked_by": rec.get("marked_by_name", "-") if rec else "-"
            })

    return report_data

@router.get("/attendance")
async def get_attendance_report(
    session_id: Optional[str] = None,
    section_id: Optional[str] = None,
    department: Optional[str] = None,
    course: Optional[str] = None,
    year: Optional[int] = None,
    status: Optional[str] = Query("all"),
    date: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await query_attendance_report(
        db=db,
        session_id=session_id,
        section_id=section_id,
        department=department,
        course=course,
        year=year,
        status=status,
        date=date
    )

@router.get("/attendance/export")
async def export_attendance_report(
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    session_id: Optional[str] = None,
    section_id: Optional[str] = None,
    department: Optional[str] = None,
    course: Optional[str] = None,
    year: Optional[int] = None,
    status: Optional[str] = Query("all"),
    date: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    data = await query_attendance_report(
        db=db,
        session_id=session_id,
        section_id=section_id,
        department=department,
        course=course,
        year=year,
        status=status,
        date=date
    )

    headers = [
        "Session Name", "Date", "Student Name", "Roll Number",
        "Department", "Course", "Year", "Section", "Seat Number",
        "Status", "Marked Time", "Marked By"
    ]

    rows = [
        [
            d["session_name"], d["session_date"], d["student_name"], d["roll_number"],
            d["department"], d["course"], d["year"], d["section_name"], d["seat_number"],
            d["status"].upper(), d["marked_at"], d["marked_by"]
        ]
        for d in data
    ]

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(rows)
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=attendance_report.csv"}
        )
    else: # xlsx
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Attendance Report"
        ws.append(headers)
        for r in rows:
            ws.append(r)
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=attendance_report.xlsx"}
        )
