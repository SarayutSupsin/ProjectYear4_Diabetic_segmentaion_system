import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Wound(Base):
    __tablename__ = "wounds"
    wound_id = Column(String(10), primary_key=True)
    HN = Column(String(50), ForeignKey("patients.HN"), nullable=False)
    body_part_id = Column(String(5), ForeignKey("body_parts.body_part_id"), nullable=False)
    side = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    patient = relationship("Patient", back_populates="wounds")
    body_part = relationship("BodyPart", back_populates="wounds")
    records = relationship("WoundRecord", back_populates="wound")