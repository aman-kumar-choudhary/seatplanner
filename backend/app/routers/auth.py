from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.database import get_database
from app.schemas.auth import LoginRequest, LoginResponse, AdminProfile, ChangePasswordRequest, UpdateProfileRequest
from app.utils.auth import hash_password, verify_password, create_access_token, get_current_admin
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResponse)
async def login(
    req: LoginRequest,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    admin = await db.admins.find_one({"username": req.username.strip()})
    if not admin or not verify_password(req.password, admin["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    admin_id = str(admin["_id"])
    access_token = create_access_token(data={"sub": admin_id, "username": admin["username"]})

    # Log login activity
    await create_audit_log(
        db=db,
        action="admin_logged_in",
        target_type="admin",
        admin_id=admin_id,
        admin_name=admin.get("name", admin["username"]),
        target_id=admin_id,
        details=f"Admin '{admin['username']}' logged in successfully",
        ip_address=request.client.host if request.client else None
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        admin=AdminProfile(
            id=admin_id,
            username=admin["username"],
            name=admin.get("name", "Administrator"),
            created_at=admin.get("created_at").isoformat() if admin.get("created_at") else None
        )
    )

@router.post("/logout")
async def logout(
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    await create_audit_log(
        db=db,
        action="admin_logged_out",
        target_type="admin",
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        target_id=current_admin["id"],
        details=f"Admin '{current_admin['username']}' logged out",
        ip_address=request.client.host if request.client else None
    )
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=AdminProfile)
async def get_me(current_admin: dict = Depends(get_current_admin)):
    return AdminProfile(
        id=current_admin["id"],
        username=current_admin["username"],
        name=current_admin.get("name", "Administrator"),
        created_at=current_admin.get("created_at").isoformat() if current_admin.get("created_at") else None
    )

@router.put("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    admin = await db.admins.find_one({"_id": ObjectId(current_admin["id"])})
    if not admin or not verify_password(req.current_password, admin["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    new_hash = hash_password(req.new_password)
    await db.admins.update_one(
        {"_id": ObjectId(current_admin["id"])},
        {"$set": {"password_hash": new_hash}}
    )

    await create_audit_log(
        db=db,
        action="admin_password_changed",
        target_type="admin",
        admin_id=current_admin["id"],
        admin_name=current_admin.get("name", current_admin["username"]),
        target_id=current_admin["id"],
        details="Admin changed password",
        ip_address=request.client.host if request.client else None
    )

    return {"message": "Password changed successfully"}

@router.put("/profile", response_model=AdminProfile)
async def update_profile(
    req: UpdateProfileRequest,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    update_data = {}
    if req.name:
        update_data["name"] = req.name.strip()

    if update_data:
        await db.admins.update_one(
            {"_id": ObjectId(current_admin["id"])},
            {"$set": update_data}
        )

    updated = await db.admins.find_one({"_id": ObjectId(current_admin["id"])})
    return AdminProfile(
        id=str(updated["_id"]),
        username=updated["username"],
        name=updated.get("name", "Administrator"),
        created_at=updated.get("created_at").isoformat() if updated.get("created_at") else None
    )
