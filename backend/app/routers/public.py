from fastapi import APIRouter, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from typing import List, Optional
from app.database import get_database
from app.schemas.seat import PublicSectionItem, PublicSeatItem
from app.middleware.rate_limit import limiter
from app.config import settings

router = APIRouter(prefix="/api/public", tags=["Public"])

@router.get("/seating", response_model=List[PublicSectionItem])
async def get_public_seating(db: AsyncIOMotorDatabase = Depends(get_database)):
    """
    Public visual seat-map access for everyone.
    Important Privacy Requirement:
    Exposes only section geometry and seat status ('empty' or 'assigned').
    Never exposes student IDs, student names, roll numbers, or attendance information!
    """
    sections = await db.sections.find({"active": True}).sort("display_order", 1).to_list(length=100)
    result = []

    for sec in sections:
        sec_id = sec["_id"]
        seats = await db.seats.find({"section_id": sec_id}).sort([("row", 1), ("column", 1)]).to_list(length=5000)
        
        seat_items = [
            PublicSeatItem(
                id=str(s["_id"]),
                seat_number=s["seat_number"],
                row=s["row"],
                column=s["column"],
                status="assigned" if s.get("student_id") is not None else "empty"
            )
            for s in seats
        ]

        result.append(
            PublicSectionItem(
                id=str(sec["_id"]),
                name=sec["name"],
                rows=sec["rows"],
                columns=sec["columns"],
                orientation=sec.get("orientation", "horizontal"),
                display_order=sec.get("display_order", 0),
                seats=seat_items
            )
        )

    return result

@router.get("/students/search")
@limiter.limit(settings.RATE_LIMIT_PUBLIC_SEARCH)
async def search_student_seat(
    request: Request,
    q: str = Query(..., min_length=2, max_length=50, description="Student name or roll number"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Public student seat finder.
    Search for a student's name to see their assigned seat.
    Privacy Requirement:
    Only returns minimum information necessary to locate the seat:
    studentName, sectionName, seatNumber, seatId.
    No emails, phone numbers, or attendance records.
    """
    query_str = q.strip()
    if len(query_str) < 2:
        raise HTTPException(status_code=400, detail="Search query must be at least 2 characters")

    # Search by name regex or exact roll number
    matching_students = await db.students.find({
        "$or": [
            {"name": {"$regex": query_str, "$options": "i"}},
            {"roll_number": {"$regex": f"^{query_str}$", "$options": "i"}}
        ]
    }).limit(10).to_list(length=10)

    if not matching_students:
        return []

    student_ids = [s["_id"] for s in matching_students]
    
    # Find seats assigned to these students
    assigned_seats = await db.seats.find({"student_id": {"$in": student_ids}}).to_list(length=len(student_ids))
    if not assigned_seats:
        return []

    # Map section names
    sec_ids = list(set([s["section_id"] for s in assigned_seats]))
    sections = await db.sections.find({"_id": {"$in": sec_ids}}).to_list(length=len(sec_ids))
    sec_map = {str(sec["_id"]): sec["name"] for sec in sections}

    seat_by_student = {str(s["student_id"]): s for s in assigned_seats}

    # Count name frequencies for disambiguation
    name_counts = {}
    for s in matching_students:
        name_counts[s["name"]] = name_counts.get(s["name"], 0) + 1

    results = []
    for s in matching_students:
        sid_str = str(s["_id"])
        if sid_str in seat_by_student:
            seat = seat_by_student[sid_str]
            sec_name = sec_map.get(str(seat["section_id"]), "Main Hall")
            
            # Privacy-preserving disambiguation: if same name occurs, show Course and masked roll number
            disambiguation = None
            if name_counts.get(s["name"], 0) > 1:
                roll_masked = f"...{s['roll_number'][-3:]}" if len(s['roll_number']) >= 3 else s['roll_number']
                disambiguation = f"{s.get('course', '')} ({roll_masked})"

            results.append({
                "studentName": s["name"],
                "section": sec_name,
                "seatNumber": seat["seat_number"],
                "seatId": str(seat["_id"]),
                "disambiguation": disambiguation
            })

    return results
