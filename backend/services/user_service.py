from pydantic_core.core_schema import none_schema
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import desc

from backend.models.user import User

class UserService:
    @staticmethod
    def get_user(db: Session, user_id: int):
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str):
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_empty_id(db: Session):
        return db.query(User).count()

    @staticmethod
    def get_leaderboard_and_stats(db: Session, email: str):
        user = User.get_user_by_email(db, email)
        if not user:
            return None
        users = db.query(User).order_by(desc(User.elo)).all()
        rank = 0
        for user in users:
            rank += 1
            if user.email == email:
                break
        stats = {'rank': rank, 'score': user.elo, 'games': user.matches}
        leaderboard = []
        for user in users:
            leaderboard.append({
                'name': user.email[:user.email.find('@')],
                'score': user.elo,
            })
        return {'user': stats, 'top': leaderboard}


    @staticmethod
    def create_user(db: Session, email: str):
        user = User(email=email, id=User.get_emptyid(db))
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def add_user_to_room(db: Session, email: str, room_id: int):
        user = User.get_user_by_email(db, email)
        if not user:
            return None
        user.room_id = room_id
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_coord(db: Session, email: str, coord_x: float, coord_y: float ):
        user = User.get_user_by_email(db, email)
        if not user:
            return None
        user.coord = str(coord_x) + ' ' + str(coord_y)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_coord(db: Session, email: str):
        user = User.get_user_by_email(db, email)
        if not user:
            return None
        return map(float, user.coord.split())

    @staticmethod
    def get_elo(db: Session, email: str):
        user = User.get_user_by_email(db, email)
        if not user:
            return None
        return user.elo

    @staticmethod
    def update_and_return_elo(db: Session, email: str, km: int, winner: bool):
        user = User.get_user_by_email(db, email)
        user.sum_km += km
        user.matches += 1
        user.elo = user.sum_km / user.matches + (10 if winner else 0)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.elo