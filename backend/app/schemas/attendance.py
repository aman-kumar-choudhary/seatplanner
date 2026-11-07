from pydantic import BaseModel, Field
from typing import Optional, Literal

class SessionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    date: str = Field(..., description="YYYY-MM-DD")
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    notes: Optional[str] = None

class SessionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: Optional[Literal["active", "closed"]] = None
    notes: Optional[str] = None

class SessionResponse(BaseModel):
    id: str
    name: str
    date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: str
    notes: Optional[str] = None
    total_assigned_students: int = 0
    present_count: int = 0
    absent_count: int = 0
    not_marked_count: int = 0
    attendance_percentage: float = 0.0
    created_at: Optional[str] = None

class AttendanceMarkRequest(BaseModel):
    session_id: str
    student_id: str
    status: Literal["present", "absent", "not_marked"]

class AttendanceBulkMarkRequest(BaseModel):
    session_id: str
    student_ids: list[str]
    status: Literal["present", "absent"]

class AttendanceRecordResponse(BaseModel):
    id: str
    session_id: str
    student_id: str
    student_name: str
    student_roll: str
    department: Optional[str] = None
    course: Optional[str] = None
    seat_id: Optional[str] = None
    seat_number: Optional[str] = None
    section_name: Optional[str] = None
    status: Literal["present", "absent", "not_marked"]
    marked_at: Optional[str] = None
    marked_by_name: Optional[str] = None
