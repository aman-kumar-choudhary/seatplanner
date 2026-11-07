from fastapi import APIRouter, Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from app.database import get_database
from app.schemas.section import SectionCreate, SectionUpdate, SectionResponse
from app.utils.auth import get_current_admin
from app.services import section_service

router = APIRouter(prefix="/api/admin/sections", tags=["Sections"])

@router.get("", response_model=List[SectionResponse])
async def list_sections(
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await section_service.get_sections(db)

@router.post("", response_model=SectionResponse)
async def create_section(
    data: SectionCreate,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await section_service.create_section(
        db=db,
        data=data,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )

@router.get("/{id}", response_model=SectionResponse)
async def get_section(
    id: str,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await section_service.get_section_by_id(db, id)

@router.put("/{id}", response_model=SectionResponse)
async def update_section(
    id: str,
    data: SectionUpdate,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await section_service.update_section(
        db=db,
        section_id=id,
        data=data,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )

@router.delete("/{id}")
async def delete_section(
    id: str,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await section_service.delete_section(
        db=db,
        section_id=id,
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        ip_address=request.client.host if request.client else None
    )
