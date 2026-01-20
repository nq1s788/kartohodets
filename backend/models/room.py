from sqlalchemy import Column, Integer, String, Time
from .database import Base


class Room(Base):
    __tablename__ = "Rooms"

    id = Column(Integer, primary_key=True, notnull=True)
    pan_id = Column(String)
    host_id = Column(Integer, foreign_key="Users.id")

