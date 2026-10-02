import datetime
import uuid
from sqlalchemy import Column, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Patient(Base):
    __tablename__ = "patients"
    HN = Column(String(50), primary_key=True, index=True)
    public_id = Column(String(36), unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(10), ForeignKey("users.user_id"), nullable=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    birth_date = Column(Date, nullable=True)
    gender = Column(String(10), nullable=True)
    phone = Column(String(20), nullable=True)
    admit_date = Column(Date, default=datetime.date.today)

    user = relationship("User", back_populates="patient_profile")
    wounds = relationship("Wound", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")
    
