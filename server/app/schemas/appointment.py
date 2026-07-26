from app.models import nurse
from pydantic import BaseModel, Field
from datetime import date, time, datetime
from typing import Optional

class AppointmentBase(BaseModel):
    HN: str = Field(..., description="รหัส HN ของคนไข้ที่นัดหมาย")
    appointment_date: date = Field(..., description="วันที่นัดหมาย (YYYY-MM-DD)")
    appointment_time: time = Field(..., description="เวลานัดหมาย (HH:MM:SS)")
    note: Optional[str] = Field(None, description="หมายเหตุการนัด")

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentResponse(AppointmentBase):
    appointment_id: int
    nurse_user_id: str
    created_at: datetime

    class Config:
        from_attributes = True