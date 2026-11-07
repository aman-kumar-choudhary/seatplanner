import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import connect_to_mongo, close_mongo_connection, get_database

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    await connect_to_mongo()
    yield
    await close_mongo_connection()

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_public_seating_privacy():
    """
    CRITICAL PRIVACY TEST:
    Verify that public seating endpoint does NOT expose student IDs,
    student names, roll numbers, emails, or attendance!
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/public/seating")
        assert res.status_code == 200
        sections = res.json()
        assert len(sections) > 0

        for sec in sections:
            assert "name" in sec
            assert "seats" in sec
            for seat in sec["seats"]:
                assert "seat_number" in seat
                assert "status" in seat
                assert seat["status"] in ["empty", "assigned"]
                # Sensitive fields MUST NOT exist in public response
                assert "student_id" not in seat
                assert "student_name" not in seat
                assert "roll_number" not in seat
                assert "email" not in seat
                assert "phone" not in seat
                assert "attendance" not in seat

@pytest.mark.asyncio
async def test_public_student_search_privacy():
    """
    CRITICAL PRIVACY TEST:
    Verify that public search returns only minimum required info to locate the seat.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/public/students/search?q=rahul")
        assert res.status_code == 200
        results = res.json()
        assert len(results) > 0
        first = results[0]
        assert "studentName" in first
        assert "section" in first
        assert "seatNumber" in first
        assert "seatId" in first
        # No sensitive fields
        assert "email" not in first
        assert "phone" not in first
        assert "attendance" not in first

@pytest.mark.asyncio
async def test_admin_auth_and_protected_routes():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Invalid login
        bad_login = await ac.post("/api/auth/login", json={"username": "admin", "password": "wrongpassword"})
        assert bad_login.status_code == 401

        # Valid login
        good_login = await ac.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
        assert good_login.status_code == 200
        data = good_login.json()
        assert "access_token" in data
        token = data["access_token"]

        # Access protected /api/auth/me without token -> 401/403
        no_auth = await ac.get("/api/auth/me")
        assert no_auth.status_code in [401, 403]

        # Access protected /api/auth/me with token -> 200
        auth_headers = {"Authorization": f"Bearer {token}"}
        me_res = await ac.get("/api/auth/me", headers=auth_headers)
        assert me_res.status_code == 200
        assert me_res.json()["username"] == "admin"

@pytest.mark.asyncio
async def test_business_rules_seat_assignment():
    """
    Test Important Business Rules:
    1. A seat can have at most one assigned student.
    2. A student cannot be assigned to two seats.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login = await ac.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get seats and students
        seats_res = await ac.get("/api/admin/seats", headers=headers)
        all_seats = seats_res.json()
        
        assigned_seats = [s for s in all_seats if s["status"] == "assigned"]
        empty_seats = [s for s in all_seats if s["status"] == "empty"]

        assert len(assigned_seats) > 0
        assert len(empty_seats) > 0

        target_empty = empty_seats[0]
        occupied_seat = assigned_seats[0]
        assigned_student_id = occupied_seat["student"]["id"]

        # Rule 2/3 test: Try to assign an already assigned student to an empty seat -> must fail (400)
        double_assign_res = await ac.post("/api/admin/seats/assign", json={
            "seat_id": target_empty["id"],
            "student_id": assigned_student_id
        }, headers=headers)
        assert double_assign_res.status_code == 400
        assert "already assigned" in double_assign_res.json()["detail"].lower()

        # Rule 1 test: Try to assign any student to an already occupied seat -> must fail (400)
        studs_res = await ac.get("/api/admin/students?assigned_status=unassigned", headers=headers)
        unassigned_studs = studs_res.json()["items"]
        if unassigned_studs:
            free_student = unassigned_studs[0]
            occupied_assign_res = await ac.post("/api/admin/seats/assign", json={
                "seat_id": occupied_seat["id"],
                "student_id": free_student["id"]
            }, headers=headers)
            assert occupied_assign_res.status_code == 400
            assert "occupied" in occupied_assign_res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_session_attendance_marking():
    """
    Test session-based attendance marking and percentage calculation.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login = await ac.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # List sessions
        sess_res = await ac.get("/api/admin/sessions", headers=headers)
        assert sess_res.status_code == 200
        sessions = sess_res.json()
        assert len(sessions) > 0
        current_sess = sessions[0]

        # Get attendance list for session
        att_res = await ac.get(f"/api/admin/attendance?session_id={current_sess['id']}", headers=headers)
        assert att_res.status_code == 200
        records = att_res.json()
        assert len(records) > 0
        first_student = records[0]

        # Mark first student present
        mark_res = await ac.post("/api/admin/attendance/mark", json={
            "session_id": current_sess["id"],
            "student_id": first_student["student_id"],
            "status": "present"
        }, headers=headers)
        assert mark_res.status_code == 200
        assert mark_res.json()["status"] == "present"
