import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import pymongo
from app.config import settings

logger = logging.getLogger("seatplanner.database")

class Database:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None

db_instance = Database()

import asyncio

async def connect_to_mongo():
    logger.info("Connecting to MongoDB at %s...", settings.MONGODB_URL)
    loop = asyncio.get_running_loop()
    db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL, io_loop=loop)
    db_instance.db = db_instance.client[settings.DATABASE_NAME]
    
    # Initialize indexes
    await init_indexes(db_instance.db)
    logger.info("MongoDB connected and indexes verified.")

async def close_mongo_connection():
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()
        logger.info("MongoDB connection closed.")

def get_database() -> AsyncIOMotorDatabase:
    if db_instance.db is None:
        raise RuntimeError("Database is not initialized. Call connect_to_mongo first.")
    return db_instance.db

async def init_indexes(db: AsyncIOMotorDatabase):
    try:
        # Admins: unique username
        await db.admins.create_index("username", unique=True)

        # Students: unique roll_number, text index on name
        await db.students.create_index("roll_number", unique=True)
        await db.students.create_index([("name", pymongo.TEXT)])
        await db.students.create_index("student_id")

        # Sections: unique name
        await db.sections.create_index("name", unique=True)
        await db.sections.create_index("display_order")

        # Seats: unique section_id + seat_number
        await db.seats.create_index(
            [("section_id", pymongo.ASCENDING), ("seat_number", pymongo.ASCENDING)],
            unique=True
        )
        # Sparse unique on student_id so multiple empty seats (student_id: None) are allowed,
        # but no student can have multiple seats!
        await db.seats.create_index(
            "student_id",
            unique=True,
            sparse=True
        )

        # Attendance Sessions
        await db.attendance_sessions.create_index([("date", pymongo.DESCENDING)])
        await db.attendance_sessions.create_index("status")

        # Attendance Records: unique session_id + student_id
        await db.attendance_records.create_index(
            [("session_id", pymongo.ASCENDING), ("student_id", pymongo.ASCENDING)],
            unique=True
        )
        await db.attendance_records.create_index("status")

        # Audit Logs: sorted by created_at desc
        await db.audit_logs.create_index([("created_at", pymongo.DESCENDING)])
        await db.audit_logs.create_index("action")
        await db.audit_logs.create_index("target_type")

        logger.info("Indexes successfully initialized.")
    except Exception as e:
        logger.error("Error creating indexes: %s", e)
