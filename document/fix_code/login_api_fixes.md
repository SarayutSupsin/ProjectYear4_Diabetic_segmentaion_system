# Server Code Review — ผลตรวจทั้งหมด + วิธีแก้ทีละขั้น

> ตรวจทั้งหมดเมื่อ 2026-07-17
> ทำตามลำดับ แก้เสร็จแล้วรัน test ตอนท้าย

---

## สิ่งที่ทำได้ดีแล้ว (ไม่ต้องแก้)

| # | จุดที่ดี | รายละเอียด |
|---|---|---|
| 1 | Layered architecture ชัดเจน | endpoints → services → models แยกกันชัด ถูกหลัก |
| 2 | Pydantic Settings ใช้ `.env` ได้ถูกต้อง | `app/core/config.py` ใช้ `SettingsConfigDict` ดึงค่าจาก env |
| 3 | Alembic migration ตั้งค่าดี | import ครบทุก model, override DB URL จาก settings |
| 4 | Password hashing ถูกต้อง | ใช้ bcrypt ผ่าน passlib, มี `deprecated="auto"` |
| 5 | JWT structure ดี | access + refresh token, มี `sub` + `role` claim |
| 6 | Session management ดี | `get_db()` มี `finally` ปิด session เสมอ |
| 7 | ORM relationships ครบ | ทุก FK มี `relationship()` กลับ ครบถ้วน |
| 8 | CORS กำหนดชัดเจน | ไม่ได้ใช้ `["*"]` ระบุ origin เฉพาะ |
| 9 | SQLAlchemy 2.0 pattern | ใช้ `DeclarativeBase` ถูกหลัก modern |
| 10 | Pydantic `from_attributes` | ORM model serialize ได้ถูกต้อง |
| 11 | Seed script มี upsert | ตรวจ record ซ้ำก่อน insert ไม่ error ตอน rerun |
| 12 | UTC-aware datetime | `created_at` ทุก field ใช้ `timezone.utc` แล้ว |

---

## ปัญหาที่ต้องแก้

---

### CRITICAL — ต้องแก้ก่อน ไม่งั้นระบบไม่ทำงาน / เสี่ยงรั่ว

---

#### C1. ไม่มี `.gitignore` ที่ root — secret รั่ว

**ไฟล์:** ไม่มี `.gitignore` ที่ root ของโปรเจต (มีแค่ใน `client/`)

**ปัญหา:** ไฟล์ `.env` มีรหัสผ่าน database และ JWT secret key อยู่ แต่ไม่มี `.gitignore` ป้องกัน → ถ้า commit ขึ้น git ใครก็เห็นรหัสผ่าน

**สิ่งที่ต้องทำ:** สร้างไฟล์ `.gitignore` ที่ root ของโปรเจต (ข้างนอก `server/`)

**วิธีทำ:**
```bash
# จาก root ของโปรเจต (ไม่ใช่ server/)
echo .env > .gitignore
```

**สอน:** `.gitignore` บอก git ว่าไฟล์ไหนไม่ต้อง commit ไฟล์ `.env` ไม่ควรอยู่ใน repo เลย เพราะมี password + secret key

---

#### C2. Password plain text ใน database (แก้แล้ว)

**สถานะ:** แก้แล้ว — hash เป็น bcrypt เรียบร้อย

**สิ่งที่เรียนรู้:** ตอน seed user ใหม่ ต้อง hash password ก่อน insert เสมอ

```python
# วิธี seed user ที่ถูกต้อง
from app.core.security import get_password_hash

new_user = User(
    user_id="U001",
    username="admin",
    password=get_password_hash("123456"),  # ← hash ก่อน
    role_id="ADMIN"
)
```

---

#### C3. `.env` path เป็น relative — พังได้

**ไฟล์:** `app/core/config.py` บรรทัด 37

**ตอนนี้:**
```python
model_config = SettingsConfigDict(
    env_file="../.env",          # ← relative path
    env_file_encoding="utf-8",
    extra="ignore"
)
```

**ปัญหา:** `../.env` ขึ้นอยู่กับ directory ที่ run ถ้า run จาก directory อื่นจะหา `.env` ไม่เจอ

**แก้เป็น:**
```python
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

model_config = SettingsConfigDict(
    env_file=BASE_DIR / ".env",  # ← absolute path
    env_file_encoding="utf-8",
    extra="ignore"
)
```

**สอน:** `Path(__file__).resolve()` คือ path ของไฟล์ config.py ปัจจุบัน `.parent.parent.parent` คือย้อนขึ้นไป 3 ชั้น (app/core/config.py → app/core → app → server root) แล้วต่อ `.env`

---

#### C4. Error message leak — ส่ง error จริงให้ client

**ไฟล์:** `app/api/v1/endpoints/auth.py` บรรทัด 21

**ตอนนี้:**
```python
except Exception as e:
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"เกิดข้อผิดพลาด: {str(e)}"   # ← ส่ง error จริงให้ client
    )
```

**ปัญหา:** ถ้าเกิด error จริง (เช่น database ล่ม) client จะเห็น error message จริง เช่น `connection refused`, `table not found` → เผยข้อมูลภายใน

**แก้เป็น:**
```python
import logging
logger = logging.getLogger(__name__)

# ... ใน endpoint ...
except Exception as e:
    logger.exception("Login failed")   # ← log ไว้ debug
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="เกิดข้อผิดพลาดภายใน กรุณาลองใหม่อีกครั้ง"
    )
```

**สอน:** error จริงควรเก็บไว้ใน log server ไม่ใช่ส่งให้ client ใช้ `logging.exception()` เพื่อบันทึก error ไว้ debug

---

#### C5. `alembic.ini` มี password hardcoded

**ไฟล์:** `alembic.ini` บรรทัด 3

**ตอนนี้:**
```ini
sqlalchemy.url = postgresql://dfu_admin:dfu_password@localhost:5430/dfu_database
```

**ปัญหา:** password `dfu_password` เป็น plain text ในไฟล์ที่ commit ขึ้น git → ใครก็เห็น

**แก้เป็น:** เปลี่ยนเป็น env variable
```ini
sqlalchemy.url = %(DATABASE_URL)s
```

**สอน:** Alembic รองรับ `%(...)s` syntax สำหรับดึงค่าจาก environment variable ไม่ต้อง hardcode password ไว้ในไฟล์

---

#### C6. Dockerfile ไม่มี CMD

**ไฟล์:** `Dockerfile`

**ตอนนี้:**
```dockerfile
EXPOSE 8000
# ← จบไฟล์ ไม่มี CMD
```

**ปัญหา:** Container จะ start แล้ว stop ทันที เพราะไม่รู้ว่าต้อง run อะไร

**แก้เป็น:** เพิ่ม CMD บรรทัดสุดท้าย
```dockerfile
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### HIGH — ควรแก้เร็วๆ นี้

---

#### H1. ไม่มี `.dockerignore` — secret รั่วเข้า Docker image

**ไฟล์:** `server/.dockerignore` — ไม่มี

**ปัญหา:** `Dockerfile` มี `COPY . .` ซึ่งจะ copy ทุกอย่างเข้า container รวมถึง:
- `.env` — secret ไม่ควรอยู่ใน Docker image
- `__pycache__/` — compiled Python ไม่จำเป็น
- `.git` — ข้อมูล git ไม่จำเป็น

**แก้:** สร้างไฟล์ `server/.dockerignore`:
```
__pycache__
*.pyc
.env
.git
static/wounds/
```

---

#### H2. `static` mount ใช้ relative path

**ไฟล์:** `main.py` บรรทัด 26

**ตอนนี้:**
```python
app.mount("/static", StaticFiles(directory="static"), name="static")
```

**ปัญหา:** `"static"` เป็น relative path จะพังถ้า run จาก directory อื่น

**แก้เป็น:**
```python
from pathlib import Path
STATIC_DIR = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
```

---

#### H3. tokenUrl hardcode ใน security.py

**ไฟล์:** `app/core/security.py` บรรทัด 15

**ตอนนี้:**
```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
```

**ปัญหา:** ถ้าเปลี่ยน prefix ใน `main.py` ต้องมาแก้ที่นี่ด้วย → ซ้ำซ้อน

**แก้เป็น:**
```python
from app.core.config import settings
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")
```

**สอน:** ใช้ค่าจาก `settings` แทน hardcode ถ้าเปลี่ยนที่เดียว ทุกที่ตามอัตโนมัติ

---

#### H4. `schemas/init.py` ชื่อผิด

**ไฟล์:** `app/schemas/init.py`

**ปัญหา:** ชื่อไฟล์ผิด ต้องเป็น `__init__.py` ถึงจะเป็น Python package

**แก้:** เปลี่ยนชื่อไฟล์
```bash
# จาก directory server/
ren app\schemas\init.py __init__.py
```

---

#### H5. `seed.py` swallow exception เงียบ

**ไฟล์:** `app/db/seed.py` บรรทัด 35-36

**ตอนนี้:**
```python
except Exception as e:
    db.rollback()        # ← rollback แต่ไม่ log error เลย
```

**แก้เป็น:**
```python
except Exception as e:
    db.rollback()
    print(f"Error seeding data: {e}")    # ← เพิ่ม print/log
```

---

#### H6. ไม่มี null check ใน `check_user_role`

**ไฟล์:** `app/core/dependencies.py` บรรทัด 8

**ตอนนี้:**
```python
if current_user.role.role_name not in required_roles:
```

**ปัญหา:** ถ้า `current_user.role` เป็น `None` → crash 500 ทันที

**แก้เป็น:**
```python
if not current_user.role or current_user.role.role_name not in required_roles:
```

---

#### H7. `auth_service.py` — N+1 query + null check

**ไฟล์:** `app/services/auth_service.py` บรรทัด 29, 45

**ตอนนี้:**
```python
role=user.role.role_name,
```

**ปัญหา:** ไม่เช็คว่า `user.role` เป็น `None` → crash

**แก้เป็น:**
```python
role=user.role.role_name if user.role else "unknown",
```

---

#### H8. `bcrypt==3.2.2` เก่า + `python-jose` มี known vulnerabilities

**ไฟล์:** `requirements.txt`

**ปัญหา:**
- `bcrypt==3.2.2` → version ปัจจุบันคือ 4.x, version เก่ามี known issues
- `python-jose==3.3.0` → มี known security advisories

**แก้:**
```
# เปลี่ยน bcrypt
bcrypt>=4.0.0

# เปลี่ยน python-jose → PyJWT
PyJWT[crypto]>=2.8.0
# ลบ python-jose[cryptography] ออก
```

**สอน:** `PyJWT` ได้รับการดูแลดีกว่า `python-jose` และเบากว่า

---

### MEDIUM — แก้เมื่อมีเวลา

---

#### M1. `nurse` table name เป็น singular

**ไฟล์:** `app/models/nurse.py` บรรทัด 6

```python
__tablename__ = "nurse"      # ← singular
```

**ปัญหา:** ที่อื่นเป็น plural หมด (`users`, `patients`, `wounds`, `roles`) แต่ `nurse` เป็น singular → ไม่ consistent

**แก้:** เปลี่ยนเป็น `"nurses"` + รัน alembic migration

---

#### M2. `wound_record.py` — relationship ชื่อ `nurse` ชื่อผิด

**ไฟล์:** `app/models/wound_record.py` บรรทัด 18

```python
nurse = relationship("User", back_populates="records_added")
```

**ปัญหา:** ชื่อ `nurse` ชี้ไปที่ `User` model ไม่ใช่ `Nurse` model → สับสน

**แก้เป็น:**
```python
added_by = relationship("User", back_populates="records_added")
```

---

#### M3. `appointment.py` — ไม่มี nurse relationship

**ไฟล์:** `app/models/appointment.py`

**ปัญหา:** มี `nurse_user_id` FK แต่ไม่มี `relationship()` กลับไปที่ User

**แก้:** เพิ่ม relationship
```python
nurse = relationship("User")
```

---

#### M4. CORS ยืดหยุ่นเกินไป

**ไฟล์:** `main.py` บรรทัด 22-24

**ตอนนี้:**
```python
allow_methods=["*"],
allow_headers=["*"],
```

**ปัญหา:** อนุญาตทุก method + header → เสี่ยง

**แก้เป็น:**
```python
allow_methods=["GET", "POST", "PUT", "DELETE"],
allow_headers=["Authorization", "Content-Type"],
```

---

#### M5. ไม่มี logging framework

**ทั้งโปรเจต** ใช้แค่ `print()` ไม่มี `logging` module เลย

**สิ่งที่ควรทำ:** เพิ่ม logging ใน `main.py`:
```python
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
```

---

#### M6. ไม่มี rate limiting

**ไฟล์:** login endpoint

**ปัญหา:** ไม่มีการจำกัดจำนวนครั้งที่ login ได้ → brute-force ได้ง่าย

**สิ่งที่ควรทำ:** ติดตั้ง `slowapi` แล้วจำกัด login เช่น 5 ครั้ง/นาที

---

#### M7. `--extra-index-url` ไว้ท้าย requirements

**ไฟล์:** `server/requirements.txt` บรรทัด 23

**ตอนนี้:**
```
torch==2.3.1+cpu        # บรรทัด 15
torchvision==0.18.1+cpu # บรรทัด 16
...
--extra-index-url https://download.pytorch.org/whl/cpu  # บรรทัด 23 (ท้ายสุด)
```

**ปัญหา:** pip ควรเห็น `--extra-index-url` ก่อน package ที่ต้องใช้

**แก้:** ย้ายขึ้นบนสุดของไฟล์

---

#### M8. ไม่มี pool_size config

**ไฟล์:** `app/db/session.py` บรรทัด 5

```python
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
```

**ปัญหา:** `pool_size` default = 5 อาจไม่พอ production

**แก้เป็น:**
```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)
```

---

#### M9. `schemas/auth.py` — ไม่มี input validation

**ไฟล์:** `app/schemas/auth.py` บรรทัด 5-7

**ตอนนี้:**
```python
class UserLogin(BaseModel):
    username: str = Field(..., description="ชื่อผู้ใช้")
    password: str = Field(..., description="รหัสผ่าน")
```

**ปัญหา:** ไม่มี min_length, max_length → รับ empty string หรือ string ยาวมากๆ ได้

**แก้เป็น:**
```python
class UserLogin(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=128)
```

---

#### M10. `UserResponse.role` type ผิด

**ไฟล์:** `app/schemas/auth.py` บรรทัด 12

**ตอนนี้:**
```python
class UserResponse(BaseModel):
    role: str
```

**ปัญหา:** `role` ใน User model เป็น SQLAlchemy relationship object ไม่ใช่ string → Pydantic จะ error

**แก้เป็น:** ให้ `auth_service.py` ส่ง `role=user.role.role_name` มาเอง (ตอนนี้ทำอยู่แล้ว) → ไม่ต้องแก้ แต่ควรเพิ่ม comment อธิบาย

---

## Architecture — สิ่งที่ขาด (ตรงกับ roadmap)

| # | สิ่งที่ขาด | ตรงกับงาน roadmap |
|---|---|---|
| A1 | ไม่มี Patient CRUD endpoints | งานที่ 30-33 |
| A2 | ไม่มี Wound CRUD endpoints | งานที่ 34-36 |
| A3 | ไม่มี Scan/Record API | งานที่ 37-38 |
| A4 | ไม่มี Appointment API | งานที่ 39-41 |
| A5 | ML model ไม่ได้เชื่อมต่อ | งานที่ 11-27 |
| A6 | ไม่มี refresh token endpoint | งานที่ 42 |
| A7 | QR detector commented out | งานที่ 19-20 |

---

## ลำดับการแก้ไขที่แนะนำ

| ลำดับ | ข้อ | ทำอะไร | ใช้เวลา |
|---|---|---|---|
| 1 | C1 | สร้าง `.gitignore` ที่ root | 1 นาที |
| 2 | C3 | แก้ `.env` path เป็น absolute | 2 นาที |
| 3 | C4 | แก้ error message ไม่ให้ส่งต่อ client | 2 นาที |
| 4 | C5 | แก้ `alembic.ini` ให้ดึง DATABASE_URL จาก env | 1 นาที |
| 5 | C6 | เพิ่ม CMD ใน Dockerfile | 1 นาที |
| 6 | H1 | สร้าง `.dockerignore` | 1 นาที |
| 7 | H2 | แก้ static mount path | 2 นาที |
| 8 | H3 | แก้ tokenUrl ให้อิง settings | 1 นาที |
| 9 | H4 | เปลี่ยนชื่อ `schemas/init.py` → `__init__.py` | 1 นาที |
| 10 | H5 | แก้ seed.py ให้ log error | 1 นาที |
| 11 | H6 | เพิ่ม null check ใน dependencies.py | 1 นาที |
| 12 | H7 | เพิ่ม null check ใน auth_service.py | 1 นาที |
| 13 | H8 | อัพเดท bcrypt + python-jose ใน requirements.txt | 2 นาที |
| 14 | M1-M10 | แก้ Medium issues ทั้งหมด | 10 นาที |
| 15 | A1-A7 | เพิ่ม endpoints + ML pipeline | ตาม roadmap |

---

## สรุปคะแนน

| ด้าน | คะแนน | หมายเหตุ |
|---|---|---|
| Architecture | ดีมาก | แยก layer ชัดเจน ถูกหลัก |
| Code Quality | ดี | มี hardcode + error handling บางจุด |
| Security | ต้องแก้ | `.gitignore` + error message leak + password hardcode |
| Completeness | ยังขาดมาก | endpoints, ML pipeline, registration |
| Maintainability | ดี | แต่ไม่มี logging |

---

## ทดสอบหลังแก้เสร็จ

รัน server:
```bash
docker compose --file docker-compose.yml up --build api
```

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
curl -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"username\": \"admin\", \"password\": \"123456\"}"
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
