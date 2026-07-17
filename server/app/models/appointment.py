import datetime
from sqlalchemy import Column, Integer, String, Date, Time, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Appointment(Base):
    __tablename__ = "appointments"
    appointment_id = Column(Integer, primary_key=True, autoincrement=True)
    HN = Column(String(50), ForeignKey("patients.HN"), nullable=False)
    nurse_user_id = Column(String(10), ForeignKey("users.user_id"), nullable=False)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    
    patient = relationship("Patient", back_populates="appointments")