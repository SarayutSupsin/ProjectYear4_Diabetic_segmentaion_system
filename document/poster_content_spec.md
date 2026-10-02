# 🎨 เอกสารและข้อความสำหรับจัดทำโปสเตอร์ A0 (A0 Poster Specification & Content Layout)

> **โครงงาน**: ระบบวิเคราะห์และติดตามขนาดแผลเบาหวานที่เท้าด้วยการเรียนรู้เชิงลึก  
> *(Deep Learning-Based System for Segmentation and Monitoring of Diabetic Foot Ulcers)*  
> **วัตถุประสงค์ของไฟล์นี้**: รวมเนื้อหาข้อความสั้นกระชับ (Poster Text Snippets) ทั้ง 8 ส่วน สำหรับคัดลอกไปวางในโปรแกรมออกแบบโปสเตอร์ (Canva / Adobe Illustrator / Photoshop)  

---

## 📌 สารบัญโครงสร้างโปสเตอร์ A0 (Poster Sections)
- [ส่วนที่ 1: ชื่อโครงงานและผู้จัดทำ (Header & Authors)](#ส่วนที่-1-ชื่อโครงงานและผู้จัดทำ)
- [ส่วนที่ 2: บทนำและความสำคัญ (Introduction)](#ส่วนที่-2-บทนำและความสำคัญ)
- [ส่วนที่ 3: วัตถุประสงค์ (Objectives)](#ส่วนที่-3-วัตถุประสงค์)
- [ส่วนที่ 4: สถาปัตยกรรมระบบ & AI Pipeline (Architecture)](#ส่วนที่-4-สถาปัตยกรรมระบบ--ai-pipeline)
- [ส่วนที่ 5: ระเบียบวิธีดำเนินงาน (Methodology)](#ส่วนที่-5-ระเบียบวิธีดำเนินงาน)
- [ส่วนที่ 6: ผลการทดลองและการประเมิน (Experimental Results)](#ส่วนที่-6-ผลการทดลองและการประเมิน)
- [ส่วนที่ 7: สรุปผลและการประยุกต์ใช้งาน (Conclusion)](#ส่วนที่-7-สรุปผลและการประยุกต์ใช้งาน)
- [ส่วนที่ 8: เอกสารอ้างอิง (References)](#ส่วนที่-8-เอกสารอ้างอิง)

---

### ส่วนที่ 1: ชื่อโครงงานและผู้จัดทำ

* **ชื่อภาษาไทย**: ระบบวิเคราะห์และติดตามขนาดแผลเบาหวานที่เท้าด้วยการเรียนรู้เชิงลึก
* **ชื่อภาษาอังกฤษ**: Deep Learning-Based System for Segmentation and Monitoring of Diabetic Foot Ulcers
* **ผู้จัดทำ**: นิสิต/นักศึกษาผู้จัดทำโครงงาน (สาขาเทคโนโลยีสารสนเทศและการสื่อสาร / วิทยาการคอมพิวเตอร์)
* **อาจารย์ที่ปรึกษา**: อาจารย์ที่ปรึกษาโครงงาน

---

### ส่วนที่ 2: บทนำและความสำคัญ

ภาวะแทรกซ้อนแผลเบาหวานที่เท้า (Diabetic Foot Ulcers: DFU) เป็นสาเหตุสำคัญที่อาจนำไปสู่การสูญเสียอวัยวะหากไม่ได้รับการติดตามอย่างใกล้ชิด การวัดขนาดแผลแบบดั้งเดิมโดยใช้ไม้บรรทัดแพทย์มีความคลาดเคลื่อนสูงและอาจก่อให้เกิดการสัมผัสแผลโดยไม่จำเป็น 

โครงงานนี้จึงเสนอ **ระบบเว็บแอปพลิเคชันวิเคราะห์และติดตามขนาดแผลเบาหวานอัตโนมัติ** โดยผสานเทคโนโลยี Computer Vision สำหรับการแก้ระนาบภาพถ่ายด้วยเมทริกซ์โฮโมกราฟี (Homography Transformation) ร่วมกับโมเดลการเรียนรู้เชิงลึก (Deep Learning) แบบ U-Net (EfficientNet-B4 Backbone) เพื่อคำนวณพื้นที่แผลเป็นตารางเซนติเมตร ($\text{cm}^2$) แม่นยำสูง และมีระบบเฝ้าระวังแผลที่มีแนวโน้มขยายตัว (Vigilance Alert)

---

### ส่วนที่ 3: วัตถุประสงค์

1. เพื่อพัฒนาระบบแบ่งส่วนภาพแผลเบาหวาน (Wound Segmentation) อัตโนมัติด้วยโครงข่าย U-Net EfficientNet-B4
2. เพื่อพัฒนาอัลกอริทึมแก้ความเอียงของระนาบภาพ (Perspective Transformation) โดยใช้สติกเกอร์ QR Code อ้างอิงขนาด ($2.0 \times 2.0\text{ cm}$)
3. เพื่อสร้างระบบติดตามแนวโน้มขนาดแผล ($cm^2$) และแจ้งเตือนความเสี่ยงแก่บุคลากรทางการแพทย์ผ่าน Web Application

---

### ส่วนที่ 4: สถาปัตยกรรมระบบ & AI Pipeline

![Poster System Architecture Diagram](./poster_architecture_diagram.svg)

* **Frontend Layer**: พัฒนาด้วย React.js + Tailwind CSS ออกแบบ Responsive UI สำหรับพยาบาลและคนไข้
* **Backend Layer**: พัฒนาด้วย FastAPI (Python) ให้บริการ RESTful API และระบบยืนยันตัวตน JWT
* **AI & Vision Pipeline**:
  1. *QR Detection & Calibration*: ตรวจจับจุดพิกัด 4 มุมของ QR Code สติกเกอร์อ้างอิง คำนวณเมทริกซ์ $\mathbf{H}$
  2. *Warp Perspective*: ปรับระนาบภาพแผลให้เป็นมุมมองตรง Top-down
  3. *U-Net Segmentation*: พยากรณ์ Binary Mask ขอบเขตแผลเบาหวาน
  4. *Area Computation*: คำนวณพื้นที่ $\text{Area}_{\text{cm}^2} = \frac{N_{\text{wound\_pixels}}}{S^2}$
* **Database & Storage**: บันทึกข้อมูลด้วย PostgreSQL และจัดเก็บภาพถ่ายประวัติแผล

---

### ส่วนที่ 5: ระเบียบวิธีดำเนินงาน

* **ชุดข้อมูล (Dataset)**: FUSeg Challenge 2021 (MICCAI 2021) รวม 1,210 ภาพ (Train 810 / Val 200 / Test 200)
* **การเตรียมข้อมูล (Data Augmentation)**: Random Rotation ($\pm 15^\circ$), Horizontal Flip, Color Jitter, ShiftScaleRotate
* **สถาปัตยกรรมโมเดล**: U-Net พร้อม EfficientNet-B4 Encoder pre-trained บน ImageNet
* **Hyperparameters**:
  * Optimizer: AdamW ($\text{Learning Rate} = 3\times 10^{-4}$, Weight Decay = $1\times 10^{-4}$)
  * Loss Function: DiceBCELoss (Combination of Binary Cross-Entropy and Dice Loss)
  * Learning Rate Scheduler: CosineAnnealingLR
  * Epochs: 50 | Batch Size: 8

---

### ส่วนที่ 6: ผลการทดลองและการประเมิน

ผลการทดลองบน Validation Set แสดงให้เห็นว่าโมเดล U-Net (EfficientNet-B4) บรรลุประสิทธิภาพสูงสุดที่ Epoch 42:

| ตัววัดประสิทธิภาพ (Metric) | ผลลัพธ์ที่ได้ (Validation Performance) |
| :--- | :---: |
| **Dice Similarity Coefficient (DSC)** | **85.82%** |
| **Intersection over Union (IoU)** | **78.82%** |
| **Validation Loss (DiceBCELoss)** | **0.1547** |

---

### ส่วนที่ 7: สรุปผลและการประยุกต์ใช้งาน

* **สรุปผล**: ระบบที่พัฒนาขึ้นสามารถประมวลผลตัดขอบแผลและคำนวณขนาดพื้นที่ ($\text{cm}^2$) ได้อย่างแม่นยำ ค่า Dice Coefficient เท่ากับ 85.82% และประมวลผลภาพได้แบบ Real-time
* **การประยุกต์ใช้ทางคลินิก**: ช่วยลดเวลาและภาระงานของพยาบาลในการวัดขนาดแผล เพิ่มความแม่นยำในการติดตามการสมานแผล และช่วยแจ้งเตือนแผลเฝ้าระวังได้อย่างมีประสิทธิภาพ

---

### ส่วนที่ 8: เอกสารอ้างอิง

1. Wang, C., et al. (2021). "FUSeg: Foot Ulcer Segmentation Challenge 2021." *MICCAI Workshop*.
2. Tan, M., & Le, Q. (2019). "EfficientNet: Rethinking Model Scaling for Convolutional Neural Networks." *ICML*.
3. Ronneberger, O., et al. (2015). "U-Net: Convolutional Networks for Biomedical Image Segmentation." *MICCAI*.
