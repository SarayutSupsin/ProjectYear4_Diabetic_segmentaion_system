from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List
import os

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Role, User, Nurse, Patient, BodyPart, Wound, WoundRecord, Appointment


os.makedirs(settings.STATIC_DIR, exist_ok=True)

app = FastAPI(title=settings.PROJECT_NAME)

app.mount("/static", StaticFiles(directory="static"), name="static")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "FastAPI And SQLAlchemy Connected!!!"}

@app.get("/test-db-connection")
def test_db_connection(db:Session=Depends(get_db)):
    parts = db.query(BodyPart).all()
    return [{"id": p.body_part_id, "name": p.body_part_name} for p in parts]

