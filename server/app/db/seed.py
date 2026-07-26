import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.db.session import SessionLocal
from app.models import Role, BodyPart, User, Nurse
from app.core.security import get_password_hash

def seed_initial_data():
    db = SessionLocal()
    try:
        # 1. Seed Roles
        role_data = [
            Role(role_id="ADMIN", role_name="admin"),
            Role(role_id="NURSE", role_name="nurse"),
            Role(role_id="PATIENT", role_name="patient")
        ]
        for role in role_data:
            if not db.query(Role).filter_by(role_id=role.role_id).first():
                db.add(role)
        
        # 2. Seed Body Parts
        bodypart_data = [
            BodyPart(body_part_id="BP001", body_part_name="Dorsum (หลังเท้า)"),
            BodyPart(body_part_id="BP002", body_part_name="Toes (นิ้วเท้า)"),
            BodyPart(body_part_id="BP003", body_part_name="Plantar-Forefoot (ฝ่าเท้าส่วนหน้า/เนินปลายเท้า)"),
            BodyPart(body_part_id="BP004", body_part_name="Plantar-Midfoot (ฝ่าเท้าส่วนกลาง/อุ้งเท้า)"),
            BodyPart(body_part_id="BP005", body_part_name="Plantar-Heel (ฝ่าเท้าส่วนหลัง/ส้นเท้า)"),
            BodyPart(body_part_id="BP006", body_part_name="Plantar-Whole (ฝ่าเท้าทั้งหมด/แผ่ขยายวงกว้าง)"),
            BodyPart(body_part_id="BP007", body_part_name="Foot Borders (ขอบข้างเท้า)"),
            BodyPart(body_part_id="BP008", body_part_name="Ankle & Malleoli (ข้อเท้าและตาตุ่ม)")
        ]
        for bodypart in bodypart_data:
            if not db.query(BodyPart).filter_by(body_part_id=bodypart.body_part_id).first():
                db.add(bodypart)
                
        db.commit()

        # 3. Seed Default Users & Profiles
        # 3.1 Nurse Account (username: nurse1, password: password123)
        nurse_user = db.query(User).filter_by(username="nurse1").first()
        if not nurse_user:
            nurse_user = User(
                user_id="U001",
                username="nurse1",
                password=get_password_hash("password123"),
                role_id="NURSE"
            )
            db.add(nurse_user)
            db.commit()
            
            nurse_profile = Nurse(
                user_id="U001",
                first_name="สมศรี",
                last_name="รักรักษา",
                department="แผนกผู้ป่วยนอกเบาหวาน"
            )
            db.add(nurse_profile)
            db.commit()

        # 3.2 Admin Account (username: admin1, password: admin123)
        admin_user = db.query(User).filter_by(username="admin1").first()
        if not admin_user:
            admin_user = User(
                user_id="U002",
                username="admin1",
                password=get_password_hash("admin123"),
                role_id="ADMIN"
            )
            db.add(admin_user)
            db.commit()

        print("** Default Roles, Body Parts, and User Accounts successfully seeded! **")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_initial_data()