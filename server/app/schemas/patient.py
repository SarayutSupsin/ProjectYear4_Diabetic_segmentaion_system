from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class PatientBase(BaseModel):
    HN: str = Field(..., description="หมายเลขประจำตัวผู้ป่วย (HN)")
    first_name: str = Field(..., description="ชื่อจริง")
    last_name: str = Field(..., description="นามสกุล")
    birth_date: Optional[date] = Field(None, description="วันเกิด")
    gender: Optional[str] = Field(None, description="เพศ")
    phone: Optional[str] = Field(None, description="เบอร์โทรศัพท์")
    admit_date: Optional[date] = Field(None, description="วันที่เริ่มเข้ารับการรักษา")

class PatientCreate(PatientBase):
    user_id: Optional[str] = Field(None, description="รหัสบัญชีผู้ใช้ (ถ้ามี)")

class PatientUpdate(BaseModel):
    first_name: Optional[str] = Field(None, description="ชื่อจริง")
    last_name: Optional[str] = Field(None, description="นามสกุล")
    birth_date: Optional[date] = Field(None, description="วันเกิด")
    gender: Optional[str] = Field(None, description="เพศ")
    phone: Optional[str] = Field(None, description="เบอร์โทรศัพท์")
    admit_date: Optional[date] = Field(None, description="วันที่เริ่มเข้ารับการรักษา")

class PatientResponse(PatientBase):
    user_id: Optional[str] = None

    class Config:
        from_attributes = True