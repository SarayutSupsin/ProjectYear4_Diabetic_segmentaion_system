import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class WoundRecord(Base):
    __tablename__ = "wound_records"
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    wound_id = Column(String(10), ForeignKey("wounds.wound_id"), nullable=False)
    user_id = Column(String(10), ForeignKey("users.user_id"), nullable=False)
    image_path = Column(String(255), nullable=False)
    area_pixel = Column(Integer, nullable=False)
    area_cm2 = Column(Float, nullable=False)
    record_date = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    note = Column(Text, nullable=True)
    
    wound = relationship("Wound", back_populates="records")
    nurse = relationship("User", back_populates="records_added")