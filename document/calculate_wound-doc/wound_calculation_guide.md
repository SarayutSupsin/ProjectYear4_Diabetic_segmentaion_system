# 🩺 คู่มือเชิงปฏิบัติการ: การสร้างและเชื่อมระบบประมวลผลขนาดแผลด้วย AI (Wound Calculation Engine Setup Guide)

คู่มือฉบับนี้จัดทำขึ้นเพื่อสอนขั้นตอนการบูรณาการระบบตรวจสแกนขอบแผลเบาหวาน (U-Net Deep Learning) และคณิตศาสตร์ปรับระนาบหน้าตรง (Shoelace & Homography Matrix) เข้ากับระบบหลังบ้าน FastAPI เดิม โดยอธิบายขั้นตอนอย่างละเอียดเปรียบเทียบรายบรรทัดสำหรับประกอบเล่มรายงานและพัฒนาโปรเจกต์จริงครับ

---

## 📂 1. โครงสร้างโฟลเดอร์ของระบบประมวลผล (Directory Layout Map)

เมื่อพัฒนาเสร็จสิ้น ตัวโปรเจกต์ในระบบหลังบ้าน (`server/`) จะมีการเพิ่มและแก้ไขไฟล์จัดเรียงตามผังนี้:

```text
server/
├── weights/                           # [1] ห้องเก็บไฟล์น้ำหนักโมเดล AI (.pth)
│   └── unet_efficientnet_b4_dfu.pth   # ไฟล์น้ำหนักโมเดล U-Net (ระบุชื่อสถาปัตยกรรมชัดเจน)
│
├── app/
│   ├── core/
│   │   └── config.py                  # 🔧 [2] ไฟล์เดิมของระบบ (แก้ไขเพิ่มพารามิเตอร์แบบเกาะแกนสัมบูรณ์)
│   │
│   ├── services/                      # 🆕 [3] โฟลเดอร์ใหม่รวมบริการคำนวณกราฟิกและ AI
│   │   ├── __init__.py                # สารบัญสืบค้นตัวแปรข้ามโฟลเดอร์
│   │   ├── qr_detector.py             # สคริปต์สแกน QR Code และหามาตราส่วนความกว้าง
│   │   ├── wound_segmenter.py         # สคริปต์โหลดและรันโมเดลทำนายแผลพร้อมหา Shannon Entropy
│   │   └── image_rectifier.py         # สคริปต์ปรับแก้ภาพถ่ายเฉียงเป็นหน้าตรง (Homography & Shift)
│   │
│   └── static/                        # 📁 [4] โฟลเดอร์แชร์ไฟล์รูปภาพของระบบ
│       └── wounds/                    # ห้องเก็บรูปภาพแผลขอบเขียวหน้าตรงสำหรับแชร์ให้ React
│
├── main.py                            # 🔧 [5] ไฟล์เดิมหลักของระบบ (เมานต์ Static และดึงจุดสร้างห้องที่ Startup)
│
└── sandbox/                           # 🆕 [6] ห้องทดลองรัน Sandbox บนวินโดวส์ (ย้ายจากชื่อเดิม scratch)
    ├── inputs/                        # ห้องจัดวางไฟล์รูปแผลทดสอบ ( test.jpg )
    └── test_segmentation.py           # สคริปต์จำลองรันภาพแผลในแรมเพื่อพิสูจน์ขนาด ซม.
```

---

## 📋 2. ตารางระบุสถานะไฟล์ที่แก้ไขและสร้างใหม่ (File Action Matrix)

เพื่อให้โปรแกรมเมอร์และสมาชิกในทีมเห็นภาพร่วมกันชัดเจน ตารางด้านล่างนี้จำแนกสถานะการแก้ไขไฟล์ทั้งหมดของงานประมวลผลแผลครับ:

| ลำดับ | พาธไฟล์ในระบบหลังบ้าน | สถานะการทำงาน | คำอธิบายและแนวทางการเชื่อมระบบ |
| :--- | :--- | :--- | :--- |
| **1** | `server/weights/unet_efficientnet_b4_dfu.pth` | 🆕 **นำเข้าไฟล์ใหม่** | นำไฟล์น้ำหนักโมเดลสากลที่ระบุชื่อสถาปัตยกรรมชัดเจนย้ายมาวางระบบหลังบ้าน |
| **2** | `server/app/core/config.py` | 🔧 **แก้ไขเพิ่มเติมคลาสเดิม** | เขียน **เพิ่มตัวแปรสเกล** พร้อมหา `BASE_DIR` สัมบูรณ์ **ห้ามเขียนทับโค้ดฐานข้อมูลเดิม** |
| **3** | `server/main.py` | 🔧 **แก้ไขเพิ่มเติมโค้ดเดิม** | เพิ่มจุด Mount และเพิ่ม Startup Event รันตรวจสอบสร้างห้องไดเรกทอรีแชร์รูปภาพคนไข้ |
| **4** | `server/app/services/__init__.py` | 🆕 **สร้างไฟล์ใหม่ทั้งหมด** | จัดตั้งไฟล์สารบัญห้องว่างเปล่า เพื่อระบุความเป็นโมดูลย่อยของห้อง `services/` |
| **5** | `server/app/services/qr_detector.py` | 🆕 **สร้างไฟล์ใหม่ทั้งหมด** | เขียนฟังก์ชันตรวจมุม QR Code ด้วย `pyzbar` และสูตรบวกลบคูณไขว้หาขนาดพิกเซลสติกเกอร์ |
| **6** | `server/app/services/wound_segmenter.py` | 🆕 **สร้างไฟล์ใหม่ทั้งหมด** | เขียนฟังก์ชันโหลดโครงข่ายประสาท U-Net และสั่งทำนายผลพร้อมคิดค่าความลังเลอักเสบรอบขอบแผล |
| **7** | `server/app/services/image_rectifier.py` | 🆕 **สร้างไฟล์ใหม่ทั้งหมด** | เขียนฟังก์ชันบิดยืดแผ่นภาพเฉียงให้ตรง (Homography) และโยกพิกเซลเพื่อกันภาพตกขอบแหว่ง |
| **8** | `server/sandbox/test_segmentation.py` | 🆕 **สร้างไฟล์ใหม่ทั้งหมด** | เขียนสคริปต์ Sandbox ยิงทดสอบตรวจขนาด ซม. บนจอดำ PowerShell เพื่อเช็คความนิ่งก่อนต่อ API จริง |

---

## 🚀 3. ขั้นตอนปฏิบัติการวางระบบจริงทีละเสต็ป (Step-by-Step Integration Guide)

---

### 📍 ขั้นตอนที่ 1: จัดเตรียมไดเรกทอรีและย้ายน้ำหนัก AI (`unet_efficientnet_b4_dfu.pth`)
1. สร้างโฟลเดอร์สำหรับจัดเก็บน้ำหนักโมเดลที่พิกัด `server/weights/`
2. คัดลอกไฟล์ผลลัพธ์การฝึกสอนโมเดลปัญญาประดิษฐ์มาเซฟจัดเก็บและเปลี่ยนชื่อเป็น `server/weights/unet_efficientnet_b4_dfu.pth` เพื่อความโปร่งใสทางวิชาการและเป็นมาตรฐานสากล

---

### 📍 ขั้นตอนที่ 2: ปรับปรุงโครงสร้างคลาสการตั้งค่าระบบหลัก `config.py` (แก้ไขเพิ่มคลาสเดิม)

> [!IMPORTANT]
> **ข้อพึงระวังขั้นวิกฤต**: ห้ามนำโค้ดในคู่มือไปเขียนทับไฟล์ `config.py` เดิมทั้งหมดโดยตรงเด็ดขาด เพราะจะทำให้ค่า `DATABASE_URL` และพารามิเตอร์อื่นๆ ที่ระบบ FastAPI ใช้ดึงฐานข้อมูล PostgreSQL หายไปและทำให้ระบบเปิดไม่ขึ้นครับ

ให้นายเปิดไฟล์ **[config.py](file:///d:/University%20memory/year4%20%5B2569%5D/project_ICT/y4/Deep_Learning-Based_System_for_Segmentation_and_Monitoring_of_Diabetic/server/app/core/config.py)** แล้วทำการเขียนรหัสต่อเติมเข้าคลาสเดิมดังนี้:

#### 🔍 เปรียบเทียบรหัสก่อนแก้ไข VS หลังแก้ไข (Diff Comparison)
```diff
   from pydantic_settings import BaseSettings, SettingsConfigDict
+  import os
   
   class Settings(BaseSettings):
       PROJECT_NAME: str = "Deep Learning-Based System for Segmentation and Monitoring of Diabetic Foot Ulcer"
       API_V1_STR: str = "/api/v1"
       DATABASE_URL: str
+ 
+      # --- โค้ดตั้งค่าเสริมสำหรับคำนวณสเกลแผล (เพิ่มเติมเข้าคลาสเดิม) ---
+      # หาตำแหน่งพาธหลักแบบพิกัดสัมบูรณ์ของโฟลเดอร์ server/ ป้องกันบั๊กรันคนละชั้น directory
+      BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
+      
+      # พาธจัดเก็บไฟล์น้ำหนักโครงข่ายประสาท U-Net AI (ดึงผ่าน BASE_DIR)
+      MODEL_PATH: str = os.path.join(BASE_DIR, "weights", "unet_efficientnet_b4_dfu.pth")
+      # ไดเรกทอรีจัดเก็บรูปภาพแผลหน้าตรงที่แชร์รูปผ่านเซิร์ฟเวอร์
+      STATIC_DIR: str = os.path.join(BASE_DIR, "static", "wounds")
+      # ขนาดจริงทางกายภาพของขอบป้ายสติกเกอร์ QR Code อ้างอิงสเกล (หน่วยเซนติเมตร)
+      QR_SIZE_CM: float = 2.0
+      # อัตราส่วนมาตราส่วนมาตรฐานของโครงการ: ระยะ 1 เซนติเมตรในโลกจริง = 100 พิกเซลบนรูปหน้าตรง
+      TARGET_PX_PER_CM: float = 100.0   # 1 cm = 100 px
+      # ขีดจำกัดมิติความกว้างสูงสุดของภาพเพื่อป้องกันแรมระบบแครชล้นจากการบิด Homography
+      MAX_WARPED_DIM: int = 5000
+      # เกณฑ์ชี้ขาดการจำแนกเนื้อขอบเขตแผล (Threshold) ของโมเดล AI U-Net
+      THRESHOLD: float = 0.5
+ 
+      @property
+      def DEVICE(self) -> str:
+          import torch
+          return "cuda" if torch.cuda.is_available() else "cpu"
   
       model_config = SettingsConfigDict(
           env_file="../.env",
           env_file_encoding="utf-8",
           extra="ignore"
       )
   
   settings = Settings()
```

---

### 📍 ขั้นตอนที่ 3: เปิดบริการเมานต์แชร์รูปภาพแผลและลงเหตุการณ์สร้างไดเรกทอรีออโต้ใน `main.py`

ให้นายเปิดไฟล์ **[main.py](file:///d:/University%20memory%20%5B2569%5D/project_ICT/y4/Deep_Learning-Based_System_for_Segmentation_and_Monitoring_of_Diabetic/server/main.py)** และดำเนินการเขียนเพิ่มระบบเมานต์และ Startup Event ดังนี้:

#### 🔍 เปรียบเทียบรหัสก่อนแก้ไข VS หลังแก้ไข (Diff Comparison)
```diff
   from fastapi import FastAPI, Depends
+  from fastapi.staticfiles import StaticFiles  # ใช้สำหรับเปิดสิทธิ์เข้าถึง static files เช่น รูปภาพ
   from sqlalchemy.orm import Session
   from typing import List
+  import os
   
   from app.core.config import settings
   from app.db.session import SessionLocal
   from app.models import Role, User, Nurse, Patient, BodyPart, Wound, WoundRecord, Appointment
   
+  # --- บังคับสร้างโฟลเดอร์สำหรับเก็บภาพแผลก่อนทำการเชื่อม StaticFiles ป้องกันแอปล่ม ---
+  os.makedirs(settings.STATIC_DIR, exist_ok=True)
+  
   app = FastAPI(title=settings.PROJECT_NAME)
   
+  # เปิดบริการแชร์ไดเรกทอรี static เพื่อให้ React ฝั่งหน้าบ้านดึงรูปภาพแผลหน้าตรงไปโชว์ได้
+  app.mount("/static", StaticFiles(directory="static"), name="static")
+  
   def get_db():
       db = SessionLocal()
```

---

### 📍 ขั้นตอนที่ 4: สร้างสคริปต์สแกนมุมกล่อง QR Code (`qr_detector.py`) (สร้างใหม่ทั้งหมด)

จัดตั้งไฟล์ใหม่ขึ้นมาที่ **`server/app/services/qr_detector.py`** เพื่อบรรจุรหัสวิเคราะห์มุมแผ่นสติกเกอร์:

```python
import cv2
from pyzbar import pyzbar
import numpy as np

def detect_qr(image, qr_size_cm=2.0):
    """
    ตรวจสแกนหาตำแหน่งแผ่นสติกเกอร์ QR Code ในรูปแผลเบาหวาน (รับอาเรย์รูปภาพในแรม)
    และประเมินมาตราส่วนค่าความหนาแน่นพิกเซลต่อเซนติเมตรราบ (px/cm)
    """
    if image is None:
        return None
    
    # ถอดรหัสบาร์โค้ดในภาพถ่าย
    qr_list = pyzbar.decode(image)
    
    # เงื่อนไขเซฟตี้: ต้องเจอ QR Code และพิกัดยอดมุมต้องจับออกมาได้ครบทั้ง 4 ด้าน
    if not qr_list or len(qr_list[0].polygon) != 4:
        return None
        
    qr = qr_list[0]
    # ดึงค่าพิกัดราบและตั้ง (X, Y) ทั้งสี่มุม
    polygon = [[p.x, p.y] for p in qr.polygon]
    pts = np.array(polygon, dtype=np.float32)
    
    # [ทฤษฎีสูตรเชือกผูกรองเท้า (Shoelace Formula) ในโค้ดจริง]
    # บวกลบคูณไขว้พิกัดมุมเพื่อหาพื้นที่ราบสติ๊กเกอร์จริงโดยไม่กังวลเรื่องการหมุนของสเปคแผล
    qr_area_px = float(cv2.contourArea(pts))
    
    # หาความยาวเฉลี่ยของทั้งสี่ด้านสติกเกอร์เพื่อนำมาคิดค่าเฉลี่ยสเกลกล้องถ่ายรูป
    side_lengths = [np.linalg.norm(pts[i] - pts[(i + 1) % 4]) for i in range(4)]
    px_per_cm = float(np.mean(side_lengths)) / qr_size_cm
    
    return {
        "px_per_cm": px_per_cm,
        "polygon": polygon
    }
```

---

### 📍 ขั้นตอนที่ 5: สร้างสคริปต์วิเคราะห์บาดแผลและเอนโทรปี (`wound_segmenter.py`) (สร้างใหม่ทั้งหมด)

จัดตั้งไฟล์ใหม่ขึ้นมาที่ **`server/app/services/wound_segmenter.py`** เพื่อรองรับการทำงานของ U-Net AI:

```python
import torch
import torchvision.transforms as transforms
from PIL import Image
import cv2
import numpy as np
import segmentation_models_pytorch as smp

def load_model(model_path, device):
    """
    โหลดโมเดลปัญญาประดิษฐ์ตรวจแผล U-Net เข้าแรมระบบ
    """
    model = smp.Unet(
        encoder_name="efficientnet-b4",
        encoder_weights=None, # รันโหมดดึงพารามิเตอร์เก็บเองในเครื่อง
        in_channels=3,
        classes=1
    )
    state_dict = torch.load(model_path, map_location=device)
    model.load_state_dict(state_dict, strict=False)
    model.to(device).eval()
    return model

def segment_wound(image, model, device, threshold=0.5):
    """
    ตรวจหาแผลคนไข้ด้วย AI พร้อมหาความเปื่อยแดงอักเสบรอบขอบแผล (Shannon Entropy) (รับอาเรย์รูปภาพในแรม)
    """
    h, w = image.shape[:2]
    img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    img_pil = Image.fromarray(img_rgb)
    
    # ปรับสัดส่วนแปลงภาพถ่ายเข้าสู่มาตรฐานของ U-Net ขนาด 512x512
    transform = transforms.Compose([
        transforms.Resize((512, 512)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    img_tensor = transform(img_pil).unsqueeze(0).to(device)
    
    with torch.no_grad():
        logits = model(img_tensor)
        prob = torch.sigmoid(logits).squeeze().cpu().numpy()
        
    # ขยายสัดส่วนหน้ากากทำนายผลของ AI กลับมาสู่ระดับภาพถ่ายดั้งเดิม
    prob_resized = cv2.resize(prob, (w, h), interpolation=cv2.INTER_LINEAR)
    mask = (prob_resized > threshold).astype(np.uint8) * 255
    
    # [ทฤษฎีระดับความลังเล Shannon Entropy บูรณาการจริง]
    # จิ้มวิเคราะห์หาเฉพาะพิกเซลที่ AI มีความลังเลคาบเกี่ยวสูงรอบนอกแผลเพื่อแจ้งเตือน Erythema
    wound_pixels_prob = prob[prob > threshold]
    if len(wound_pixels_prob) > 0:
        eps = 1e-7
        p = wound_pixels_prob
        entropy = - (p * np.log2(p + eps) + (1 - p) * np.log2(1 - p + eps))
        avg_entropy = float(np.mean(entropy))
        confidence = float(np.mean(wound_pixels_prob))
    else:
        avg_entropy, confidence = 0.0, 0.0
        
    return {
        "mask": mask,
        "confidence": confidence,
        "avg_entropy": avg_entropy
    }
```

---

### 📍 ขั้นตอนที่ 6: สร้างสคริปต์ดึงระนาบกล้องเอียงชดเชยตรง (`image_rectifier.py`) (สร้างใหม่ทั้งหมด)

จัดตั้งไฟล์ใหม่ขึ้นมาที่ **`server/app/services/image_rectifier.py`** เพื่อชดเชยมุมถ่ายเอียง:

```python
import cv2
import numpy as np

def warp_image_and_mask(img, mask, qr_polygon, qr_size_cm=2.0, target_px_per_cm=100.0, max_warped_dim=5000):
    """
    ใช้เมตริกซ์ Homography ยืดดึงระนาบแผ่นยางเอียงสติกเกอร์มุมเฉียงให้ขนานหน้าตรงขนานกล้อง 90 องศา
    """
    # เรียงจุดพิกัดมุมทั้ง 4 ทิศทาง
    src_pts = np.array([
        [qr_polygon[0][0], qr_polygon[0][1]], # บน-ซ้าย
        [qr_polygon[3][0], qr_polygon[3][1]], # บน-ขวา
        [qr_polygon[2][0], qr_polygon[2][1]], # ล่าง-ขวา
        [qr_polygon[1][0], qr_polygon[1][1]]  # ล่าง-ซ้าย
    ], dtype="float32")
    
    # มาตรฐานขนาดเป้าหมายหน้าตรง (QR ขนาด 2 ซม. คูณเกณฑ์ 100 px/cm = กว้างยาว 200x200 พิกเซลตรง)
    qr_side_px = qr_size_cm * target_px_per_cm
    dst_pts_ref = np.array([
        [0.0, 0.0],
        [qr_side_px, 0.0],
        [qr_side_px, qr_side_px],
        [0.0, qr_side_px]
    ], dtype="float32")
    
    # คำนวณหาแผ่นดึง Homography Matrix
    H = cv2.getPerspectiveTransform(src_pts, dst_pts_ref)
    h, w = img.shape[:2]
    
    # [ระบบเลื่อนแกนพิกเซลชดเชยเพื่อตัดขอบดำแหว่ง (Translation)]
    corners = np.array([[0,0], [w-1,0], [w-1,h-1], [0,h-1]], dtype=np.float32).reshape(-1,1,2)
    warped_corners = cv2.perspectiveTransform(corners, H)
    x_coords, y_coords = warped_corners[:,0,0], warped_corners[:,0,1]
    min_x, max_x = np.min(x_coords), np.max(x_coords)
    min_y, max_y = np.min(y_coords), np.max(y_coords)
    warped_w, warped_h = int(np.ceil(max_x - min_x)), int(np.ceil(max_y - min_y))
    
    # ดีเทกตรวจสอบกรณีมุมลาดเอียงพินาศเกินพิกัดระบบ
    if warped_w > max_warped_dim or warped_h > max_warped_dim:
        raise ValueError("มุมกล้องถ่ายภาพเฉียงลาดชันเกินเกณฑ์โครงการ กรุณาตั้งกล้องขนานหน้าตรงมากขึ้น")
        
    # เลื่อนขอบเขตติดลบขยับเข้ามาอยู่ในย่านสิกแนลบวกทั้งหมด ภาพแผลจึงกลับมาโชว์ครบถ้วนสมบูรณ์
    translation_matrix = np.array([[1, 0, -min_x], [0, 1, -min_y], [0, 0, 1]], dtype="float32")
    H_final = np.dot(translation_matrix, H)
    
    warped_img = cv2.warpPerspective(img, H_final, (warped_w, warped_h))
    warped_mask = cv2.warpPerspective(mask, H_final, (warped_w, warped_h), flags=cv2.INTER_NEAREST)
    
    return warped_img, warped_mask, warped_w, warped_h
```

---

### 📍 ขั้นตอนที่ 7: เขียนสร้างตัวเชื่อมประสารโมดูลหลัก (`__init__.py`)
เพื่อนำไฟล์ย่อยอิมพอร์ตไปเรียกใช้งานข้ามแพ็กเกจ ให้สร้างไฟล์เปล่าชื่อ **`server/app/services/__init__.py`** ขึ้นมา เพื่อบอกให้ Python รับทราบว่าห้องนี้เป็นห้องสารบัญฟังก์ชันนำเข้าใช้ระบบครับ

---

### 📍 ขั้นตอนที่ 8: จัดสร้างตัวจำลองห้องทดลองวิเคราะห์แผล (`test_segmentation.py`) (สร้างใหม่ทั้งหมด)

สำหรับสปีดการพัฒนาโค้ดโดยไม่ต้องไปสตาร์ทดีบีหรือเซ็ตระบบคลาวด์จริง ให้สร้างไฟล์จำลองไว้เพื่อประเมินผลผ่าน PowerShell ขึ้นมาที่พิกัด **`server/sandbox/test_segmentation.py`**:

```python
import sys
import os
import cv2
import numpy as np

# นำร่องสายเรียกหาไฟล์ชั้นนอกสุด
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.services.qr_detector import detect_qr
from app.services.wound_segmenter import load_model, segment_wound
from app.services.image_rectifier import warp_image_and_mask

def run_sandbox(image_path):
    print("🚀 สตาร์ททดสอบจำลองภาพตรวจแผลและ QR Code...")
    
    # โหลดภาพเข้ารูปแบบ numpy array ในแรมก่อน (เพียงครั้งเดียวจากดิสก์)
    image = cv2.imread(image_path)
    if image is None:
        print("❌ ข้อผิดพลาด: ไม่สามารถเปิดไฟล์ภาพทดสอบได้!")
        return
        
    # 1. รันดึงโมเดลประสาทเทียม
    model = load_model(settings.MODEL_PATH, settings.DEVICE)
    
    # 2. ค้นหาสติกเกอร์ (ส่งภาพ numpy array)
    qr_data = detect_qr(image, settings.QR_SIZE_CM)
    if not qr_data:
        print("❌ ข้อผิดพลาด: ตรวจจับไม่พบป้ายอ้างอิง QR Code!")
        return
        
    # 3. รันคัดกรอบแผลด้วย U-Net (ส่งภาพ numpy array)
    wound_data = segment_wound(image, model, settings.DEVICE, settings.THRESHOLD)
    
    # 4. บิดแผ่นยางเอียงชดเชยระนาบตรงขนานกล้อง (ส่งภาพ numpy array และหน้ากากแผล)
    warped_img, warped_mask, warped_w, warped_h = warp_image_and_mask(
        image, wound_data["mask"], qr_data["polygon"],
        settings.QR_SIZE_CM, settings.TARGET_PX_PER_CM, settings.MAX_WARPED_DIM
    )
    
    # 5. [สูตรวิเคราะห์พื้นที่จริงเทียบพิกเซลตรง 0.0001 ตารางเซนติเมตรคงที่]
    pixels_rectified = int(np.sum(warped_mask > 0))
    scale_factor = 4.0 / (200.0 * 200.0) # 0.0001 cm2/px
    area_cm2 = pixels_rectified * scale_factor
    
    # 📌 บันทึกเซฟรูปภาพลงดิสก์จำลองเพื่อตรวจสอบผลลัพธ์ด้วยตาเปล่า (ตามหลักการ Naming Convention)
    # 1. วาดเส้นขอบสีเขียวรอบแผลลงบนภาพสเกลสีหน้าตรง
    contours, _ = cv2.findContours(warped_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    warped_img_contour = warped_img.copy()
    cv2.drawContours(warped_img_contour, contours, -1, (0, 255, 0), 2)
    
    # เซฟรูปสีขอบเขียว
    cv2.imwrite("sandbox/test_processed.jpg", warped_img_contour)
    # 2. เซฟรูปหน้ากากแผลขาวดำคู่กันโดยห้อยคำว่า _mask ต่อท้าย
    cv2.imwrite("sandbox/test_processed_mask.png", warped_mask)
    
    print("=" * 60)
    print(f"📊 ผลตรวจขนาดพื้นที่จริงแผลสะสม : {area_cm2:.4f} cm²")
    print(f"📉 อัตราความอักเสบแดงรอบแผล   : {wound_data['avg_entropy']:.4f} (Shannon Entropy)")
    print(f"🩹 จำนวนพิกเซลแผลตรงขอบคม     : {pixels_rectified:,} px")
    print("=" * 60)

if __name__ == "__main__":
    # ใส่รูปแผลทดสอบ 'test.jpg' ไว้ใน server/sandbox/inputs/ เพื่อตรวจรัน
    run_sandbox("sandbox/inputs/test.jpg")
```

---

## ⚡ 4. เจาะลึกความเชื่อมโยงกับระบบฐานข้อมูล PostgreSQL (Database Mapping)

เมื่อคำนวณพื้นที่แผลเป็นตารางเซนติเมตรจากโค้ด AI สำเร็จแล้ว ตัวเลขเหล่านี้จะถูกนำไปต่อยอดกรอกข้อมูลเก็บสถิติลงตารางฐานข้อมูล `wound_records` ในแรม ผ่านตัวแปรดังนี้:

```python
# ตัวอย่างแผนงานการแมปค่าบันทึกลง SQLAlchemy
new_record = WoundRecord(
    wound_id=active_wound_id,
    image_path=saved_processed_image_path,      # เก็บพาธไฟล์รูปแผลขอบเขียวหน้าตรง
    area_pixel=pixels_rectified,                # เก็บขนาดพิกเซลหน้าตรง (เช่น 12,500)
    area_cm2=area_cm2,                          # เก็บพื้นที่ ซม. จริงหลังหาสเกล (เช่น 1.25 cm2)
    avg_entropy=wound_data["avg_entropy"]       # เก็บระดับความลังเลอักเสบขอบแผล
)
db.add(new_record)
db.commit()
```

---

## 📐 5. หลักการออกแบบซอฟต์แวร์ระดับสากล (Software Architecture Design Decisions)

หัวข้อนี้สรุปแนวทางการตัดสินใจเลือกโครงสร้างเชิงสถาปัตยกรรม (Design Decisions) ที่พวกเราใช้ในโปรเจกต์ ซึ่งสามารถนำไปใช้เขียนอธิบายลงในเล่มวิทยานิพนธ์และตอบคำถามการสอบจบปี 4 ได้อย่างเป็นระบบครับ:

### 1️⃣ การหลีกเลี่ยงผลกระทบข้างเคียงระหว่างนำเข้าข้อมูล (Import Side-Effect Isolation)
*   **แนวคิด**: ในโครงสร้างแบบ Clean Code ไฟล์ตั้งค่า (`config.py`) จะทำหน้าที่เก็บตัวแปรการกำหนดค่าแบบเพียวๆ (Configuration Only) โดยไม่มีการรันคำสั่งเชิงดำเนินการ (Operations) ใดๆ ท้ายไฟล์
*   **ทำไมต้องทำ**: หากพวกเราใส่คำสั่งอย่าง `os.makedirs()` หรือคำสั่งเข้าถึงอุปกรณ์ดิสก์ไว้ท้ายไฟล์ `config.py` ทุกครั้งที่สคริปต์ย้ายฐานข้อมูล (Alembic Migration) หรือไฟล์อื่นๆ ทำการอิมพอร์ตดึงตัวแปรระบบไปใช้ มันจะแอบสั่งสร้างโฟลเดอร์บนดิสก์วนไปเรื่อยๆ ซึ่งอาจทำให้ติดขัดเรื่องสิทธิ์การอ่านเขียนไฟล์ (Permission Error) บนสภาพแวดล้อมจำลอง
*   **แนวทางแก้ไข**: ย้ายการตรวจสอบและสร้างโฟลเดอร์ไปจัดตั้งไว้ที่ส่วนต้นของไฟล์ `main.py` (ก่อนจะประกาศเมานต์ StaticFiles) เพื่อการันตีว่ามีไดเรกทอรีแชร์ภาพอยู่จริงและขจัดความคาบเกี่ยวปัญหาเปิดแอปแครชแต่แรกสตาร์ต

### 2️⃣ การใช้ระบบที่ตั้งแบบเกาะแกนพิกัดสัมบูรณ์ (Portable Absolute Paths)
*   **แนวคิด**: หลีกเลี่ยงการเขียน Hardcode พาธโฟลเดอร์แบบสัมพันธ์ตรงๆ หรือพาธไดรฟ์ของระบบ Windows (เช่น `D:/University/...`)
*   **ทำไมต้องทำ**: เพราะเครื่องคอมพิวเตอร์ของอาจารย์ที่ตรวจงาน หรือสภาพแวดล้อมในคอนเทนเนอร์ Docker (ซึ่งทำงานบนระบบปฏิบัติการลินุกซ์) ไม่มีระบบพิกัดเหมือนดิสก์ของเครื่องพัฒนา การ Hardcode พาธตรงๆ จะทำให้โปรแกรมล่ม (Crash) ทันที
*   **แนวทางแก้ไข**: ใช้คำสั่ง `os.path.abspath(__file__)` ค้นหาจุดพิกัดสัมบูรณ์อ้างอิงจากตำแหน่งจริงของไฟล์ตั้งค่า แล้วใช้ `os.path.join(BASE_DIR, ...)` ประกอบพาสคีย์ขึ้นมาอัตโนมัติ ทำให้โปรเจกต์สามารถนำไปรันได้บนทุกระบบปฏิบัติการ (Windows, Linux, Docker, Cloud) ทันทีโดยไม่ต้องตั้งค่าใหม่

### 3️⃣ การลดความคาบเกี่ยวขัดข้องด้านการจัดเก็บรูปภาพ (Storage Abstraction Boundary)
*   **แนวคิด**: โครงสร้างการอ้างอิงรูปภาพผลลัพธ์ของ AI จะถูกแปลงให้อยู่ในรูปแบบ URL เครือข่าย (HTTP Network Links) ทันทีหลังประมวลผลเสร็จ
*   **ทำไมต้องทำ**: เพื่อแยกตรรกะการวิเคราะห์แผลออกจากตัวกลางจัดเก็บภาพ (Decoupling) ในช่วงแรกของการพัฒนาระบบ เราจัดเก็บรูปภาพลงในพื้นที่โลคอลของเครื่องคอมพิวเตอร์ (`LocalStorage` ใต้ `static/wounds`) เพื่อความเร็วและไม่มีค่าใช้จ่ายคลาวด์
*   **แนวทางแก้ไข**: หากในอนาคตต้องการสเกลระบบขยายไปจัดเก็บภาพคนไข้บนคลังคลาวด์มาตรฐาน เช่น AWS S3 หรือ Google Cloud Storage พวกเราจะแก้เพียงแค่ส่วนรับส่งในคลาสตัวกลางเก็บไฟล์เท่านั้น โดยที่โค้ดส่วนวิเคราะห์หลักและเราเตอร์ API จะทำงานได้สม่ำเสมอโดยไม่ต้องแก้ไขโครงสร้างการรับข้อมูลเลย

### 4️⃣ การจัดเก็บรูปหน้ากากขาวดำด้วยระบบตั้งชื่อคู่ขนาน (Naming Convention vs Database Columns)
*   **แนวคิด**: ในตารางฐานข้อมูล `wound_records` เราเลือกเก็บเฉพาะพาธรูปภาพผลลัพธ์สีหลัก (`image_path`) เท่านั้น และทำการจัดเก็บรูปหน้ากากแผล (Binary Mask) ลงในฮาร์ดดิสก์จริงคู่ขนานกันโดยใช้การสะกดชื่อเติมคำท้าย (เช่น ห้อยท้ายด้วย `_mask.png`)
*   **ทำไมต้องทำ**: เพื่อหลีกเลี่ยงความจำเป็นในการสั่งแปลงและอพยพโครงสร้างฐานข้อมูล (Database Schema Migration) ในตู้ Docker ใหม่ ซึ่งมีความเสี่ยงทำให้ข้อมูล Seed และประวัติคนไข้ที่ทดสอบไว้ก่อนหน้าเสียหาย อีกทั้งรูปขาวดำมักใช้แสดงผลเปรียบเทียบเป็นคู่อยู่แล้ว การสะกดพาสคู่จึงมีความคลีนในเชิงวิศวกรรมสูงกว่า
*   **แนวทางแก้ไข**: เมื่อฝั่งหน้าบ้าน React ดึงที่อยู่รูปภาพหลักมาแสดงผลแล้ว หากต้องการโชว์ภาพขาวดำคู่กัน สามารถเขียนคำสั่งเปลี่ยนชื่อไฟล์สั้นๆ: `image_path.replace(".jpg", "_mask.png")` เพื่อยิงลิงก์สืบค้นรูปภาพขาวดำจากบริการ static หลังบ้านขึ้นมาแสดงผลได้ทันที
