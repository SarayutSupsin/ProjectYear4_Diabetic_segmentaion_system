from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UserLogin(BaseModel):
    username: str = Field(..., description="ชื่อผู้ใช้")
    password: str = Field(..., description="รหัสผ่าน")

class UserResponse(BaseModel):
    user_id: str
    username: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None
    refresh_token: Optional[str] = None
    user: Optional[UserResponse] = None

class CurrentUserProfileResponse(BaseModel):
    success: bool
    user_id: str
    username: str
    role: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None
    HN: Optional[str] = None