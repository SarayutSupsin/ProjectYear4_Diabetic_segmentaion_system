import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.db.session import SessionLocal
from app.models import Role, BodyPart

def seed_initial_data():
    db = SessionLocal()
    try:
        role_data = [
            Role(role_id="ADMIN", role_name="admin"),
            Role(role_id="NURSE", role_name="nurse"),
            Role(role_id="PATIENT", role_name="patient")
        ]

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

        for role in role_data:
            if not db.query(Role).filter_by(role_id=role.role_id).first():
                db.add(role)
        for bodypart in bodypart_data:
            if not db.query(BodyPart).filter_by(body_part_id=bodypart.body_part_id).first():
                db.add(bodypart)
        db.commit()
        print("** Roles and Body Parts data successfully entered! **")
    except Exception as e:
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_initial_data()