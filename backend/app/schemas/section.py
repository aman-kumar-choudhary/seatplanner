from pydantic import BaseModel, Field
from typing import Optional, Literal

class SectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    rows: int = Field(..., ge=1, le=50)
    columns: int = Field(..., ge=1, le=50)
    orientation: Literal["horizontal", "vertical"] = "horizontal"
    start_number: int = Field(1, ge=1)
    display_order: int = Field(0, ge=0)

class SectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    rows: Optional[int] = Field(None, ge=1, le=50)
    columns: Optional[int] = Field(None, ge=1, le=50)
    orientation: Optional[Literal["horizontal", "vertical"]] = None
    display_order: Optional[int] = Field(None, ge=0)
    active: Optional[bool] = None

class SectionResponse(BaseModel):
    id: str
    name: str
    rows: int
    columns: int
    orientation: str
    start_number: int
    display_order: int
    active: bool
    total_seats: int
    assigned_seats: int
    available_seats: int
    created_at: Optional[str] = None
