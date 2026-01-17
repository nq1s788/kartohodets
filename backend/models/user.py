from xmlrpc.client import Boolean

from sqlalchemy import Column, Integer, String
from .database import Base


class User(Base):
    __tablename__ = "Users"

    id = Column(Integer, primary_key=True, notnull=True)
    email = Column(String, notnull=True, unique=True)
    elo = Column(Integer)
    matches = Column(Integer)
    coord = Column(String)
    room_id = Column(Integer, foreign_key="Rooms.id")
    temp_elo = Column(Integer)
    is_ready = Column(Boolean)


