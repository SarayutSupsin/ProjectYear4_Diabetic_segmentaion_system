from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

# 1. Input schema for Admin to create a new Nurse profile + account
class NurseCreate(BaseModel):
    username: str = Field(..., description="ชื่อบัญชีเข้าใช้งาน")
    password: str = Field(..., min_length=5, description="รหัสผ่านเข้าใช้งาน (ขั้นต่ำ 5 ตัวอักษร)")
    first_name: str = Field(..., description="ชื่อจริง")
    last_name: str = Field(..., description="นามสกุล")
    department: str = Field(..., description="แผนก")

# 2. Input schema for Admin to update an existing Nurse profile
class NurseUpdate(BaseModel):
    first_name: Optional[str] = Field(None, description="ชื่อจริง")
    last_name: Optional[str] = Field(None, description="นามสกุล")
    department: Optional[str] = Field(None, description="แผนก")
    password: Optional[str] = Field(None, min_length=5, description="รหัสผ่านเข้าใช้งานใหม่ (ถ้าต้องการเปลี่ยน)")

# 3. Output schema for Nurse Profile
class NurseProfileResponse(BaseModel):
    first_name: str
    last_name: str
    department: str

    class Config:
        from_attributes = True

# 4. Output schema for User Account credentials
class UserResponse(BaseModel):
    user_id: str
    username: str
    role_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# 5. Combined response for single Nurse account details
class NurseUserResponse(BaseModel):
    success: bool
    message: str
    user: UserResponse
    nurse_profile: NurseProfileResponse

# 6. Response for listing all Nurses (for Admin Dashboard)
class NurseListItem(BaseModel):
    user_id: str
    username: str
    role_id: str
    created_at: datetime
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None

class NurseListResponse(BaseModel):
    success: bool
    nurses: List[NurseListItem]
