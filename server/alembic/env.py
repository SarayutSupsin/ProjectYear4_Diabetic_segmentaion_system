import sys, os
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# 1. แทรกตำแหน่งโปรเจกต์ให้ระบบมองเห็นโมเดลในโฟลเดอร์ app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# 2. นำเข้าค่าความปลอดภัยและคลาสแม่โมเดลฐานข้อมูล
from app.core.config import settings
from app.db.base_class import Base
# อิมพอร์ต ตารางโมเดลทั้ง 8 ตารางให้ครบถ้วนเพื่อให้ Base.metadata รู้จักตาราง
from app.models import Role, User, Nurse, Patient, BodyPart, Wound, WoundRecord, Appointment

# ดึงออบเจกต์ตั้งค่าของ Alembic
config = context.config

# สั่งบันทึกทับ DATABASE_URL ให้แอบดึงความลับจากไฟล์ .env นอกสุดอัตโนมัติ
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# ตั้งค่า Logging ระบบแจ้งสถานะคอนโซล
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# กำหนดเป้าหมาย metadata สำหรับสแกนตารางแบบอัตโนมัติ
target_metadata = Base.metadata

#สั่งทำ Migration ในโหมดออฟไลน์ (สำหรับแปลงโครงสร้างเป็นสคริปต์ SQL)
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

#สั่งทำ Migration ในโหมดออนไลน์ (รันยิงสเปกคำสั่งเข้าหาฐานข้อมูล PostgreSQL จริง)
def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


# ตรวจดูว่าแอปเปิดรันออฟไลน์หรือออนไลน์ แล้วส่งไปทำฟังก์ชันที่ถูกต้อง
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
