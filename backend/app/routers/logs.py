from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List, Dict, Any
from app.database import get_database
from app.utils.auth import get_current_admin
from app.utils.helpers import serialize_doc

router = APIRouter(prefix="/api/admin/logs", tags=["Audit Logs"])

@router.get("")
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    search: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query: Dict[str, Any] = {}
    if action:
        query["action"] = action
    if target_type:
        query["target_type"] = target_type
    if search:
        query["$or"] = [
            {"details": {"$regex": search, "$options": "i"}},
            {"admin_name": {"$regex": search, "$options": "i"}},
            {"target_id": {"$regex": search, "$options": "i"}}
        ]

    total = await db.audit_logs.count_documents(query)
    cursor = db.audit_logs.find(query).sort("created_at", -1).skip(skip).limit(limit)
    logs = await cursor.to_list(length=limit)

    return {
        "total": total,
        "items": [serialize_doc(l) for l in logs]
    }

@router.get("/actions")
async def get_distinct_log_actions(
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    actions = await db.audit_logs.distinct("action")
    target_types = await db.audit_logs.distinct("target_type")
    return {
        "actions": sorted([a for a in actions if a]),
        "target_types": sorted([t for t in target_types if t])
    }
