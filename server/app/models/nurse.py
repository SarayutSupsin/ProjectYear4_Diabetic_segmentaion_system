from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Nurse(Base):
    __tablename__= "nurse"
    user_id = Column(String(10), ForeignKey("users.user_id"), primary_key=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    department = Column(String(100), nullable=False)

    user = relationship("User", back_populates="nurse_profile")
    
