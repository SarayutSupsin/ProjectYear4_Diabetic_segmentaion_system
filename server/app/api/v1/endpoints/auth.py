from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import UserLogin, LoginResponse

import logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    try:
        return AuthService.login(db, login_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Login failed") 
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"เกิดข้อผิดพลาด: {str(e)}"
        )

@router.get("/test")
def test():
    return {"message": "Auth router is working!"}
    
    

