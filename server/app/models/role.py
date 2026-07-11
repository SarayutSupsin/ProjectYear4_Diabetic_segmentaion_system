from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Role(Base):
    __tablename__ = "roles"
    role_id = Column(String(10), primary_key=True)
    role_name = Column(String(20), nullable=False)

    users = relationship("User", back_populates="role")

