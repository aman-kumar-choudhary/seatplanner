from fastapi import APIRouter, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from app.database import get_database
from app.schemas.seat import SeatResponse, SeatAssignRequest, SeatReassignRequest, SeatSwapRequest, SeatReleaseRequest
from app.utils.auth import get_current_admin
from app.services import seat_service

router = APIRouter(prefix="/api/admin/seats", tags=["Seats"])

@router.get("", response_model=List[SeatResponse])
async def list_seats(
    section_id: Optional[str] = None,
    session_id: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await seat_service.get_seats(
        db=db,
        section_id=section_id,
        session_id=session_id
    )

@router.post("/assign")
async def assign_seat(
    data: SeatAssignRequest,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await seat_service.assign_seat(
        db=db,
        seat_id=data.seat_id,
        student_id=data.student_id,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )

@router.post("/reassign")
async def reassign_seat(
    data: SeatReassignRequest,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await seat_service.reassign_seat(
        db=db,
        student_id=data.student_id,
        target_seat_id=data.target_seat_id,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )

@router.post("/swap")
async def swap_seats(
    data: SeatSwapRequest,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await seat_service.swap_seats(
        db=db,
        seat_id_1=data.seat_id_1,
        seat_id_2=data.seat_id_2,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )

@router.post("/release")
async def release_seat(
    data: SeatReleaseRequest,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await seat_service.release_seat(
        db=db,
        seat_id=data.seat_id,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )
