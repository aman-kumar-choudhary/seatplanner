from datetime import datetime, timezone
from typing import Optional, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

async def create_audit_log(
    db: AsyncIOMotorDatabase,
    action: str,
    target_type: str,
    admin_id: Optional[str] = None,
    admin_name: Optional[str] = None,
    target_id: Optional[str] = None,
    details: Optional[str] = None,
    previous_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    ip_address: Optional[str] = None,
):
    try:
        log_entry = {
            "admin_id": ObjectId(admin_id) if admin_id and ObjectId.is_valid(admin_id) else admin_id,
            "admin_name": admin_name or "System",
            "action": action,
            "target_type": target_type,
            "target_id": str(target_id) if target_id else None,
            "details": details,
            "previous_value": previous_value,
            "new_value": new_value,
            "ip_address": ip_address,
            "created_at": datetime.now(timezone.utc),
        }
        await db.audit_logs.insert_one(log_entry)
    except Exception as e:
        # Never crash the main request if audit logging encounters an issue
        print(f"Failed to record audit log: {e}")
