from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class BodyPartResponse(BaseModel):
    body_part_id: str
    body_part_name: str

    class Config:
        from_attributes = True

class WoundBase(BaseModel):
    HN: str = Field(..., description="รหัส HN ของคนไข้")
    body_part_id: str = Field(..., description="รหัสตำแหน่งบนเท้า")
    side: str = Field(..., description="ข้างเท้า (ซ้าย/ขวา)")

class WoundCreate(WoundBase):
    pass

class WoundResponse(BaseModel):
    wound_id: str
    HN: str
    body_part_id: str
    side: str
    created_at: datetime
    
    body_part: Optional[BodyPartResponse] = None

    class Config:
        from_attributes = True
    
    