from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.db.session import get_db
from app.models import Wound, Patient, User
from app.schemas.wound import WoundCreate, WoundResponse
from app.core.security import get_current_user

router = APIRouter()

@router.post("/", response_model=WoundResponse,
status_code=status.HTTP_201_CREATED)
def create_wound(
    wound_in: WoundCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    patient = db.query(Patient).filter(Patient.HN == wound_in.HN).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบข้อมูลผู้ป่วยรหัส HN {wound_in.HN}"
        )

    last_wound = db.query(Wound).order_by(Wound.wound_id.desc()).first()
    if last_wound and last_wound.wound_id.startswith("W"):
        try:
            num = int(last_wound.wound_id[1:])
            new_id = f"W{num + 1:03d}"
        except ValueError:
            new_id = "W001"
        