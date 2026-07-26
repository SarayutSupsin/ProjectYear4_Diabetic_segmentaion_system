from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import User, Nurse
from app.schemas.nurse import (
    NurseCreate, 
    NurseUserResponse, 
    NurseProfileResponse, 
    UserResponse,
    NurseUpdate,
    NurseListResponse,
    NurseListItem
)
from app.core.security import get_current_user, get_password_hash

router = APIRouter()

# 1. API: List all registered nurses (Admin Dashboard)
@router.get("/", response_model=NurseListResponse)
def list_nurses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role_id != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ขออภัย เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์ดูรายชื่อพยาบาล"
        )

    users_query = db.query(User).filter(User.role_id == "NURSE").all()
    nurses_list = []
    
    for u in users_query:
        nurse_profile = db.query(Nurse).filter(Nurse.user_id == u.user_id).first()
        nurses_list.append(
            NurseListItem(
                user_id=u.user_id,
                username=u.username,
                role_id=u.role_id,
                created_at=u.created_at,
                first_name=nurse_profile.first_name if nurse_profile else None,
                last_name=nurse_profile.last_name if nurse_profile else None,
                department=nurse_profile.department if nurse_profile else None
            )
        )
        
    return {"success": True, "nurses": nurses_list}

# 2. API: Create a new Nurse (Admin only)
@router.post("/", response_model=NurseUserResponse, status_code=status.HTTP_201_CREATED)
def create_nurse(
    nurse_in: NurseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role_id != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ขออภัย เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์สร้างบัญชีพยาบาลใหม่"
        )

    existing_user = db.query(User).filter(User.username == nurse_in.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ชื่อผู้ใช้งาน {nurse_in.username} ถูกใช้งานไปแล้วในระบบ"
        )

    last_user = db.query(User).filter(User.user_id.startswith("U")).order_by(User.user_id.desc()).first()
    if last_user:
        try:
            num = int(last_user.user_id[1:])
            new_id = f"U{num + 1:03d}"
        except ValueError:
            new_id = "U001"
    else:
        new_id = "U001"

    hashed_password = get_password_hash(nurse_in.password)

    new_user = User(
        user_id=new_id,
        username=nurse_in.username,
        password=hashed_password,
        role_id="NURSE"
    )
    db.add(new_user)
    db.commit()

    new_nurse = Nurse(
        user_id=new_id,
        first_name=nurse_in.first_name,
        last_name=nurse_in.last_name,
        department=nurse_in.department
    )
    db.add(new_nurse)
    db.commit()
    db.refresh(new_user)
    db.refresh(new_nurse)

    return NurseUserResponse(
        success=True,
        message="สร้างบัญชีและข้อมูลโปรไฟล์พยาบาลสำเร็จ",
        user=UserResponse.model_validate(new_user),
        nurse_profile=NurseProfileResponse.model_validate(new_nurse)
    )

# 3. API: Update Nurse details (Admin only)
@router.put("/{user_id}", response_model=NurseUserResponse)
def update_nurse(
    user_id: str,
    nurse_in: NurseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role_id != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ขออภัย เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์แก้ไขข้อมูลพยาบาล"
        )

    target_user = db.query(User).filter(User.user_id == user_id, User.role_id == "NURSE").first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบบัญชีพยาบาลรหัส {user_id}"
        )

    nurse_profile = db.query(Nurse).filter(Nurse.user_id == user_id).first()
    if not nurse_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบข้อมูลโปรไฟล์พยาบาลรหัส {user_id}"
        )

    # Update password if provided
    if nurse_in.password:
        target_user.password = get_password_hash(nurse_in.password)
        db.add(target_user)

    # Update profile fields if provided
    if nurse_in.first_name is not None:
        nurse_profile.first_name = nurse_in.first_name
    if nurse_in.last_name is not None:
        nurse_profile.last_name = nurse_in.last_name
    if nurse_in.department is not None:
        nurse_profile.department = nurse_in.department

    db.add(nurse_profile)
    db.commit()
    db.refresh(target_user)
    db.refresh(nurse_profile)

    return NurseUserResponse(
        success=True,
        message="แก้ไขข้อมูลพยาบาลสำเร็จ",
        user=UserResponse.model_validate(target_user),
        nurse_profile=NurseProfileResponse.model_validate(nurse_profile)
    )

# 4. API: Delete Nurse (Admin only)
@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_nurse(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role_id != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ขออภัย เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่มีสิทธิ์ลบบัญชีพยาบาล"
        )

    target_user = db.query(User).filter(User.user_id == user_id, User.role_id == "NURSE").first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบบัญชีพยาบาลรหัส {user_id}"
        )

    nurse_profile = db.query(Nurse).filter(Nurse.user_id == user_id).first()
    
    if nurse_profile:
        db.delete(nurse_profile)
    
    db.delete(target_user)
    db.commit()

    return {"success": True, "message": f"ลบบัญชีพยาบาลรหัส {user_id} สำเร็จ"}
