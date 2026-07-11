from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.db.base_class import Base
 
class BodyPart(Base):
    __tablename__ = "body_parts"
    body_part_id = Column(String(5), primary_key=True)
    body_part_name = Column(String(50), nullable=False)

    wounds = relationship("Wound", back_populates="body_part")

