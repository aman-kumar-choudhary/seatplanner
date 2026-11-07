from fastapi import APIRouter, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from app.database import get_database
from app.schemas.attendance import (
    SessionCreate, SessionUpdate, SessionResponse,
    AttendanceMarkRequest, AttendanceBulkMarkRequest, AttendanceRecordResponse
)
from app.utils.auth import get_current_admin
from app.services import attendance_service

router = APIRouter(prefix="/api/admin", tags=["Attendance"])

# Session Management
@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    data: SessionCreate,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await attendance_service.create_session(
        db=db,
        data=data,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )

@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await attendance_service.get_sessions(db)

@router.get("/sessions/{id}", response_model=SessionResponse)
async def get_session(
    id: str,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await attendance_service.get_session_by_id(db, id)

@router.put("/sessions/{id}", response_model=SessionResponse)
async def update_session(
    id: str,
    data: SessionUpdate,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await attendance_service.update_session(
        db=db,
        session_id=id,
        data=data,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )

@router.delete("/sessions/{id}")
async def delete_session(
    id: str,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await attendance_service.delete_session(
        db=db,
        session_id=id,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )

# Attendance Records
@router.post("/attendance/mark")
async def mark_attendance(
    data: AttendanceMarkRequest,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await attendance_service.mark_attendance(
        db=db,
        data=data,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )

@router.post("/attendance/bulk-mark")
async def bulk_mark_attendance(
    data: AttendanceBulkMarkRequest,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await attendance_service.bulk_mark_attendance(
        db=db,
        data=data,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )

@router.get("/attendance", response_model=List[AttendanceRecordResponse])
async def list_attendance_records(
    session_id: str = Query(...),
    section_id: Optional[str] = None,
    department: Optional[str] = None,
    course: Optional[str] = None,
    status: Optional[str] = Query("all", description="all, present, absent, not_marked"),
    search: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await attendance_service.get_session_attendance_list(
        db=db,
        session_id=session_id,
        section_id=section_id,
        department=department,
        course=course,
        status_filter=status,
        search=search
    )
