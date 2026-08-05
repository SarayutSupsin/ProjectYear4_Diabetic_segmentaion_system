from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import UserLogin, LoginResponse, CurrentUserProfileResponse
from app.models import User, Nurse, Patient
from app.core.security import get_current_user

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

@router.get("/me", response_model=CurrentUserProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile_data = {
        "success": True,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "role": current_user.role.role_name if current_user.role else "unknown"
    }

    # Fetch corresponding profile details based on role
    if current_user.role_id == "NURSE":
        nurse = db.query(Nurse).filter(Nurse.user_id == current_user.user_id).first()
        if nurse:
            profile_data.update({
                "first_name": nurse.first_name,
                "last_name": nurse.last_name,
                "department": nurse.department
            })
    elif current_user.role_id == "PATIENT":
        patient = db.query(Patient).filter(Patient.user_id == current_user.user_id).first()
        if patient:
            profile_data.update({
                "first_name": patient.first_name,
                "last_name": patient.last_name,
                "HN": patient.HN
            })
    elif current_user.role_id == "ADMIN":
        profile_data.update({
            "first_name": "System",
            "last_name": "Administrator",   
            "department": "IT Department"
        })

    return profile_data

@router.get("/test")
def test():
    return {"message": "Auth router is working!"}
    



