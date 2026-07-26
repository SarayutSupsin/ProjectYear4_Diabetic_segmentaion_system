from fastapi import Depends, HTTPException, status
from typing import List
from app.core.security import get_current_user
from app.models import User

def check_user_role(required_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if not current_user.role or current_user.role.role_name not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ขออภัย! คุณไม่ได้รับอนุญาตให้เข้าถึงฟีเจอร์นี้"
            )
        return current_user
    return role_checker