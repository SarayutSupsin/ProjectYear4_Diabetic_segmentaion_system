from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List
import os

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Role, User, Nurse, Patient, BodyPart, Wound, WoundRecord, Appointment

from pydantic import BaseModel

os.makedirs(settings.STATIC_DIR, exist_ok=True)

app = FastAPI(title=settings.PROJECT_NAME)

app.mount("/static", StaticFiles(directory="static"), name="static")
class LoginRequest(BaseModel):
    username: str
    password: str

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

@app.post("/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.username == data.username
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Username not found"
        )

    if user.password != data.password:
        raise HTTPException(
            status_code=401,
            detail="Password incorrect"
        )

    return {
        "message": "Login success",
        "user": {
            "id": user.user_id,
            "username": user.username,
            "role_id": user.role_id
        }
    }

@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()

    return [
        {
            "user_id": u.user_id,
            "username": u.username,
            "password": u.password,
            "role_id": u.role_id
        }
        for u in users
    ]

