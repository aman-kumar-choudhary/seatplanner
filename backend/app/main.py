import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, get_database
from app.middleware.rate_limit import limiter
from app.utils.auth import hash_password
from app.routers import (
    auth,
    public,
    students,
    sections,
    seats,
    attendance,
    reports,
    logs,
    dashboard
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("seatplanner")

async def seed_default_admin(db):
    admin = await db.admins.find_one({"username": settings.ADMIN_USERNAME})
    if not admin:
        logger.info("Default admin not found. Creating admin '%s'...", settings.ADMIN_USERNAME)
        pwd_hash = hash_password(settings.ADMIN_PASSWORD)
        await db.admins.insert_one({
            "username": settings.ADMIN_USERNAME,
            "password_hash": pwd_hash,
            "name": settings.ADMIN_NAME,
            "created_at": datetime.now(timezone.utc)
        })
        logger.info("Default admin created successfully.")
    else:
        logger.info("Default admin exists.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting SeatPlanner API service...")
    await connect_to_mongo()
    db = get_database()
    await seed_default_admin(db)
    yield
    # Shutdown
    logger.info("Shutting down SeatPlanner API service...")
    await close_mongo_connection()

app = FastAPI(
    title="Seat Management & Student Attendance Planner API",
    version="1.0.0",
    description="Backend API for visual seating arrangements, privacy-preserving search, and session attendance tracking.",
    lifespan=lifespan
)

# SlowAPI setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(public.router)
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(students.router)
app.include_router(sections.router)
app.include_router(seats.router)
app.include_router(attendance.router)
app.include_router(reports.router)
app.include_router(logs.router)

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "seatplanner-api",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
