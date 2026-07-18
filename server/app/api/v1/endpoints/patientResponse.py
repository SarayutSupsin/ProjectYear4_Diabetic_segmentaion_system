from genericpath import exists
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List 

from app.db.session import get_db
from app.models import Patient
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse
from app.core.security import get_current_user
from app.models import User

router = APIRouter()

@router.post("/", response_model=PatientResponse,
status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_in: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_patient = db.query(Patient).filter(Patient.HN == patient_in.HN).first()
    if existing_patient:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"หมายเลข HN {patient_in.HN} มีอยู่ในระบบแล้ว"
        )
    
    patient = Patient(
        HN=patient_in.HN,
        first_name=patient_in.first_name,
        last_name=patient_in.last_name,
        birth_date=patient_in.birth_date,
        gender=patient_in.gender,
        phone=patient_in.phone,
        admit_date=patient_in.admit_date,
        user_id=patient_in.user_id
    )

    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient

@router.get("/", response_model=List[PatientResponse])
def get_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patients = db.query(Patient).all()
    return patients

@router.get("/{HN}", response_model=PatientResponse)
def get_patient_by_hn(
    HN: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.HN == HN).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบข้อมูลผู้ป่วยรหัส HN {HN}"
        )
    return patient

@router.put("/{HN}", response_model=PatientResponse)
def update_patient(
    HN: str,
    patient_in: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.HN == HN).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบข้อมูลผู้ป่วยรหัส HN {HN}"
        )
    update_data = patient_in.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        setattr(patient, field_name, value)

    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient

@router.delete("/{HN}", status_code=status.HTTP_200_OK)
def delete_patient(
    HN: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.HN == HN).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบข้อมูลผู้ป่วยรหัส HN {HN}"
        )
    db.delete(patient)
    db.commit()
    return {"message": f"ลบข้อมูลผู้ป่วยรหัส HN {HN} สำเร็จ"}


