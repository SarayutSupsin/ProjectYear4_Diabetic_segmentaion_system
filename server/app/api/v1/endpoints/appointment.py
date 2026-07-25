from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models import Appointment, Patient, User
from app.schemas.appointment import AppointmentCreate, AppointmentResponse
from app.core.security import get_current_user

router = APIRouter()

@router.post("/", response_model=AppointmentResponse,
status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment_in: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.HN == appointment_in.HN).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบข้อมูลผู้ป่วยรหัส HN {appointment_in.HN}"
        )
    appointment = Appointment(
        HN=appointment_in.HN,
        nurse_user_id=current_user.user_id, # Retrieve the user ID of the recording nurse from the auto-login token.
        appointment_date=appointment_in.appointment_date,
        appointment_time=appointment_in.appointment_time,
        note=appointment_in.note
    )

    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment

@router.get("/", response_model=List[AppointmentResponse])
def get_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appointments = db.query(Appointment).all()
    return appointments