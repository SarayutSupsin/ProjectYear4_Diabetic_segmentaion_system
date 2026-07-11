# คู่มือสอนการสร้างระบบฐานข้อมูลและการจัดการห้องจำลองแบบเจาะลึก (Database & Migration Tutorial Deep-Dive)

คู่มือฉบับนี้ออกแบบมาเป็นพิเศษสำหรับโครงการ **ระบบวิเคราะห์และติดตามขนาดแผลเบาหวานที่เท้าด้วยการเรียนรู้เชิงลึก (Diabetic Foot Ulcer System)** เพื่อให้คุณและทีมงานทำตามทีละขั้นตอน (Step-by-Step) พร้อมทั้งระบุคำอธิบายเชิงวิชาการและแนวคิดสถาปัตยกรรมระดับแกนหลัก (System Architecture) ของแต่ละส่วนอย่างละเอียด เพื่อใช้สำหรับนำไปประกอบในเล่มรายงานโครงงานปี 4 และใช้อธิบายตอบคำถามคณะกรรมการสอบได้อย่างมั่นใจ

---

## 💡 เจาะลึกทฤษฎีและแนวคิดสถาปัตยกรรม (Architectural Deep-Dive)

### 1. การแก้ปัญหา Circular Import (การอ้างอิงวนรอบใน Python)
ในภาษา Python เมื่อเราใช้ SQLAlchemy สถาปัตยกรรมมาตรฐานคือการเขียนความสัมพันธ์เชื่อมโยงกันแบบทวิทิศทาง (Bi-directional Relationship) โดยใช้ `relationship()`
* **ปัญหาหากแยกไฟล์เดี่ยว**: สมมติว่าเราแยกโมเดลคนไข้ไว้ใน `patient.py` และแยกโมเดลแผลไว้ใน `wound.py`
  - คลาส `Patient` ต้องทำการ `import Wound` เพื่อนิยามว่าคนไข้มีหลายแผล
  - คลาส `Wound` ต้องทำการ `import Patient` เพื่อระบุว่าแผลนี้เป็นของคนไข้คนไหน
  - เมื่อคอมไพเลอร์ของ Python เริ่มประมวลผล มันจะเกิดปัญหางูกินหางอ้างอิงวนรอบ (Circular Import) ส่งผลให้โปรแกรมพังและรันไม่ขึ้นทันที (`ImportError: cannot import name ...`)
* **ทางแก้ไขระดับโครงสร้าง**: เรายุบตาราง ORM ทั้ง 7 ตารางมารวมไว้ในไฟล์ `server/app/models.py` เพียงไฟล์เดียว 
  - การทำเช่นนี้ช่วยให้ Python โหลดคลาสตารางทั้งหมดขึ้นมาบนหน่วยความจำพร้อมกันในครั้งเดียว 
  - ทำให้เราสามารถพิมพ์ระบุชื่อคลาสอ้างอิงในรูปแบบข้อความ (เช่น `relationship("Wound", back_populates="patient")`) ได้ทันที 
  - ระบบจะจับคู่ความสัมพันธ์บนหน่วยความจำให้โดยอัตโนมัติหลังจากคอมไพล์โค้ดเสร็จสิ้น ส่งผลให้โค้ดมีความคล่องตัวและปราศจากข้อผิดพลาดเรื่องการอิมพอร์ตข้ามไฟล์

### 2. การเชื่อมโยงข้อมูลแบบ หนึ่งต่อหนึ่ง (One-to-One Relationship)
ตามโครงร่างระบบ เราจำเป็นต้องเชื่อมตารางข้อมูลเข้าสู่ระบบหลัก (`users`) เข้ากับรายละเอียดประวัติการทำงานของพยาบาล (`nurse`) หรือผู้ป่วย (`patients`)
* **หลักการออกแบบ**: เราสร้างตาราง `users` เป็นตารางแม่ จากนั้นให้ตารางโปรไฟล์ลูกสร้างคีย์หลัก (`primary_key=True`) ที่ควบฐานะเป็นคีย์นอก (`ForeignKey("users.user_id")`) ด้วย เพื่อรับประกันว่า 1 บัญชีผู้ใช้จะมีได้เพียง 1 โปรไฟล์เท่านั้น
* **การตั้งค่าใน SQLAlchemy**: ในคลาสแม่ `User` เราจะระบุคำสั่งความสัมพันธ์พร้อมพารามิเตอร์ `uselist=False`:
  ```python
  nurse_profile = relationship("Nurse", uselist=False, back_populates="user")
  ```
  - พารามิเตอร์ `uselist=False` จะสั่งการให้ ORM แปลงผลลัพธ์จากการเชื่อม SQL จากเดิมที่จะถูกดึงมาเป็นรายการ (List) ให้กลายเป็นออบเจกต์เดี่ยว (Single Object) ทันที ช่วยให้เรียกใช้งานง่าย เช่น `current_user.nurse_profile.first_name` แทนการเขียนคิวรีซ้ำซ้อน

### 3. การจัดการพอร์ตเครือข่ายและการสื่อสาร (Host vs Docker Internal Network)
เมื่อเราทำงานรันระบบบน Docker ระบบเครือข่ายจะถูกแยกออกจากระบบของ Windows หลักเพื่อความปลอดภัย:
* **พอร์ตภายนอก (Host Port - 5430)**: เป็นช่องทางสำหรับให้แอปพลิเคชันจากข้างนอก เช่น โปรแกรมจัดการฐานข้อมูล (DBeaver, pgAdmin) หรือสคริปต์ Python ที่เรารันในเครื่องโฮสต์โดยตรง เพื่อเข้าเชื่อมต่อกับฐานข้อมูล โดยจะชี้เป้าไปที่ `localhost:5430`
* **พอร์ตภายใน (Container Port - 5432)**: เป็นพอร์ตมาตรฐานของ PostgreSQL ที่รันอยู่ข้างในตู้จำลอง
* **การคุยกันภายในเครือข่าย Docker (FastAPI -> PostgreSQL)**: ตู้คอนเทนเนอร์หลังบ้านของ FastAPI จะคุยผ่านสะพานเชื่อมเสมือน (Bridge Network) ซึ่งจะมองเห็นตู้ฐานข้อมูลผ่านชื่อเซอร์วิสที่เราตั้งไว้ใน docker-compose นั่นคือ `db` และคุยกันผ่านพอร์ตภายในคือ `5432` โดยไม่ต้องผ่านพอร์ตภายนอกเลย ช่วยลดโอกาสการถูกดักจับข้อมูลจากภายนอกเครื่อง

---

## 🛠️ ขั้นตอนที่ 1: เตรียมไฟล์ตั้งค่ารอบนอก (Environment & Docker)

สร้างและเตรียมไฟล์ภายนอกเพื่อให้ระบบเซิร์ฟเวอร์รันอยู่บนสภาพแวดล้อมเดียวกัน

### 1.1 ปรับแต่งไฟล์ `.env` (ที่โฟลเดอร์นอกสุดของโปรเจกต์)
เพิ่มบรรทัด `DATABASE_URL` โดยอ้างอิงรหัสผ่านและพอร์ตที่เราตั้งไว้ในไฟล์:
```ini
# .env
POSTGRES_USER=dfu_admin
POSTGRES_PASSWORD=dfu_password
POSTGRES_DB=dfu_database
POSTGRES_HOST=db
POSTGRES_PORT=5432

# URL เชื่อมฐานข้อมูลสำหรับเชื่อมต่อบนเครื่องโฮสต์ (สำหรับรัน Alembic หรือ Script แมนนวลภายนอก)
DATABASE_URL=postgresql://dfu_admin:dfu_password@localhost:5430/dfu_database

# URL เชื่อมฐานข้อมูลสำหรับรันในตู้อุปกรณ์ Docker (สำหรับรันภายใน Container)
DATABASE_URL_DOCKER=postgresql://dfu_admin:dfu_password@db:5432/dfu_database
```
* **🔍 คำอธิบายเชิงลึกแบบเจาะลึก**:
  - `POSTGRES_USER` และ `POSTGRES_PASSWORD`: กำหนดสิทธิ์ผู้มีอำนาจสูงสุด (Superuser) ของ PostgreSQL
  - `DATABASE_URL`: ใช้รูปแบบโครงสร้าง `postgresql://[username]:[password]@[host]:[port]/[database_name]`
  - **ทำไมต้องแยก DATABASE_URL และ DATABASE_URL_DOCKER? (ต่างกันอย่างไร)**:
    เนื่องจากระบบโปรเจกต์ DFU ของเราทำงานแบ่งเป็น 2 ส่วนเครือข่ายเสมือน (Network Namespace) ที่แยกออกจากกัน:
    1. **DATABASE_URL (โลกภายนอกตู้ - รันตรงบน Windows):** ใช้เมื่อเรายิงคำสั่งใน Windows Terminal เช่น สั่งจัดการโครงสร้างตาราง (<code>alembic upgrade head</code>) หรือเขียนสคริปต์ยัดข้อมูล (<code>python seed.py</code>) คำสั่งเหล่านี้รันอยู่นอก Docker จึงมองดีบีจำลองผ่าน "สะพานเชื่อมพอร์ต" ที่จับคู่เชื่อมมายัง `localhost:5430`
    2. **DATABASE_URL_DOCKER (โลกภายในตู้ปิด - รันจำลองบน Docker):** ใช้เมื่อตัวแอป FastAPI (backend) บูตตัวเองรันขึ้นมาจากในตู้คอนเทนเนอร์จำลอง ตู้แอปจะยิงคุยกับตู้ฐานข้อมูลโดยตรงผ่านวงเน็ตเวิร์กจำลองภายใน Docker (Bridge Network) ชี้ชื่อปลายทางโฮสต์ไปหาตู้ดีบีตรงๆ คือ `db` และผ่านพอร์ตภายในตู้แบบดั้งเดิมคือ `5432` (ไม่ชี้หา localhost:5430 เนื่องจากในตู้แอป คำว่า localhost จะหมายถึงตัวแอปเอง และทำให้เชื่อมฐานข้อมูลล้มเหลว)

### 1.2 สร้างไฟล์ `server/requirements.txt`
ระบุไลบรารีที่จำเป็นทั้งหมดในการพัฒนา:
```text
fastapi==0.111.0
uvicorn==0.30.1
sqlalchemy==2.0.31
psycopg2-binary==2.9.9
pydantic==2.7.4
pydantic-settings==2.3.4
alembic==1.13.1
passlib[bcrypt]==1.7.4
pyjwt==2.8.0
python-multipart==0.0.9
opencv-python-headless==4.9.0.80
pyzbar==0.1.9
```
* **🔍 คำอธิบายรายละเอียดของไลบรารีแต่ละตัว**:
  - `fastapi`: เฟรมเวิร์กประสิทธิภาพสูงสำหรับสร้างเว็บ API แบบ Asynchronous
  - `uvicorn`: เว็บเซิร์ฟเวอร์น้ำหนักเบาตามมาตรฐาน ASGI ใช้ในการสตาร์ทและรับส่ง HTTP Request ให้ FastAPI
  - `sqlalchemy`: ไลบรารี ORM มาตรฐานที่ช่วยให้เขียนไพธอนคุยกับ SQL
  - `psycopg2-binary`: ไดรเวอร์เชื่อมโยงฐานข้อมูล PostgreSQL สำหรับภาษา Python ทำหน้าที่แปลงคำสั่งไพธอนเป็นคำสั่งโปรโตคอลของ PostgreSQL
  - `pydantic & pydantic-settings`: ทำหน้าที่สแกน ตรวจเช็คประเภทข้อมูล และสลับการโหลดไฟล์ตั้งค่า
  - `alembic`: เครื่องมือวิเคราะห์และทำประวัติประวัติฐานข้อมูล (Database Migration)
  - `passlib[bcrypt]`: ใช้สำหรับทำความปลอดภัยรหัสผ่านผู้ใช้งาน โดยจะแฮชรหัสผ่านดิบ (เช่น 'password123') ให้เป็นสตริงยาวที่ถอดรหัสย้อนกลับไม่ได้ ป้องกันกรณีฐานข้อมูลรั่วไหล
  - `pyjwt`: เครื่องมือสร้างและถอดรหัส JSON Web Token (JWT) สำหรับใช้ในการยืนยันตัวตนและการเข้าสู่ระบบที่ปลอดภัย (Stateless Authentication)
  - `opencv-python-headless`: ไลบรารี OpenCV เวอร์ชันสำหรับรันหลังบ้าน (ไม่มีหน้าต่างป๊อปอัปแจ้งเตือนบนเซิร์ฟเวอร์) ใช้เพื่อประมวลผลรูปแผล ตรวจสอบวัตถุ และสอบเทียบพิกเซล
  - `pyzbar`: ไลบรารีถอดรหัสบาร์โค้ดและ QR Code เพื่อระบุตำแหน่งพิกัดของวัตถุอ้างอิงขนาด 2.0 x 2.0 ซม. ในรูปภาพแผลเบาหวาน

### 1.3 สร้างไฟล์ `server/Dockerfile`
เขียนขั้นตอนประกอบตู้อุปกรณ์สำหรับการรันหลังบ้าน:
```dockerfile
FROM python:3.10-slim

WORKDIR /app

# ติดตั้งไลบรารีของระบบปฏิบัติการที่จำเป็นสำหรับ pyzbar และ OpenCV
RUN apt-get update && apt-get install -y \
    libzbar0 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
```
* **🔍 คำอธิบายขั้นตอนการทำงานของ Dockerfile**:
  - `FROM python:3.10-slim`: เลือกใช้ระบบปฏิบัติการ Debian รุ่นย่อยที่มีขนาดเล็กและเบาพร้อม Python 3.10 ติดตั้งไว้ล่วงหน้า หลีกเลี่ยงรุ่น Alpine เนื่องจาก Alpine ใช้ระบบคัดกรองสัญญาณ `musl` แทน `glibc` ซึ่งมักจะมีปัญหาในการติดตั้งตัวประมวลผลภาพอย่าง OpenCV และ PyTorch ทำให้คอมไพล์ไม่ผ่านหรือทำงานช้ามาก
  - `RUN apt-get update...`: สั่งตัวอัปเดตของลินุกซ์ในตู้ดาวน์โหลดและติดตั้งตัวแปลภาษาโปรแกรมซีส่วนเสริม ได้แก่ `libzbar0` (แกนหลักสำหรับถอดรหัสคิวอาร์โค้ด) และไลบรารีกราฟิก `libgl1` กับ `libglib2.0` (แกนหลักสำหรับอ่านประมวลผลรูปภาพในหน่วยความจำของ OpenCV) หากไม่มีส่วนนี้ จะเกิดข้อผิดพลาดรันไทม์หาโมดูลระบบภาพไม่เจอบนคอมพิวเตอร์จำลอง
  - `--no-cache-dir`: สั่งห้ามเก็บไฟล์ติดตั้งที่ใช้เสร็จแล้วไว้ เพื่อควบคุมขนาดของ Docker Image ให้เล็กและประหยัดพื้นที่ฮาร์ดดิสก์
  - `EXPOSE 8000`: เปิดช่องทางการสื่อสารขาออกของตู้จำลองที่พอร์ต 8000

---

## 🔑 ขั้นตอนที่ 2: ขึ้นโครงเชื่อมฐานข้อมูล (Database Connection Setup)

สร้างระบบเชื่อมระบบ FastAPI เข้ากับฐานข้อมูล

### 2.1 สร้างไฟล์ `server/app/core/config.py`
ดึงข้อมูลสิ่งแวดล้อมมาแปลงค่าในระบบโดยใช้ Pydantic Settings เพื่อความปลอดภัยและเข้ากันได้กับทุกระบบปฏิบัติการ:
```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Deep Learning-Based System for Segmentation and Monitoring of Diabetic Foot Ulcer"
    API_V1_STR: str = "/api/v1"
    
    # กำหนดประเภทข้อมูล Pydantic Settings จะไปดึงจากไฟล์ .env หรือ Env Var ให้อัตโนมัติ
    DATABASE_URL: str

    model_config = SettingsConfigDict(
        env_file="../.env", 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

settings = Settings()
```
* **🔍 คำอธิบายอย่างละเอียด**:
  - `BaseSettings`: เป็นคลาสพิเศษของ Pydantic (จากแพ็กเกจ `pydantic-settings`) ที่ออกแบบมาเพื่อบริหารจัดการตัวแปรปรับแต่งแอปพลิเคชัน (Configuration Management) โดยมันจะทำการดึงค่าจากตัวแปรระบบปฏิบัติการ (Environment Variables) หรืออ่านแกะไฟล์คอนฟิกภายนอกอย่าง `.env` มาแปลงเป็นออบเจกต์ภาษาไพธอนโดยอัตโนมัติ ทำให้เราเขียนเรียกใช้เช่น `settings.DATABASE_URL` ได้สะดวกทั่วทุกหน้า
  - `DATABASE_URL: str`: การกำหนดตัวแปรไว้ลอย ๆ ระบุเพียงชนิดข้อมูล (Type Hinting) เป็นการมอบหน้าที่ให้ Pydantic Settings วิ่งไปสืบค้นหาค่าคีย์เชื่อมโยง `DATABASE_URL` ในไฟล์ `.env` ที่กำหนดไว้ด้านล่างเอง และแปลงค่าให้อัตโนมัติ โดยสาเหตุที่เราไม่ใช้คำสั่ง `os.getenv("DATABASE_URL")` แบบเดิม เนื่องจากคำสั่ง `os.getenv` ดั้งเดิมของไพธอนจะทำหน้าที่หาตัวแปรบนระบบปฏิบัติการหลักของ Windows เท่านั้น ซึ่งหากรันภายนอกตู้ Docker (เช่น การรันคำสั่ง Alembic เพื่อย้ายตารางข้อมูลบน PowerShell) ตัว Windows จะหาค่านี้ไม่เจอและส่งค่าว่าง `None` ส่งกลับมา จนทำให้ Pydantic ดีดเออร์เรอร์การตรวจสอบข้อมูลล้มเหลว (ValidationError) การปล่อยให้ Pydantic จัดการอ่านไฟล์ `.env` เองจึงเป็นวิธีแก้ปัญหาที่เสถียรที่สุด
  - `model_config`: คอนฟิกเสริมสำหรับระบุพฤติกรรมการดักจับความลับของ Pydantic:
    - `env_file="../.env"`: ชี้เป้าขยับถอยหลังย้อนขึ้นไปหนึ่งชั้นนอกโฟลเดอร์เซิร์ฟเวอร์เพื่อเปิดดึงไฟล์รหัสผ่านความปลอดภัย
    - `env_file_encoding="utf-8"`: กำหนดรหัสฟอนต์ตัวอักษรเป็น utf-8 เพื่อรองรับภาษาไทยหรืออักขระพิเศษอย่างถูกต้อง
    - `extra="ignore"`: สั่งข้ามหรือละเว้นตัวแปรแปลกอื่น ๆ ใน `.env` ที่คลาสแอปตัวนี้ไม่ได้ประกาศใช้งาน ป้องกันไม่ให้ระบบส่งรายงานเออร์เรอร์แจ้งมีฟิลด์ส่วนเกินโผล่เข้ามาเกินจำเป็น ช่วยรักษาระบบให้คลีนและปลอดภัยที่สุดครับ

### 2.2 สร้างไฟล์ `server/app/db/base_class.py`
สร้างโครงสร้างคลาสหลักสำหรับโมเดอร์ตาราง:
```python
from typing import Any
from sqlalchemy.orm import DeclarativeBase, declared_attr

class Base(DeclarativeBase):
    id: Any
    __name__: str

    # ตั้งชื่อตารางในฐานข้อมูลเป็นชื่อคลาสพิมพ์เล็กโดยอัตโนมัติ
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower()
```
* **🔍 คำอธิบายอย่างละเอียด**:
  - `DeclarativeBase`: ใน SQLAlchemy 2.0 รูปแบบใหม่ จะระบุสืบทอดจากตัวแปรนี้แทนรูปแบบเดิม ทำหน้าที่เป็น **สมุดจดทะเบียนรวมประวัติโครงสร้างตาราง (Metadata Registry)** ซึ่งจะคอยบันทึกความเชื่อมโยง คีย์หลัก คีย์นอกทั้งหมดไว้ที่ `Base.metadata` เพื่อให้โปรแกรม Alembic หรือระบบคิวรีดึงข้อมูลโครงร่างเหล่านี้ไปสร้างตารางจริงในดีบีได้อย่างสมบูรณ์แบบ
  - `id: Any` และ `__name__: str`: ตัวชี้แนะประเภทข้อมูล (Type Hinting) เพื่อบอกโปรแกรมระบบตรวจสอบโค้ดของไพธอนล่วงหน้าว่าทุกคลาสลูกที่มาร่วมใช้งาน จะมีคีย์หลักชื่อ `id` และมีชื่อคลาสสำหรับอ้างอิงเป็น String เสมอ เพื่อความปลอดภัยจากการพิมพ์ตัวแปรผิดและช่วยให้ระบบตรวจสอบประเภทข้อมูลทำงานได้เสถียร
  - `@declared_attr` ในฟังก์ชัน `__tablename__`: สั่งให้ระบบทำระบบดักจับตั้งชื่อตารางอัตโนมัติ (Dynamic Table Naming) โดยแปลงชื่อคลาส เช่น คลาส `User` เป็นชื่อตารางในฐานข้อมูล PostgreSQL คือ `user` โดยอัตโนมัติ ช่วยลดความซ้ำซ้อนในการโค้ด (DRY Principle) และป้องกันความสับสนสะกดชื่อตารางผิดพลาดครับ

### 2.3 สร้างไฟล์ `server/app/db/session.py`
เปิดสัญญาณเชื่อมระบบฐานข้อมูล:
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# 1. สร้างหัวจ่ายสัญญาณเชื่อมต่อฐานข้อมูล
engine = create_engine(
    settings.DATABASE_URL, 
    pool_pre_ping=True
)

# 2. สร้างโรงผลิต Session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```
* **🔍 คำอธิบายอย่างละเอียด**:
  - `create_engine`: เป็นหัวใจหลักในการส่งสายคิวรีไพธอนไปแปลเป็นคิวรีของ PostgreSQL โดยจะทำหน้าที่ควบคุมสระเชื่อมโยงการคุย (Connection Pooling) เช่น จัดแจงเปิดสายรอไว้ 5 สายพร้อมใช้งาน และจะแจกจ่ายเมื่อมีคนเรียกใช้ เพื่อประหยัดทรัพยากรดีบีแทนการเปิด-ปิด สัญญาณใหม่ทุกวินาที
  - `pool_pre_ping=True`: สำคัญมากสำหรับการรันฐานข้อมูลบน Docker หรือคลาวด์ เพราะสัญญาณระหว่างตู้คอนเทนเนอร์อาจขาดหายไปดื้อ ๆ ได้ (Stale Connection) คำสั่งนี้จะทำการเช็คสภาพสัญญาณด้วยคำสั่งเบา ๆ ก่อนส่งคำสั่งจริงไปรัน หากพบว่าดีบีไม่ตอบรับ มันจะสร้างท่อต่อสายใหม่ให้ทันที ช่วยป้องกันปัญหาแอปหลังบ้านค้าง/ส่งข้อความ Error กลับมาหาผู้ใช้
  - `SessionLocal`: เป็นคลาสโรงงานที่เราสร้างสิทธิ์ไว้สำหรับเรียกคุยเพื่อกรอกหรือค้นข้อมูลในฟังก์ชันจริง โดยตัวเลือก `autoflush=False` จะสั่งให้ระบบไม่ต้องพยายามพ่นคิวรีแอบเขียนลงตารางล่วงหน้าจนกว่าเราจะสั่งเซฟอย่างเป็นทางการ ช่วยประหยัดคิวรีที่ไม่จำเป็นและป้องกันฐานข้อมูลทำงานหนักเกินไป

---

## 🗄️ ขั้นตอนที่ 3: ออกแบบคลาสตาราง `server/app/models.py` (SQLAlchemy Models)

ตารางฐานข้อมูลทั้ง 8 ตารางที่ผูกความสัมพันธ์กันอย่างละเอียด:

```python
import datetime
from sqlalchemy import Column, Integer, String, DateTime, Date, Time, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base_class import Base

# 1. ตารางสิทธิ์ผู้ใช้งาน (roles)
class Role(Base):
    __tablename__ = "roles"
    
    role_id = Column(String(5), primary_key=True)  # เช่น ADMIN, NURSE, PATI
    role_name = Column(String(20), nullable=False)  # เช่น "ผู้ดูแลระบบ", "พยาบาล"

    # ความสัมพันธ์
    users = relationship("User", back_populates="role")


# 2. ตารางบัญชีผู้ใช้งาน (users)
class User(Base):
    __tablename__ = "users"
    
    user_id = Column(String(10), primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role_id = Column(String(5), ForeignKey("roles.role_id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # ความสัมพันธ์
    role = relationship("Role", back_populates="users")
    nurse_profile = relationship("Nurse", uselist=False, back_populates="user")
    patient_profile = relationship("Patient", uselist=False, back_populates="user")
    records_added = relationship("WoundRecord", back_populates="nurse")


# 3. ตารางประวัติพยาบาล (nurse)
class Nurse(Base):
    __tablename__ = "nurse"
    
    user_id = Column(String(10), ForeignKey("users.user_id"), primary_key=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    department = Column(String(100), nullable=True)

    # ความสัมพันธ์
    user = relationship("User", back_populates="nurse_profile")


# 4. ตารางประวัติผู้ป่วย (patients)
class Patient(Base):
    __tablename__ = "patients"
    
    HN = Column(String(50), primary_key=True, index=True)  # รหัสคนไข้ประจำตัว เช่น HN0001
    user_id = Column(String(10), ForeignKey("users.user_id"), nullable=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    birth_date = Column(Date, nullable=True)
    gender = Column(String(10), nullable=True)
    phone = Column(String(20), nullable=True)
    admit_date = Column(Date, default=datetime.date.today)

    # ความสัมพันธ์
    user = relationship("User", back_populates="patient_profile")
    wounds = relationship("Wound", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")


# 5. ตารางตำแหน่งอ้างอิงของแผลเบาหวาน (body_parts)
class BodyPart(Base):
    __tablename__ = "body_parts"
    
    body_part_id = Column(String(5), primary_key=True)  # เช่น FF (Forefoot), MF (Midfoot)
    body_part_name = Column(String(50), nullable=False)  # เช่น "หน้าเท้า", "กลางฝ่าเท้า"

    wounds = relationship("Wound", back_populates="body_part")


# 6. ตารางแผลเบื้องต้นของคนไข้ (wounds)
class Wound(Base):
    __tablename__ = "wounds"
    
    wound_id = Column(String(10), primary_key=True)  # เช่น W0001
    HN = Column(String(50), ForeignKey("patients.HN"), nullable=False)
    body_part_id = Column(String(5), ForeignKey("body_parts.body_part_id"), nullable=False)
    side = Column(String(10), nullable=False)  # เช่น เท้าซ้าย (Left), เท้าขวา (Right)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # ความสัมพันธ์
    patient = relationship("Patient", back_populates="wounds")
    body_part = relationship("BodyPart", back_populates="wounds")
    records = relationship("WoundRecord", back_populates="wound")


# 7. ตารางบันทึกการประมวลผลและการรักษารายครั้ง (wound_records)
class WoundRecord(Base):
    __tablename__ = "wound_records"
    
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    wound_id = Column(String(10), ForeignKey("wounds.wound_id"), nullable=False)
    user_id = Column(String(10), ForeignKey("users.user_id"), nullable=False)  # พยาบาลผู้สแกน
    image_path = Column(String(255), nullable=False)  # พาธรูปแผลต้นฉบับใน File System
    area_pixel = Column(Integer, nullable=False)  # จำนวนพิกเซลที่ Mask ได้
    area_cm2 = Column(Float, nullable=False)  # ขนาดแผลจริงคำนวณเปรียบเทียบสเกล
    record_date = Column(DateTime, default=datetime.datetime.utcnow)
    note = Column(Text, nullable=True)  # บันทึกความเห็นแพทย์/พยาบาลเพิ่มเติม

    # ความสัมพันธ์
    wound = relationship("Wound", back_populates="records")
    nurse = relationship("User", back_populates="records_added")


# 8. ตารางการนัดหมายติดตามผล (appointments)
class Appointment(Base):
    __tablename__ = "appointments"
    
    appointment_id = Column(Integer, primary_key=True, autoincrement=True)
    HN = Column(String(50), ForeignKey("patients.HN"), nullable=False)
    nurse_user_id = Column(String(10), ForeignKey("users.user_id"), nullable=False)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # ความสัมพันธ์
    patient = relationship("Patient", back_populates="appointments")
```

* **🔍 เจาะลึกการออกแบบแต่ละฟิลด์ข้อมูลในตาราง**:
  - `String(length)`: เราเจาะจงความยาวเพื่อลดการจองพื้นที่สิ้นเปลืองในดีบี เช่น `role_id` ใช้ขนาด 5 หลักพอสำหรับรหัสอย่าง `ADMIN` หรือ `NURSE` ส่วนรหัสผ่านผู้ใช้ใช้ขนาด `255` หลักเพราะเวลาที่รหัสถูกเข้ารหัสแฮชด้วย Bcrypt จะได้รหัสแฮชที่มีความยาวคงที่ที่ 60 หลัก การเปิดเผื่อไว้ 255 หลักช่วยให้รองรับโปรโตคอลความปลอดภัยที่ซับซ้อนขึ้นในอนาคตได้สบาย
  - `index=True`: การเพิ่มดัชนีลงในคอลัมน์คีย์ค้นหาบ่อย เช่น `HN` (Hospital Number ของคนไข้) และ `username` ทำให้ฐานข้อมูลคัดลอกพอยน์เตอร์มาทำสารบัญค้นหาเสมือน ช่วยให้เวลาแพทย์ดึงข้อมูลคนไข้มาแสดงผลบนเว็บทำได้รวดเร็วมาก ไม่เกิดอาการโหลดหมุนค้าง
  - `datetime.datetime.utcnow`: เราตั้งเวลาเซฟข้อมูลเริ่มต้นเป็น **เวลาสากล (UTC)** เสมอ หลีกเลี่ยงการใช้เวลาเครื่องท้องถิ่น (Local Time) เนื่องจากหากนำแอปหลังบ้านนี้ไปรันจริงบนคลาวด์ที่ตั้งเวลาไม่ตรงกัน เวลาบันทึกขนาดแผลและเวลาจองนัดจะบิดเบือนจนคลาดเคลื่อนได้ การใช้เวลา UTC เป็นค่าอ้างอิงกลางแล้วปล่อยให้ฝั่งหน้าบ้าน (React) ไปคำนวณแปลงสเกลเวลาตามโซนพิกัดผู้ใช้ภายหลัง จึงถือเป็นแนวทางปฏิบัติที่ดีที่สุด (Best Practice)
  - `relationship(back_populates="...")`: ตัวเชื่อมแบบทวิทิศทาง เพื่อให้ตารางแม่และตารางลูกสามารถเข้าเรียกหาและใช้งานออบเจกต์ของกันและกันได้ทันที เช่น จากตัวแปรแผล `wound` เราเข้าถึง `wound.patient` ได้ และจากคนไข้เราก็ดึงแผลทั้งหมดออกมาดูได้ทันทีผ่าน `patient.wounds` ช่วยให้เขียนโค้ดได้ง่ายและสะอาดขึ้นอย่างมาก

---

## ✈️ ขั้นตอนที่ 4: ตั้งระบบควบคุมเวอร์ชันฐานข้อมูล (Alembic Migration Setup)

ทำระบบ Migration เพื่อให้ทีมงานพัฒนาฐานข้อมูลร่วมกันได้โดยข้อมูลทดสอบไม่สูญหาย

### 4.1 สั่งเริ่มสร้างโฟลเดอร์โครงการ Alembic
รันคำสั่งเริ่มต้นที่โฟลเดอร์ `server/`:
```bash
alembic init alembic
```
* **🔍 คำอธิบายการทำงาน**: คำสั่งนี้จะทำการสร้างไฟล์ตั้งค่า `alembic.ini` และสร้างโฟลเดอร์โครงการย่อยชื่อ `alembic/` ภายในจะบรรจุไฟล์ควบคุมระบบและโฟลเดอร์ว่างชื่อ `versions/` เพื่อเตรียมใช้สำหรับรวบรวมประวัติการอัปเกรดฐานข้อมูล

### 4.2 แก้ไขคอนฟิกให้อ่านความลับฐานข้อมูลจาก `.env`
เปิดไฟล์ `server/alembic/env.py` หาจุดที่กำหนด `target_metadata = None` และแก้ไขโค้ดด้านบนของตัวแปรนั้นให้เป็นไปตามนี้:

```python
# แก้ไขเพิ่มในไฟล์ server/alembic/env.py (บรรทัดแรกๆ)
import sys
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool

# เพิ่มพาธเพื่อให้สคริปต์หาโฟลเดอร์หลักของเราตรวจพบตาราง
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# นำเข้าคลาสหลักและโมเดลทั้งหมดที่เราเขียนขึ้น
from app.db.base_class import Base
from app.models import Role, User, Nurse, Patient, BodyPart, Wound, WoundRecord, Appointment

# ตั้งค่า Metadata ให้เป็นของระบบตารางเรา
target_metadata = Base.metadata

# ดึงค่า URL เชื่อมต่อจาก .env มาใช้งานแมนนวลแทนการฮาร์ดโค้ดลงไฟล์ ini
from app.core.config import settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
```
* **🔍 คำอธิบายการเขียนโค้ดเพื่อควบคุมระบบเชิงลึก**:
  - `sys.path.insert(0, ...)`: สคริปต์รันของ Alembic จะถูกประมวลผลแยกอยู่นอกขอบเขตโมดูลของแอปปกติ หากเราไม่ทำการเพิ่มระบบพาธโฟลเดอร์หลักเข้าไปในระบบค้นหาของ Python ก่อน ตัวระบบจะไม่สามารถโหลดคำสั่ง `import app.models` ได้ และจะขึ้น Error `ModuleNotFoundError`
  - `config.set_main_option(...)`: ปกติแล้วในระบบทั่วไป ตัวเชื่อมสัญญาณดีบีจะเขียนระบุค่ารหัสผ่านค้างคาไว้ในไฟล์ `alembic.ini` ตรง ๆ ซึ่งเสี่ยงต่อระบบความปลอดภัยและทำให้เกิดปัญหาสลับเครื่องรันไม่ได้ โค้ดส่วนนี้จะเป็นตัวสั่งให้ระบบไปแอบไปอ่านค่า `DATABASE_URL` จากในความลับระบบหลังบ้านแทน จึงยืดหยุ่นและปลอดภัยสูงสุด

---

## 📥 ขั้นตอนที่ 5: เขียนคำสั่งบันทึกประวัติการรันและสุ่มข้อมูลป้อน (Migrations & Seeding)

### 5.1 สั่งเปรียบเทียบคลาส Python กับฐานข้อมูลจริงเพื่อสร้าง Revision
เปิด Terminal ที่โฟลเดอร์ `server/` แล้วพิมพ์:
```bash
alembic revision --autogenerate -m "Create initial tables"
```
* **🔍 คำอธิบายอย่างละเอียด**: ตัวเลือก `--autogenerate` จะทำหน้าที่ไปตรวจสอบความแตกต่างของตาราง โดยวิเคราะห์โครงสร้างในฐานข้อมูลปัจจุบันกับคลาสทั้งหมดที่ระบุอยู่ใน `Base.metadata` (ที่เราผูกไว้ใน `env.py`) จากนั้นตัวระบบจะคำนวณและเขียนไฟล์สคริปต์ไพธอนระบุขั้นตอนการรันคำสั่ง SQL สร้างตารางให้อัตโนมัติในโฟลเดอร์ `versions/`

### 5.2 สั่งรันเขียนตารางจริงลง PostgreSQL
```bash
alembic upgrade head
```
* **🔍 คำอธิบายอย่างละเอียด**: คำสั่งนี้จะเป็นการบอกให้รันไฟล์แก้ไขดีบีทั้งหมดที่มีอยู่ในโฟลเดอร์ประวัติที่ยังไม่ได้ประมวลผล เพื่อดำเนินการสร้างตารางจริง ๆ บน PostgreSQL เครื่องจำลอง

### 5.3 สร้างระบบป้อนข้อมูลตั้งต้น `server/app/db/seed.py`
ระบบต้องการข้อมูลบทบาท (Roles) และชื่อพิกัดร่างกาย (BodyParts) ก่อน ถึงจะใช้งานฟังก์ชันสแกนหรือสมัครสมาชิกได้:

```python
# server/app/db/seed.py
import sys
import os
# เพิ่มพาธเพื่อให้รันไฟล์เดี่ยวได้โดยไม่ติดปัญหา ModuleNotFoundError
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.db.session import SessionLocal
from app.models import Role, BodyPart

def seed_initial_data():
    db = SessionLocal()
    try:
        # 1. ใส่ข้อมูลสิทธิ์เข้าฐานข้อมูล
        roles_data = [
            Role(role_id="ADMIN", role_name="ผู้ดูแลระบบ"),
            Role(role_id="NURSE", role_name="พยาบาล"),
            Role(role_id="PATI", role_name="ผู้ป่วย")
        ]
        
        # 2. ใส่ข้อมูลส่วนของแผลที่เกิดขึ้น
        parts_data = [
            BodyPart(body_part_id="FF", body_part_name="Forefoot (หน้าเท้า)"),
            BodyPart(body_part_id="MF", body_part_name="Midfoot (กลางฝ่าเท้า)"),
            BodyPart(body_part_id="HEEL", body_part_name="Heel (ส้นเท้า)"),
            BodyPart(body_part_id="ANKL", body_part_name="Ankle (ข้อเท้า)"),
            BodyPart(body_part_id="DORS", body_part_name="Dorsum (หลังเท้า)"),
            BodyPart(body_part_id="PLAN", body_part_name="Plantar (ฝ่าเท้า)")
        ]
        
        # วนลูปเช็คว่ามีข้อมูลเดิมในดีบีรึยัง ถ้ายังไม่มีค่อยทำการเซฟ
        for role in roles_data:
            if not db.query(Role).filter_by(role_id=role.role_id).first():
                db.add(role)
                
        for part in parts_data:
            if not db.query(BodyPart).filter_by(body_part_id=part.body_part_id).first():
                db.add(part)
                
        db.commit()
        print("✅ ป้อนข้อมูล Roles และ Body Parts เริ่มต้นลงฐานข้อมูลสำเร็จ!")
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดในการใส่ข้อมูลตั้งต้น: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_initial_data()
```
* **🔍 เจาะลึกการรันและควบคุมการทำรายการข้อมูล (Transactions)**:
  - `db = SessionLocal()`: เป็นการเปิดสัญญาณเชื่อมดีบีขึ้นมา 1 เส้นสำหรับใช้งาน
  - `db.rollback()`: เป็นระบบป้องกันข้อมูลเสียหายนั่นคือระบบ **Transaction Atomic** ถ้าเรากำลังป้อนข้อมูลอยู่ 9 รายการ แต่รายการที่ 9 เกิดข้อผิดพลาด (เช่น พิกัดระบบล้มเหลว) ตัวบล็อก `except` จะรันคำสั่ง `rollback()` เพื่อยกเลิกรายการ 8 ตัวที่เคยสั่งจ่อรอคิวไว้ทิ้งทั้งหมด เพื่อคืนฐานข้อมูลเข้าสู่สถานะก่อนรันสคริปต์ ป้องกันข้อมูลขยะคั่งค้างในระบบดีบีของคุณ
  - `db.close()` ในบล็อก `finally`: สำคัญที่สุดในระบบหลังบ้าน เพราะหากเราเขียนลืมปิดสายการเชื่อมต่อ (Session) ตัวสายจะยังคงคาอยู่ในฐานข้อมูลไปเรื่อย ๆ เมื่อระบบถูกเปิดใช้ไปนาน ๆ (เช่น พยาบาลรันสแกนแผลหลายสิบครั้ง) สายเชื่อมต่อจะหมดโควต้า (Connection Pool Exhaustion) ส่งผลให้ตัวฐานข้อมูลหยุดบริการและแอปค้างไปทันที การใช้บล็อก `finally` เพื่อปิดสายจะรับประกันความปลอดภัยของสายเชื่อมโยงไม่ว่าจะรันสคริปต์สำเร็จหรือล้มเหลวก็ตาม

---

## 🧪 ขั้นตอนที่ 6: สร้างตัว API สำหรับทดลองและทดสอบระบบจริง (FastAPI Main Test)

สร้างไฟล์ `server/app/main.py` เพื่อสตาร์ทเซิร์ฟเวอร์หลังบ้าน และเขียนตัวทดสอบดึงข้อมูล

```python
# server/app/main.py
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Role, BodyPart

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API with PostgreSQL and SQLAlchemy ORM"
)

# ฟังก์ชันแจกจ่าย DB Session ชั่วคราวให้แต่ละ API (ปิดอัตโนมัติเมื่อขอเสร็จ)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# API 1: หน้าหลักทดสอบความพร้อมเชื่อมต่อ
@app.get("/")
def read_root():
    return {"message": "FastAPI และระบบฐานข้อมูลพร้อมใช้งานแล้ว!", "project": settings.PROJECT_NAME}

# API 2: ทดสอบดึงรายชื่อตำแหน่งแผลจากดีบีจริง
@app.get("/test-db-connection", response_model=List[dict])
def test_db_connection(db: Session = Depends(get_db)):
    # คิวรีตำแหน่งแผลทั้งหมดเพื่อเช็คว่าคุยกับ DB สำเร็จไหม
    parts = db.query(BodyPart).all()
    return [{"id": p.body_part_id, "name": p.body_part_name} for p in parts]
```
* **🔍 คำอธิบายการทำงานของสายดึงข้อมูลและ API (FastAPI Router Lifecycles)**:
  - `get_db()`: ตัวแจกจ่ายคิวรีฐานข้อมูลโดยใช้เทคนิคพิเศษร่วมกับคีย์เวิร์ดของ Python นั่นคือ **`yield`** แทนการพิมพ์คืนค่าแบบปกติด้วย `return`
  - **กลไกการทำหน้าที่แบบถงฝาด (Yield Lifecycle in FastAPI)**:
    1. เมื่อหน้าต่างเว็บส่งคำขอมาหา API `/test-db-connection`
    2. FastAPI จะเปิดโค้ดรันฟังก์ชัน `get_db()` เป็นอันดับแรก และส่งสายเชื่อมต่อ `db = SessionLocal()` ออกมาให้ใช้งานด้วยคำสั่ง `yield db`
    3. ตัวประมวลผลจะหยิบจับสายคิวรีนี้ส่งต่อไปยังอินพุตของ API เพื่อดึงข้อมูลตำแหน่งร่างกาย (`db.query(BodyPart).all()`) ไปส่งออกเป็นหน้าเว็บ JSON ตอบกลับผู้ใช้
    4. เมื่อประมวลผลและตอบกลับผู้ใช้เสร็จเรียบร้อยแล้ว ตัวระบบ FastAPI จะกระโดดกลับเข้ามาทำคำสั่งหลังบรรทัด yield ทันที นั่นคือการสั่งรันปิดสายที่บรรทัด `db.close()` 
    - วิธีนี้ช่วยควบคุมให้วงจรการเปิด-ปิดสายเชื่อมต่อดีบี ทำงานสอดประสานสัมพันธ์ไปกับระยะเวลาของการรับส่ง HTTP Request แต่ละครั้งได้อย่างสมบูรณ์แบบโดยที่โปรแกรมเมอร์ไม่ต้องพิมพ์เปิด-ปิดเองทุกไฟล์จุดเชื่อมโยง

---

## 🚀 สรุปขั้นตอนคำสั่งในการสั่งรันเพื่อทดสอบทั้งหมด

ให้ทำตามลำดับข้อความนี้ใน Terminal จากบนลงล่าง:

1. **รัน Postgres Container**:
   ```bash
   docker compose up -d db
   ```
2. **สร้างประวัติและรันคิวรีสร้างตารางจริงบนดีบี**:
   ```bash
   alembic revision --autogenerate -m "Create initial tables"
   alembic upgrade head
   ```
3. **รันตัวสุ่มข้อมูลเข้าตารางบทบาทและร่างกาย**:
   ```bash
   python app/db/seed.py
   ```
4. **สั่งสตาร์ทรัน FastAPI Backend**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
5. **เข้าเว็บเพื่อทดสอบ**:
   เปิดหน้าเว็บ `http://localhost:8000/docs` แล้วกดทดลองเรียกใช้งาน API `/test-db-connection` เพื่อยืนยันว่าระบบ Backend พ่นข้อมูลที่เชื่อมโยงกับฐานข้อมูล PostgreSQL คืนกลับมาได้ถูกต้องร้อยเปอร์เซ็นต์!
