from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import User
from app.schemas.auth import UserLogin, LoginResponse, UserResponse
from app.core.security import verify_password, create_access_token
from datetime import timedelta
from app.core.config import settings


class AuthService:
    
    @staticmethod
    def login(db: Session, login_data: UserLogin) -> LoginResponse:
        user = db.query(User).filter(User.username == login_data.username).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
            )
        
        if not verify_password(login_data.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
            )
        
        access_token = create_access_token(
            data={"sub": user.user_id, "role": user.role.role_name}
        )
        
        refresh_token = create_access_token(
            data={"sub": user.user_id, "type": "refresh"},
            expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
        
        return LoginResponse(
            success=True,
            message="เข้าสู่ระบบสำเร็จ",
            token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(
                user_id=user.user_id,
                username=user.username,
                role=user.role.role_name,
                created_at=user.created_at
            )
        )