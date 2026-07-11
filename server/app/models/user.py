import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class User(Base):
    __tablename__ = "users"
    user_id = Column(String(10), primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role_id = Column(String(10), ForeignKey("roles.role_id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    role = relationship("Role", back_populates="users")
    nurse_profile = relationship("Nurse", uselist=False, back_populates="user")
    patient_profile = relationship("Patient", uselist=False, back_populates="user")
    records_added = relationship("WoundRecord", back_populates="nurse")

