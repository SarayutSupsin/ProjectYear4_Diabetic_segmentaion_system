from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List 

from app.db.session import get_db
from app.models import Patient, User, Wound, Appointment, BodyPart
from sqlalchemy.orm import joinedload
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse
from app.core.security import get_current_user, get_password_hash

router = APIRouter()

@router.post("/", response_model=PatientResponse,
status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_in: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Access Control: Only ADMIN is allowed to create patients
    if current_user.role_id != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ขออภัย เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์ลงทะเบียนผู้ป่วยใหม่"
        )

    # 2. Check if HN already exists in patient table or username in users table
    existing_patient = db.query(Patient).filter(Patient.HN == patient_in.HN).first()
    if existing_patient:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"หมายเลข HN {patient_in.HN} มีอยู่ในระบบแล้ว"
        )

    existing_user = db.query(User).filter(User.username == patient_in.HN).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"มีบัญชีผู้ใช้งานระบบที่ใช้ชื่อไอดี {patient_in.HN} อยู่ในระบบแล้ว"
        )

    # 3. Generate new incremental user_id starting with 'U'
    last_user = db.query(User).filter(User.user_id.startswith("U")).order_by(User.user_id.desc()).first()
    if last_user:
        try:
            num = int(last_user.user_id[1:])
            new_id = f"U{num + 1:03d}"
        except ValueError:
            new_id = "U001"
    else:
        new_id = "U001"

    # 4. Hash the password with bcrypt
    hashed_password = get_password_hash(patient_in.password)

    # 5. Save the User account credentials
    new_user = User(
        user_id=new_id,
        username=patient_in.HN,
        password=hashed_password,
        role_id="PATIENT"
    )
    db.add(new_user)
    db.commit()

    # 6. Save the Patient clinical record linked to the newly created User account
    patient = Patient(
        HN=patient_in.HN,
        first_name=patient_in.first_name,
        last_name=patient_in.last_name,
        birth_date=patient_in.birth_date,
        gender=patient_in.gender,
        phone=patient_in.phone,
        admit_date=patient_in.admit_date,
        user_id=new_id
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
    # 1. Access Control: Only ADMIN or NURSE is allowed to see the list of all patients
    if current_user.role_id not in ["ADMIN", "NURSE"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ขออภัย เฉพาะบุคลากรทางการแพทย์เท่านั้นที่มีสิทธิ์ดูรายชื่อผู้ป่วยทั้งหมด"
        )
    patients = db.query(Patient).all()
    return patients

@router.get("/{HN}", response_model=PatientResponse)
def get_patient_by_hn(
    HN: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 2. Medical Privacy: PATIENT role can only retrieve their own medical profile record
    if current_user.role_id == "PATIENT" and current_user.username != HN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ขออภัย คุณไม่มีสิทธิ์เข้าถึงประวัติของผู้ป่วยรายอื่น"
        )

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
    # 1. Access Control: Only ADMIN is allowed to update patient profile or password
    if current_user.role_id != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ขออภัย เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์แก้ไขข้อมูลผู้ป่วย"
        )

    patient = db.query(Patient).filter(Patient.HN == HN).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบข้อมูลผู้ป่วยรหัส HN {HN}"
        )

    update_data = patient_in.model_dump(exclude_unset=True)

    # 2. Update Password if provided
    new_password = update_data.pop("password", None)
    if new_password and patient.user_id:
        user = db.query(User).filter(User.user_id == patient.user_id).first()
        if user:
            user.password = get_password_hash(new_password)
            db.add(user)

    # 3. Update the rest of the patient details
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
    # 1. Access Control: Only ADMIN is allowed to delete patients
    if current_user.role_id != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ขออภัย เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์ลบข้อมูลผู้ป่วย"
        )

    patient = db.query(Patient).filter(Patient.HN == HN).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบข้อมูลผู้ป่วยรหัส HN {HN}"
        )

    # 2. Delete the linked User login account
    if patient.user_id:
        user = db.query(User).filter(User.user_id == patient.user_id).first()
        if user:
            db.delete(user)

    # 3. Delete the patient clinical record
    db.delete(patient)
    db.commit()
    return {"message": f"ลบข้อมูลผู้ป่วยรหัส HN {HN} และบัญชีผู้ใช้ระบบสำเร็จ"}

@router.get("/{HN}/detail")
def get_patient_full_detail(
    HN: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role_id not in ["NURSE"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ขออภัย เฉพาะพยาบาลเท่านั้นที่มีสิทธิ์เข้าถึงข้อมูลรายละเอียดนี้"
        )
        
    patient = db.query(Patient).filter(Patient.HN == HN).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบข้อมูลคนไข้รหัส HN {HN}"
        )
        
    wounds = (
        db.query(Wound)
        .options(
            joinedload(Wound.body_part),
            joinedload(Wound.records)
        )
        .filter(Wound.HN == HN)
        .all()
    )
    
    appointments = db.query(Appointment).filter(Appointment.HN == HN).all()
    body_parts = db.query(BodyPart).all()
    
    return {
        "patient": patient,
        "wounds": wounds,
        "appointments": appointments,
        "body_parts": body_parts
    }


