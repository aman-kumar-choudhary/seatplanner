from pydantic import BaseModel, Field
from typing import Optional, Literal

class SeatStudentInfo(BaseModel):
    id: str
    name: str
    roll_number: str
    course: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    email: Optional[str] = None

class SeatResponse(BaseModel):
    id: str
    section_id: str
    section_name: Optional[str] = None
    seat_number: str
    row: int
    column: int
    status: Literal["empty", "assigned"]
    student: Optional[SeatStudentInfo] = None
    # Session attendance if a session is requested
    attendance_status: Optional[str] = None # "present", "absent", "not_marked"

class PublicSeatItem(BaseModel):
    id: str
    seat_number: str
    row: int
    column: int
    status: Literal["empty", "assigned"]

class PublicSectionItem(BaseModel):
    id: str
    name: str
    rows: int
    columns: int
    orientation: str
    display_order: int
    seats: list[PublicSeatItem]

class SeatAssignRequest(BaseModel):
    seat_id: str
    student_id: str

class SeatReassignRequest(BaseModel):
    student_id: str
    target_seat_id: str

class SeatSwapRequest(BaseModel):
    seat_id_1: str
    seat_id_2: str

class SeatReleaseRequest(BaseModel):
    seat_id: str
