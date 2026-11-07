from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class StudentBase(BaseModel):
    roll_number: str = Field(..., min_length=1, max_length=50)
    student_id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=100)
    department: str = Field(..., min_length=1, max_length=100)
    course: str = Field(..., min_length=1, max_length=100)
    year: int = Field(..., ge=1, le=8)
    semester: int = Field(..., ge=1, le=16)
    email: Optional[str] = None
    phone: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    roll_number: Optional[str] = Field(None, min_length=1, max_length=50)
    student_id: Optional[str] = None
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    department: Optional[str] = None
    course: Optional[str] = None
    year: Optional[int] = Field(None, ge=1, le=8)
    semester: Optional[int] = Field(None, ge=1, le=16)
    email: Optional[str] = None
    phone: Optional[str] = None

class StudentAssignedSeat(BaseModel):
    seat_id: str
    seat_number: str
    section_id: str
    section_name: str

class StudentResponse(BaseModel):
    id: str
    roll_number: str
    student_id: Optional[str] = None
    name: str
    department: str
    course: str
    year: int
    semester: int
    email: Optional[str] = None
    phone: Optional[str] = None
    assigned_seat: Optional[StudentAssignedSeat] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class StudentPublicSearch(BaseModel):
    name: str
    section_name: str
    seat_number: str
    disambiguation: Optional[str] = None
