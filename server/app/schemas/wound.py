from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

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

class WoundRecordResponse(BaseModel):
    record_id: int
    wound_id: str
    user_id: str
    image_path: str
    area_pixel: int
    area_cm2: float
    record_date: datetime
    note: Optional[str] = None

    class Config:
        from_attributes = True

class WoundResponse(BaseModel):
    wound_id: str
    HN: str
    body_part_id: str
    side: str
    created_at: datetime
    
    body_part: Optional[BodyPartResponse] = None
    records: List[WoundRecordResponse] = []

    class Config:
        from_attributes = True

