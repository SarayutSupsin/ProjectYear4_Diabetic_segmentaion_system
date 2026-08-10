from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os

from app.core.config import settings
from app.db.session import get_db
from app.models import Role, User, Nurse, Patient, BodyPart, Wound, WoundRecord, Appointment

from app.api.v1.endpoints import auth, patientResponse, wounds, appointment, nurses

os.makedirs(settings.STATIC_DIR, exist_ok=True)

app = FastAPI(title=settings.PROJECT_NAME)
# add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

# add Router
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(patientResponse.router, prefix="/api/v1/patients",tags=["patients"])
app.include_router(wounds.router, prefix="/api/v1/wounds", tags=["wounds"])
app.include_router(appointment.router, prefix="/api/v1/appointment", tags=["appointment"])
app.include_router(nurses.router, prefix="/api/v1/nurses", tags=["nurses"])
#test
@app.get("/")
def read_root():
    return {"message": "FastAPI And SQLAlchemy Connected!!!"}

@app.get("/test-db-connection")
def test_db_connection(db:Session=Depends(get_db)):
    parts = db.query(BodyPart).all()
    return [{"id": p.body_part_id, "name": p.body_part_name} for p in parts]



