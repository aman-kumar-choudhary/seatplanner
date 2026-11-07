from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_database
from app.utils.auth import get_current_admin
from app.utils.helpers import serialize_doc
from app.services.attendance_service import calculate_session_stats

router = APIRouter(prefix="/api/admin/dashboard", tags=["Dashboard"])

@router.get("")
async def get_dashboard_data(
    current_admin: dict = Depends(get_current_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    total_students = await db.students.count_documents({})
    total_seats = await db.seats.count_documents({})
    assigned_seats = await db.seats.count_documents({"status": "assigned"})
    available_seats = max(0, total_seats - assigned_seats)
    total_sections = await db.sections.count_documents({"active": True})

    occupancy_rate = round((assigned_seats / total_seats * 100.0), 1) if total_seats > 0 else 0.0

    # Most recent active session
    active_session_doc = await db.attendance_sessions.find_one(
        {"status": "active"},
        sort=[("date", -1), ("created_at", -1)]
    )
    if not active_session_doc:
        # Fall back to latest session of any status
        active_session_doc = await db.attendance_sessions.find_one(
            {},
            sort=[("date", -1), ("created_at", -1)]
        )

    active_session_data = None
    if active_session_doc:
        stats = await calculate_session_stats(db, active_session_doc["_id"])
        active_session_data = serialize_doc(active_session_doc)
        active_session_data.update(stats)

    # Recent activities
    recent_logs = await db.audit_logs.find().sort("created_at", -1).limit(8).to_list(length=8)

    return {
        "overview": {
            "total_students": total_students,
            "total_seats": total_seats,
            "assigned_seats": assigned_seats,
            "available_seats": available_seats,
            "occupancy_rate": occupancy_rate,
            "total_sections": total_sections
        },
        "current_session": active_session_data,
        "recent_activities": [serialize_doc(l) for l in recent_logs]
    }
