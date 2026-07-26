from app.models import body_part
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.db.session import get_db
from app.models import User, Patient, Wound, WoundRecord
from app.schemas.wound import WoundCreate, WoundResponse, WoundRecordResponse
from app.core.security import get_current_user
from app.core.config import settings

from app.services.wound_analysis.qr_detector import detect_qr
from app.services.wound_analysis.image_warper import warp_image_and_mask
from app.services.wound_analysis.wound_segmenter import segment_wound

import cv2
import numpy as np
import os 
from datetime import datetime
import time
from fastapi import File, UploadFile, Form

router = APIRouter()

@router.post("/", response_model=WoundResponse, status_code=status.HTTP_201_CREATED)
def create_wound(
    wound_in: WoundCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role_id not in ["NURSE", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ขออภัย เฉพาะบุคลากรทางการแพทย์ (พยาบาล/แอดมิน) เท่านั้นที่มีสิทธิ์เพิ่มเคสแผลใหม่"
        )

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
        
    else:
        new_id = "W001"
    
    wound = Wound(
        wound_id=new_id,
        HN=wound_in.HN,
        body_part_id=wound_in.body_part_id,
        side=wound_in.side
    )
    
    db.add(wound)
    db.commit()
    db.refresh(wound)
    return wound

@router.get("/patient/{HN}", response_model=List[WoundResponse])
def get_patient_wounds(
    HN: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role_id == "PATIENT" and current_user.username != HN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ขออภัย คุณไม่มีสิทธิ์ดึงประวัติแผลของผู้ป่วยรายอื่น"
        )
    wounds = db.query(Wound).options(joinedload(Wound.body_part)).filter(Wound.HN == HN).all()
    return wounds

@router.post("/{wound_id}/records", response_model=WoundRecordResponse, status_code=status.HTTP_201_CREATED)
async def upload_wound_image_and_evaluate(
    wound_id: str,
    file: UploadFile = File(...),
    note: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role_id not in ["NURSE", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ขออภัย เฉพาะบุคลากรทางการแพทย์ (พยาบาล/แอดมิน) เท่านั้นที่มีสิทธิ์อัปโหลดและวิเคราะห์แผล"
        )

    # 1. Verify whether the primary wound with this code actually exists in the system.
    wound = db.query(Wound).filter(Wound.wound_id == wound_id).first()
    if not wound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบข้อมูลแผลหลักรหัส {wound_id} ในระบบ"
        )

    # 2. Read the uploaded file and convert it into an OpenCV image (NumPy array) in RAM.
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ไฟล์รูปภาพที่ส่งเข้ามามีความเสียหายหรือไม่ถูกต้อง"
        )

    # 3. Start Analysis
    # Step 1: Detect QR code
    qr_data = detect_qr(img)
    if qr_data is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ไม่พบคิวอาร์โค้ดอ้างอิงบนสติกเกอร์ในรูปภาพ กรุณาถ่ายภาพใหม่ให้เห็นสติกเกอร์ที่ชัดเจน"
        )
    
    # Step 2: Predict location and generate wound boundary mask
    segment_data = segment_wound(img)
    if segment_data["pixel_area"] == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ระบบไม่พบขอบเขตของบาดแผลบนรูปภาพ กรุณาถ่ายภาพบาดแผลให้ชัดเจนยิ่งขึ้น"
        )
    
    # Step 3: Warp the image corners and the wound mask to a frontal plane (Homography Warp)
    try:
        warped_img, warped_mask, _ = warp_image_and_mask(
            img,
            segment_data["mask"],
            qr_data["polygon"]
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Step 4: Calculate the actual wound area in square centimeters.
    pixel_area_rectified = int(np.sum(warped_mask > 0))

    # Scale Factor
    qr_side_target_px = settings.QR_SIZE_CM * settings.TARGET_PX_PER_CM
    qr_area_target_px = qr_side_target_px ** 2
    qr_real_area_cm2 = settings.QR_SIZE_CM ** 2

    scale_factor = qr_real_area_cm2 / qr_area_target_px

    wound_area_cm2 = pixel_area_rectified * scale_factor

    # Step 5: Save the processed frontal-view image files to the folder for web viewing.
    patient_hn = wound.HN.replace("/", "-")
    timestamp = datetime.now().strftime("%Y%m%d")
    filename_base = f"{patient_hn}_{wound_id}_{timestamp}"

    original_filename = f"{filename_base}_original.jpg"
    mask_filename = f"{filename_base}_mask.png"
    combined_filename = f"{filename_base}_combined.jpg"
    warped_filename = f"{filename_base}_warped.jpg"

    original_dir = os.path.join(settings.STATIC_DIR, "original")
    mask_dir = os.path.join(settings.STATIC_DIR, "mask")
    combined_dir = os.path.join(settings.STATIC_DIR, "combined")
    warped_dir = os.path.join(settings.STATIC_DIR, "warped")

    os.makedirs(original_dir, exist_ok=True)
    os.makedirs(mask_dir, exist_ok=True)
    os.makedirs(combined_dir, exist_ok=True)
    os.makedirs(warped_dir, exist_ok=True)

    # original
    cv2.imwrite(os.path.join(original_dir, original_filename), img)
    # mask
    cv2.imwrite(os.path.join(mask_dir, mask_filename), segment_data["mask"])
    # combined
    combined_img = img.copy()
    contours, _ = cv2.findContours(segment_data["mask"], cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(combined_img, contours, -1, (0, 255, 0), 2)
    qr_pts = np.array(qr_data["polygon"], dtype=np.int32).reshape((-1, 1, 2))
    cv2.polylines(combined_img, [qr_pts], isClosed=True, color=(0, 0, 255), thickness=3)
    cv2.imwrite(os.path.join(combined_dir, combined_filename), combined_img)
    # warped
    cv2.imwrite(os.path.join(warped_dir, warped_filename), warped_img)

    # Step6: Record wound assessment results into the database system (WoundRecord).
    record = WoundRecord(
        wound_id=wound_id,
        user_id=current_user.user_id,
        image_path=f"static/wounds/combined/{combined_filename}",
        area_pixel=pixel_area_rectified,
        area_cm2=round(wound_area_cm2, 4),
        note=note      
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record

@router.get("/{wound_id}/records", response_model=List[WoundRecordResponse])
def get_wound_records(
    wound_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    wound = db.query(Wound).filter(Wound.wound_id == wound_id).first()
    if not wound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ไม่พบข้อมูลแผลหลักรหัสนี้ในระบบ"
        )

    if current_user.role_id == "PATIENT" and current_user.username != wound.HN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ขออภัย คุณไม่มีสิทธิ์เข้าถึงบันทึกการวัดแผลของคนไข้รายอื่น"
        )

    records = (
        db.query(WoundRecord)
        .filter(WoundRecord.wound_id == wound_id)
        .order_by(WoundRecord.record_date.asc())
        .all()
    )
    return records
    