# Login API - แก้โค้ดทีละขั้น

> ทำตามลำดับเลย ไม่ต้องเลือก ทำขั้นที่ 1 เสร็จแล้วค่อยไปขั้นที่ 2

---

## สถานะปัจจุบัน

| ไฟล์ | สถานะ |
|---|---|
| `app/schemas/auth.py` | แก้แล้ว (role: str ถูกต้อง) |
| `app/db/session.py` | ยังไม่แก้ - ไม่มี get_db() |
| `app/core/security.py` | พัง - import get_db จาก session.py แต่ session.py ยังไม่มี |
| `main.py` | ยังไม่แก้ - มี get_db() ซ้ำ |
| `app/api/v1/endpoints/auth.py` | ยังไม่แก้ - มี get_db() ซ้ำ |
| `app/core/config.py` | ยังไม่แก้ - SECRET_KEY มี default |
| `.env` | ยังไม่แก้ - ไม่มี SECRET_KEY |
| models 4 ไฟล์ | ยังไม่แก้ - ใช้ datetime.utcnow |

---

## ขั้นที่ 1: แก้ `app/db/session.py` — เพิ่ม get_db()

**ไฟล์:** `server/app/db/session.py`

**ตอนนี้มี 6 บรรทัด:**
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

**แก้เป็น (เพิ่ม get_db() ต่อท้าย):**
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**ทำอะไร:** เพิ่ม 5 บรรทัดสุดท้ายต่อท้ายไฟล์

---

## ขั้นที่ 2: แก้ `main.py` — ลบ get_db() ซ้ำ แล้ว import จาก session

**ไฟล์:** `server/main.py`

**ตอนนี้มีปัญหา:**
- บรรทัด 9: import `SessionLocal` แต่ไม่ได้ import `get_db`
- บรรทัด 30-35: มี `get_db()` ซ้ำ

**แก้บรรทัด 9:** เปลี่ยนจาก
```python
from app.db.session import SessionLocal
```
เป็น
```python
from app.db.session import get_db
```

**ลบบรรทัด 30-35:** ลบ function `get_db()` ทั้งก้อนออก

**แก้แล้วต้องเป็นแบบนี้ (ทั้งไฟล์):**
```python
from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os

from app.core.config import settings
from app.db.session import get_db
from app.models import Role, User, Nurse, Patient, BodyPart, Wound, WoundRecord, Appointment

from app.api.v1.endpoints import auth

os.makedirs(settings.STATIC_DIR, exist_ok=True)

app = FastAPI(title=settings.PROJECT_NAME)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(auth.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "FastAPI And SQLAlchemy Connected!!!"}

@app.get("/test-db-connection")
def test_db_connection(db: Session = Depends(get_db)):
    parts = db.query(BodyPart).all()
    return [{"id": p.body_part_id, "name": p.body_part_name} for p in parts]
```

---

## ขั้นที่ 3: แก้ `app/api/v1/endpoints/auth.py` — ลบ get_db() ซ้ำ แล้ว import จาก session

**ไฟล์:** `server/app/api/v1/endpoints/auth.py`

**ตอนนี้มีปัญหา:**
- บรรทัด 3: import `SessionLocal` แต่ไม่ได้ import `get_db`
- บรรทัด 10-15: มี `get_db()` ซ้ำ

**แก้บรรทัด 3:** เปลี่ยนจาก
```python
from app.db.session import SessionLocal
```
เป็น
```python
from app.db.session import get_db
```

**ลบบรรทัด 9-15:** ลบ comment `# Database Dependency` และ function `get_db()` ทั้งก้อนออก

**แก้แล้วต้องเป็นแบบนี้ (ทั้งไฟล์):**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import UserLogin, LoginResponse

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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"เกิดข้อผิดพลาด: {str(e)}"
        )

@router.get("/test")
def test():
    return {"message": "Auth router is working!"}
```

---

## ขั้นที่ 4: แก้ `app/core/security.py` — แก้ datetime.utcnow

**ไฟล์:** `server/app/core/security.py`

**ตอนนี้มีปัญหา:**
- บรรทัด 1: import `datetime, timedelta` แต่ไม่มี `timezone`
- บรรทัด 27, 29: ใช้ `datetime.utcnow()` (deprecated)

**แก้บรรทัด 1:** เปลี่ยนจาก
```python
from datetime import datetime, timedelta
```
เป็น
```python
from datetime import datetime, timedelta, timezone
```

**แก้บรรทัด 27:** เปลี่ยนจาก
```python
        expire = datetime.utcnow() + expires_delta
```
เป็น
```python
        expire = datetime.now(timezone.utc) + expires_delta
```

**แก้บรรทัด 29:** เปลี่ยนจาก
```python
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
```
เป็น
```python
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
```

---

## ขั้นที่ 5: แก้ `app/core/config.py` — ลบ SECRET_KEY default

**ไฟล์:** `server/app/core/config.py`

**แก้บรรทัด 25:** เปลี่ยนจาก
```python
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
```
เป็น
```python
    SECRET_KEY: str
```

---

## ขั้นที่ 6: แก้ `.env` — เพิ่ม SECRET_KEY

**ไฟล์:** `.env` (ที่ root ของโปรเจต์)

**เพิ่มบรรทัดนี้ต่อท้าย:**
```
SECRET_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

**วิธีสร้าง key จริง:** รันคำสั่งนี้ใน terminal แล้วคัดลอกผลลัพธ์ไปใส่:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## ขั้นที่ 7: แก้ Models ทั้ง 4 ไฟล์ — datetime.utcnow

### 7.1 แก้ `app/models/user.py`

**แก้บรรทัด 12:** เปลี่ยนจาก
```python
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
```
เป็น
```python
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
```

### 7.2 แก้ `app/models/wounds.py`

**แก้บรรทัด 12:** เปลี่ยนจาก
```python
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
```
เป็น
```python
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
```

### 7.3 แก้ `app/models/wound_record.py`

**แก้บรรทัด 14:** เปลี่ยนจาก
```python
    record_date = Column(DateTime, default=datetime.datetime.utcnow)
```
เป็น
```python
    record_date = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
```

### 7.4 แก้ `app/models/appointment.py`

**แก้บรรทัด 14:** เปลี่ยนจาก
```python
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
```
เป็น
```python
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
```

---

## ขั้นที่ 8: สร้าง `__init__.py` (3 ไฟล์ว่างเปล่า)

สร้างไฟล์ว่างเปล่าชื่อ `__init__.py` ใน 3 ที่:
```
server/app/api/__init__.py
server/app/api/v1/__init__.py
server/app/api/v1/endpoints/__init__.py
```

**วิธีสร้าง:** ใช้ terminal (จาก directory `server/`):
```bash
echo. > app\api\__init__.py
echo. > app\api\v1\__init__.py
echo. > app\api\v1\endpoints\__init__.py
```

หรือสร้างใน text editor ก็ได้ ไฟล์ไม่ต้องมีเนื้อหา

---

## ทดสอบ

รัน server:
```bash
docker compose up --build api
```

เปิด Swagger UI: `http://localhost:8000/docs`

### Test 1: Root endpoint
```bash
curl http://localhost:8000/
```
ต้องได้:
```json
{"message": "FastAPI And SQLAlchemy Connected!!!"}
```

### Test 2: DB connection
```bash
curl http://localhost:8000/test-db-connection
```
ต้องได้:
```json
[{"id": "BP001", "name": "Dorsum (หลังเท้า)"}, ...]
```

### Test 3: Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"username\": \"admin\", \"password\": \"password\"}"
```
ต้องได้:
```json
{
    "success": true,
    "message": "เข้าสู่ระบบสำเร็จ",
    "token": "eyJ...",
    "refresh_token": "eyJ...",
    "user": {
        "user_id": "...",
        "username": "admin",
        "role": "admin",
        "created_at": "2026-07-12T..."
    }
}
```

### Test 4: Auth router
```bash
curl http://localhost:8000/api/v1/auth/test
```
ต้องได้:
```json
{"message": "Auth router is working!"}
```

---

## สรุปทั้งหมด

| ขั้น | ไฟล์ | แก้อะไร |
|---|---|---|
| 1 | `app/db/session.py` | เพิ่ม get_db() |
| 2 | `main.py` | ลบ get_db() ซ้ำ, import จาก session |
| 3 | `app/api/v1/endpoints/auth.py` | ลบ get_db() ซ้ำ, import จาก session |
| 4 | `app/core/security.py` | เปลี่ยน datetime.utcnow → datetime.now(timezone.utc) |
| 5 | `app/core/config.py` | ลบ SECRET_KEY default |
| 6 | `.env` | เพิ่ม SECRET_KEY |
| 7 | models 4 ไฟล์ | เปลี่ยน datetime.utcnow → datetime.now(timezone.utc) |
| 8 | __init__.py 3 ไฟล์ | สร้างไฟล์ว่างเปล่า |
