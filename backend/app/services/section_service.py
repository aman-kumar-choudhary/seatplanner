from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status
from app.schemas.section import SectionCreate, SectionUpdate
from app.services.audit_service import create_audit_log
from app.utils.helpers import serialize_doc

def get_section_prefix(section_name: str) -> str:
    name_clean = section_name.strip()
    parts = name_clean.split()
    if len(parts) >= 2 and parts[0].lower() in ["section", "sec", "block"]:
        return parts[1].upper()
    return name_clean[:3].upper()

def generate_seat_matrix(
    section_id: ObjectId,
    section_name: str,
    rows: int,
    columns: int,
    orientation: str,
    start_number: int = 1
) -> List[Dict[str, Any]]:
    prefix = get_section_prefix(section_name)
    seats = []
    
    # We want to assign seat_number according to orientation
    # Horizontal: row by row (left to right, top to bottom)
    # Vertical: column by column (top to bottom, left to right)
    seat_num_map = {} # (r, c) -> seat_number
    
    current_num = start_number
    if orientation == "horizontal":
        for r in range(rows):
            for c in range(columns):
                seat_num_map[(r, c)] = f"{prefix}{current_num:02d}"
                current_num += 1
    else: # vertical
        for c in range(columns):
            for r in range(rows):
                seat_num_map[(r, c)] = f"{prefix}{current_num:02d}"
                current_num += 1

    now = datetime.now(timezone.utc)
    for r in range(rows):
        for c in range(columns):
            seat_number = seat_num_map[(r, c)]
            seats.append({
                "section_id": section_id,
                "seat_number": seat_number,
                "row": r,
                "column": c,
                "student_id": None,
                "status": "empty",
                "created_at": now
            })
    return seats

async def get_sections(db: AsyncIOMotorDatabase) -> List[Dict[str, Any]]:
    sections = await db.sections.find().sort("display_order", 1).to_list(length=100)
    res = []
    for s in sections:
        sec_id = s["_id"]
        total_seats = await db.seats.count_documents({"section_id": sec_id})
        assigned_seats = await db.seats.count_documents({"section_id": sec_id, "status": "assigned"})
        
        doc = serialize_doc(s)
        doc["total_seats"] = total_seats
        doc["assigned_seats"] = assigned_seats
        doc["available_seats"] = max(0, total_seats - assigned_seats)
        res.append(doc)
    return res

async def get_section_by_id(db: AsyncIOMotorDatabase, section_id: str) -> Dict[str, Any]:
    if not ObjectId.is_valid(section_id):
        raise HTTPException(status_code=400, detail="Invalid section ID format")
    
    sec = await db.sections.find_one({"_id": ObjectId(section_id)})
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")
        
    sec_id = sec["_id"]
    total_seats = await db.seats.count_documents({"section_id": sec_id})
    assigned_seats = await db.seats.count_documents({"section_id": sec_id, "status": "assigned"})
    
    doc = serialize_doc(sec)
    doc["total_seats"] = total_seats
    doc["assigned_seats"] = assigned_seats
    doc["available_seats"] = max(0, total_seats - assigned_seats)
    return doc

async def create_section(
    db: AsyncIOMotorDatabase,
    data: SectionCreate,
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    # Check duplicate name
    existing = await db.sections.find_one({"name": data.name.strip()})
    if existing:
        raise HTTPException(status_code=400, detail=f"Section '{data.name}' already exists")
    
    now = datetime.now(timezone.utc)
    section_doc = {
        "name": data.name.strip(),
        "rows": data.rows,
        "columns": data.columns,
        "orientation": data.orientation,
        "start_number": data.start_number,
        "display_order": data.display_order,
        "active": True,
        "created_at": now
    }
    
    sec_res = await db.sections.insert_one(section_doc)
    section_id = sec_res.inserted_id
    
    # Generate seats
    seats = generate_seat_matrix(
        section_id=section_id,
        section_name=data.name.strip(),
        rows=data.rows,
        columns=data.columns,
        orientation=data.orientation,
        start_number=data.start_number
    )
    if seats:
        await db.seats.insert_many(seats)

    await create_audit_log(
        db=db,
        action="section_created",
        target_type="section",
        admin_id=admin_id,
        admin_name=admin_name,
        target_id=str(section_id),
        details=f"Created {data.name} with {len(seats)} seats ({data.rows}x{data.columns}, {data.orientation})",
        new_value={"name": data.name, "rows": data.rows, "columns": data.columns, "orientation": data.orientation},
        ip_address=ip_address
    )

    return await get_section_by_id(db, str(section_id))

async def update_section(
    db: AsyncIOMotorDatabase,
    section_id: str,
    data: SectionUpdate,
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    if not ObjectId.is_valid(section_id):
        raise HTTPException(status_code=400, detail="Invalid section ID format")
        
    sec = await db.sections.find_one({"_id": ObjectId(section_id)})
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")

    update_fields = {}
    for k, v in data.model_dump(exclude_unset=True).items():
        if v is not None:
            update_fields[k] = v

    if not update_fields:
        return await get_section_by_id(db, section_id)

    # Check if dimensions changed
    new_rows = update_fields.get("rows", sec["rows"])
    new_cols = update_fields.get("columns", sec["columns"])
    new_orientation = update_fields.get("orientation", sec["orientation"])
    new_name = update_fields.get("name", sec["name"])

    dims_changed = (new_rows != sec["rows"] or new_cols != sec["columns"])
    orientation_changed = (new_orientation != sec["orientation"])
    name_changed = (new_name != sec["name"])

    # If dimensions changed and seats are assigned, check if assigned seats would be clipped
    if dims_changed:
        assigned_seats = await db.seats.find({"section_id": ObjectId(section_id), "status": "assigned"}).to_list(length=1000)
        clipped = [s for s in assigned_seats if s["row"] >= new_rows or s["column"] >= new_cols]
        if clipped:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reduce section dimensions: {len(clipped)} assigned seats are beyond the new rows/columns."
            )

    # Apply section doc update
    await db.sections.update_one({"_id": ObjectId(section_id)}, {"$set": update_fields})

    # If orientation changed or dimensions changed, renumber/regenerate empty seats cleanly
    if orientation_changed or dims_changed or name_changed:
        # Preserve existing assignments by row and col
        existing_seats = await db.seats.find({"section_id": ObjectId(section_id)}).to_list(length=2000)
        assignment_by_rc = {(s["row"], s["column"]): s["student_id"] for s in existing_seats if s.get("student_id")}

        # Delete old seats for this section
        await db.seats.delete_many({"section_id": ObjectId(section_id)})

        # Re-generate seat matrix with new config
        new_seats = generate_seat_matrix(
            section_id=ObjectId(section_id),
            section_name=new_name,
            rows=new_rows,
            columns=new_cols,
            orientation=new_orientation,
            start_number=sec.get("start_number", 1)
        )

        # Restore assignments where coordinates match
        for s in new_seats:
            assigned_stud = assignment_by_rc.get((s["row"], s["column"]))
            if assigned_stud:
                s["student_id"] = assigned_stud
                s["status"] = "assigned"

        if new_seats:
            await db.seats.insert_many(new_seats)

    await create_audit_log(
        db=db,
        action="section_updated",
        target_type="section",
        admin_id=admin_id,
        admin_name=admin_name,
        target_id=section_id,
        details=f"Updated section {new_name}",
        previous_value={k: sec.get(k) for k in update_fields},
        new_value=update_fields,
        ip_address=ip_address
    )

    return await get_section_by_id(db, section_id)

async def delete_section(
    db: AsyncIOMotorDatabase,
    section_id: str,
    admin_id: str,
    admin_name: str,
    ip_address: Optional[str] = None
):
    if not ObjectId.is_valid(section_id):
        raise HTTPException(status_code=400, detail="Invalid section ID format")
        
    sec = await db.sections.find_one({"_id": ObjectId(section_id)})
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")

    # Important Business Rule 5: Deleting a section must not silently delete assigned students
    # Assigned students' seats are released; student records remain intact
    assigned_count = await db.seats.count_documents({"section_id": ObjectId(section_id), "status": "assigned"})
    
    # Delete all seats belonging to this section
    await db.seats.delete_many({"section_id": ObjectId(section_id)})
    # Delete the section
    await db.sections.delete_one({"_id": ObjectId(section_id)})

    await create_audit_log(
        db=db,
        action="section_deleted",
        target_type="section",
        admin_id=admin_id,
        admin_name=admin_name,
        target_id=section_id,
        details=f"Deleted section {sec['name']}. {assigned_count} student assignments released (students preserved).",
        ip_address=ip_address
    )

    return {
        "message": f"Section '{sec['name']}' deleted successfully. Any {assigned_count} assigned students have been unassigned."
    }
