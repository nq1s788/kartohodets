from sqlalchemy import Column, Integer, String, Boolean
from .database import Base


class User(Base):
    __tablename__ = "Users"

    id = Column(Integer, primary_key=True, nullable=False)
    email = Column(String, nullable=False, unique=True)
    elo = Column(Integer)
    matches = Column(Integer)
    coord = Column(String)
    room_id = Column(Integer, foreign_key="Rooms.id")
    sum_km = Column(Integer)
    temp_elo = Column(Integer)


