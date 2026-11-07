import io
import csv
import openpyxl
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request, Response
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from app.database import get_database
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse
from app.utils.auth import get_current_admin
from app.services import student_service

router = APIRouter(prefix="/api/admin/students", tags=["Students"])

@router.get("", response_model=dict)
async def list_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    department: Optional[str] = None,
    course: Optional[str] = None,
    year: Optional[int] = None,
    assigned_status: Optional[str] = Query("all", description="all, assigned, unassigned"),
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await student_service.get_students(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        department=department,
        course=course,
        year=year,
        assigned_status=assigned_status
    )

@router.get("/meta/filters")
async def get_student_filters(
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    departments = await db.students.distinct("department")
    courses = await db.students.distinct("course")
    years = await db.students.distinct("year")
    return {
        "departments": sorted([d for d in departments if d]),
        "courses": sorted([c for c in courses if c]),
        "years": sorted([y for y in years if y])
    }

@router.post("", response_model=dict)
async def create_student(
    data: StudentCreate,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await student_service.create_student(
        db=db,
        data=data,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )

@router.get("/{id}", response_model=dict)
async def get_student(
    id: str,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await student_service.get_student_by_id(db, id)

@router.put("/{id}", response_model=dict)
async def update_student(
    id: str,
    data: StudentUpdate,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await student_service.update_student(
        db=db,
        student_id=id,
        data=data,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )

@router.delete("/{id}")
async def delete_student(
    id: str,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await student_service.delete_student(
        db=db,
        student_id=id,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )

@router.post("/import")
async def import_students_file(
    request: Request,
    file: UploadFile = File(...),
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    filename = file.filename or ""
    content = await file.read()
    rows = []

    if filename.endswith(".csv") or file.content_type in ["text/csv", "application/vnd.ms-excel"]:
        decoded = content.decode("utf-8-sig", errors="replace")
        csv_reader = csv.DictReader(io.StringIO(decoded))
        for row in csv_reader:
            rows.append({k.strip(): v.strip() for k, v in row.items() if k})
    elif filename.endswith((".xlsx", ".xls")):
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        sheet = wb.active
        headers = [str(cell.value).strip() if cell.value is not None else "" for cell in sheet[1]]
        for row in sheet.iter_rows(min_row=2, values_only=True):
            if any(row):
                row_dict = {}
                for h, val in zip(headers, row):
                    if h:
                        row_dict[h] = str(val).strip() if val is not None else ""
                rows.append(row_dict)
    else:
        raise HTTPException(status_code=400, detail="Only CSV and Excel (.xlsx) files are supported.")

    if not rows:
        raise HTTPException(status_code=400, detail="Uploaded file contains no data rows.")

    return await student_service.import_students(
        db=db,
        rows=rows,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )

@router.get("/export/file")
async def export_students_file(
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    students = await db.students.find().sort("roll_number", 1).to_list(length=10000)
    
    # Map seat assignments
    student_ids = [s["_id"] for s in students]
    seats = await db.seats.find({"student_id": {"$in": student_ids}}).to_list(length=len(students))
    sec_ids = list(set([s["section_id"] for s in seats]))
    sections = await db.sections.find({"_id": {"$in": sec_ids}}).to_list(length=len(sec_ids))
    sec_map = {str(sec["_id"]): sec["name"] for sec in sections}
    seat_by_student = {str(s["student_id"]): f"{sec_map.get(str(s['section_id']), '')} - {s['seat_number']}" for s in seats}

    headers = ["Roll Number", "Student ID", "Name", "Department", "Course", "Year", "Semester", "Assigned Seat", "Email", "Phone"]
    data_rows = []
    for s in students:
        sid_str = str(s["_id"])
        data_rows.append([
            s["roll_number"],
            s.get("student_id", s["roll_number"]),
            s["name"],
            s.get("department", ""),
            s.get("course", ""),
            s.get("year", 1),
            s.get("semester", 1),
            seat_by_student.get(sid_str, "Unassigned"),
            s.get("email", ""),
            s.get("phone", "")
        ])

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(data_rows)
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=students_export.csv"}
        )
    else: # xlsx
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Students"
        ws.append(headers)
        for r in data_rows:
            ws.append(r)
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=students_export.xlsx"}
        )
