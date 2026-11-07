import asyncio
from datetime import datetime, timezone, date
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.utils.auth import hash_password
from app.services.section_service import generate_seat_matrix

async def seed_data():
    print(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    # 1. Admin
    admin = await db.admins.find_one({"username": settings.ADMIN_USERNAME})
    if not admin:
        pwd_hash = hash_password(settings.ADMIN_PASSWORD)
        admin_doc = {
            "username": settings.ADMIN_USERNAME,
            "password_hash": pwd_hash,
            "name": settings.ADMIN_NAME,
            "created_at": datetime.now(timezone.utc)
        }
        res = await db.admins.insert_one(admin_doc)
        admin_id = res.inserted_id
        print(f"Created default admin '{settings.ADMIN_USERNAME}' (password: {settings.ADMIN_PASSWORD})")
    else:
        admin_id = admin["_id"]
        print(f"Admin '{settings.ADMIN_USERNAME}' already exists.")

    # Check if data already seeded
    existing_sections = await db.sections.count_documents({})
    if existing_sections > 0:
        print("Data already exists in database. Skipping sample data creation.")
        client.close()
        return

    print("Seeding sample institutional data...")
    now = datetime.now(timezone.utc)

    # 2. Create Sections
    # Section A: 4 rows x 5 cols, horizontal
    sec_a_doc = {
        "name": "Section A",
        "rows": 4,
        "columns": 5,
        "orientation": "horizontal",
        "start_number": 1,
        "display_order": 1,
        "active": True,
        "created_at": now
    }
    res_a = await db.sections.insert_one(sec_a_doc)
    sec_a_id = res_a.inserted_id

    seats_a = generate_seat_matrix(
        section_id=sec_a_id,
        section_name="Section A",
        rows=4,
        columns=5,
        orientation="horizontal",
        start_number=1
    )
    await db.seats.insert_many(seats_a)

    # Section B: 4 rows x 4 cols, vertical
    sec_b_doc = {
        "name": "Section B",
        "rows": 4,
        "columns": 4,
        "orientation": "vertical",
        "start_number": 1,
        "display_order": 2,
        "active": True,
        "created_at": now
    }
    res_b = await db.sections.insert_one(sec_b_doc)
    sec_b_id = res_b.inserted_id

    seats_b = generate_seat_matrix(
        section_id=sec_b_id,
        section_name="Section B",
        rows=4,
        columns=4,
        orientation="vertical",
        start_number=1
    )
    await db.seats.insert_many(seats_b)
    print("Created Section A (Horizontal, 20 seats) and Section B (Vertical, 16 seats)")

    # 3. Create Sample Students
    sample_students = [
        {"roll_number": "101", "name": "Rahul Kumar", "department": "Computer Science", "course": "BCA", "year": 2, "semester": 3, "email": "rahul.k@university.edu"},
        {"roll_number": "102", "name": "Aman Sharma", "department": "Computer Science", "course": "BCA", "year": 2, "semester": 3, "email": "aman.s@university.edu"},
        {"roll_number": "103", "name": "Priya Singh", "department": "Information Tech", "course": "B.Tech IT", "year": 3, "semester": 5, "email": "priya.s@university.edu"},
        {"roll_number": "104", "name": "Rohan Verma", "department": "Computer Science", "course": "BCA", "year": 1, "semester": 1, "email": "rohan.v@university.edu"},
        {"roll_number": "105", "name": "Sneha Patel", "department": "Electronics", "course": "B.Tech ECE", "year": 2, "semester": 4, "email": "sneha.p@university.edu"},
        {"roll_number": "106", "name": "Vikram Malhotra", "department": "Computer Science", "course": "MCA", "year": 1, "semester": 2, "email": "vikram.m@university.edu"},
        {"roll_number": "107", "name": "Ananya Gupta", "department": "Information Tech", "course": "B.Tech IT", "year": 2, "semester": 3, "email": "ananya.g@university.edu"},
        {"roll_number": "108", "name": "Karthik Raja", "department": "Mechanical", "course": "B.Tech ME", "year": 3, "semester": 6, "email": "karthik.r@university.edu"},
        {"roll_number": "109", "name": "Meera Joshi", "department": "Computer Science", "course": "BCA", "year": 2, "semester": 3, "email": "meera.j@university.edu"},
        {"roll_number": "110", "name": "Deepak Choudhary", "department": "Civil", "course": "B.Tech CE", "year": 4, "semester": 7, "email": "deepak.c@university.edu"},
        {"roll_number": "111", "name": "Neha Reddy", "department": "Computer Science", "course": "B.Tech CS", "year": 2, "semester": 4, "email": "neha.r@university.edu"},
        {"roll_number": "112", "name": "Aditya Roy", "department": "Information Tech", "course": "BCA", "year": 1, "semester": 2, "email": "aditya.r@university.edu"},
        {"roll_number": "113", "name": "Tanvi Deshmukh", "department": "Computer Science", "course": "B.Tech CS", "year": 3, "semester": 5, "email": "tanvi.d@university.edu"},
        {"roll_number": "114", "name": "Arjun Nair", "department": "Electronics", "course": "B.Tech ECE", "year": 2, "semester": 3, "email": "arjun.n@university.edu"},
        {"roll_number": "115", "name": "Pooja Hegde", "department": "Computer Science", "course": "MCA", "year": 2, "semester": 4, "email": "pooja.h@university.edu"},
    ]

    student_docs = []
    for s in sample_students:
        s["student_id"] = f"STU{s['roll_number']}"
        s["created_at"] = now
        s["updated_at"] = now
        student_docs.append(s)

    insert_stud_res = await db.students.insert_many(student_docs)
    student_id_list = insert_stud_res.inserted_ids
    print(f"Created {len(student_id_list)} sample students.")

    # 4. Assign some students to seats in Section A & Section B
    # Assign first 8 students to Section A
    sec_a_seats = await db.seats.find({"section_id": sec_a_id}).sort("seat_number", 1).to_list(length=20)
    for idx in range(min(8, len(student_id_list))):
        s_id = student_id_list[idx]
        seat = sec_a_seats[idx]
        await db.seats.update_one(
            {"_id": seat["_id"]},
            {"$set": {"student_id": s_id, "status": "assigned"}}
        )

    # Assign next 4 students to Section B
    sec_b_seats = await db.seats.find({"section_id": sec_b_id}).sort("seat_number", 1).to_list(length=16)
    for idx in range(8, min(12, len(student_id_list))):
        s_id = student_id_list[idx]
        seat = sec_b_seats[idx - 8]
        await db.seats.update_one(
            {"_id": seat["_id"]},
            {"$set": {"student_id": s_id, "status": "assigned"}}
        )

    print("Assigned 12 students to seats (Section A: 8, Section B: 4).")

    # 5. Create an Attendance Session
    today_str = date.today().isoformat()
    session_doc = {
        "name": "AI & Web Architecture Workshop - Day 1",
        "date": today_str,
        "start_time": "10:00 AM",
        "end_time": "04:00 PM",
        "notes": "Main auditorium seating with automated verification",
        "status": "active",
        "created_by": admin_id,
        "created_at": now
    }
    sess_res = await db.attendance_sessions.insert_one(session_doc)
    sess_id = sess_res.inserted_id

    # Mark attendance for assigned students:
    # 8 present, 2 absent, 2 not marked
    for i in range(8):
        s_id = student_id_list[i]
        seat = await db.seats.find_one({"student_id": s_id})
        await db.attendance_records.insert_one({
            "session_id": sess_id,
            "student_id": s_id,
            "seat_id": seat["_id"] if seat else None,
            "status": "present",
            "marked_at": now,
            "marked_by": admin_id,
            "marked_by_name": settings.ADMIN_NAME
        })

    for i in range(8, 10):
        s_id = student_id_list[i]
        seat = await db.seats.find_one({"student_id": s_id})
        await db.attendance_records.insert_one({
            "session_id": sess_id,
            "student_id": s_id,
            "seat_id": seat["_id"] if seat else None,
            "status": "absent",
            "marked_at": now,
            "marked_by": admin_id,
            "marked_by_name": settings.ADMIN_NAME
        })

    print("Created sample attendance session with 8 Present, 2 Absent, 2 Not Marked.")

    # 6. Audit Logs
    audit_samples = [
        {"action": "section_created", "target_type": "section", "details": "Created Section A (Horizontal, 20 seats)"},
        {"action": "section_created", "target_type": "section", "details": "Created Section B (Vertical, 16 seats)"},
        {"action": "student_imported", "target_type": "student", "details": f"Imported {len(sample_students)} students"},
        {"action": "seat_assigned", "target_type": "seat", "details": "Assigned Rahul Kumar to Section A - A01"},
        {"action": "seat_assigned", "target_type": "seat", "details": "Assigned Aman Sharma to Section A - A02"},
        {"action": "attendance_session_created", "target_type": "attendance_session", "details": f"Created session '{session_doc['name']}'"},
        {"action": "student_marked_present", "target_type": "attendance_record", "details": "Marked Rahul Kumar as Present"},
        {"action": "student_marked_absent", "target_type": "attendance_record", "details": "Marked Meera Joshi as Absent"}
    ]
    for a in audit_samples:
        await db.audit_logs.insert_one({
            "admin_id": admin_id,
            "admin_name": settings.ADMIN_NAME,
            "action": a["action"],
            "target_type": a["target_type"],
            "details": a["details"],
            "created_at": now
        })

    print("Sample institutional data successfully seeded!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
