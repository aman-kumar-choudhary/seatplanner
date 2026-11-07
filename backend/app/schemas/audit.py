from pydantic import BaseModel
from typing import Optional, Any

class AuditLogResponse(BaseModel):
    id: str
    admin_id: Optional[str] = None
    admin_name: Optional[str] = None
    action: str
    target_type: str
    target_id: Optional[str] = None
    details: Optional[str] = None
    previous_value: Optional[Any] = None
    new_value: Optional[Any] = None
    ip_address: Optional[str] = None
    created_at: str
