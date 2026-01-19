from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import desc

from backend.models.room import Room
from backend.models.user import User

class RoomService:
    @staticmethod
    def get_room_by_id(db: Session, id: int):
        return db.query(Room).filter(Room.id == id).first()

    @staticmethod
    def get_empty_id(db: Session):
        x = db.query(Room).count()
        x = x * (10 ** (6 - len(str(x))))
        return x % 1000000

    @staticmethod
    def create_room(db: Session, host_email:str):
        host = User.get_user_by_email(db, host_email)
        if not host:
            return None
        room = Room(id = Room.get_empty_id(db), host_email = host_email)
        db.add(room)
        db.commit()
        db.refresh(room)
        return room


    @staticmethod
    def update_pan_id(db: Session, room_id: int, new_pan_id: int):
        room = Room.get_room_by_id(db, room_id)
        if not room:
            return None
        room.pan_id = new_pan_id
        db.commit()
        db.refresh(room)
        return room

    @staticmethod
    def get_all_users_with_coord(db: Session, room_id: int):
        room = Room.get_room_by_id(db, room_id)
        users = db.query(User).filter(User.room_id == room.id).all()
        results = []
        for user in users:
            results.append({'name': user.email[:user.email.find('@')],
                            'coord': tuple(map(float, user.coord.split()))})
        return results

    @staticmethod
    def get_all_users_with_coord_and_tempelo(db: Session, room_id: int):
        room = Room.get_room_by_id(db, room_id)
        users = db.query(User).filter(User.room_id == room.id).all()
        results = []
        for user in users:
            results.append({'name': user.email[:user.email.find('@')],
                            'coord': tuple(map(float, user.coord.split())),
                            'temp_score': user.temp_elo})
        return results