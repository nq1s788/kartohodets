from typing import Dict, List
from fastapi import WebSocket, Depends
from sqlalchemy import true, false
from sqlalchemy.orm import Session
from sqlalchemy.testing import db

from backend.models.database import get_db
from backend.services.room_service import RoomService
from backend.services.user_service import UserService


class ConnectionManager:
    def __init__(self):
        # lobby_code → список WebSocket соединений
        self.active_lobbies: Dict[int, List[WebSocket]] = {}
    async def connect_to_lobby(self, websocket: WebSocket, lobby_code: int, email: str):
        await websocket.accept()
        self.active_lobbies[lobby_code].append(websocket)

        # Уведомляем всех в лобби о новом игроке
        await self.broadcast_to_lobby(lobby_code, {
            "type": "PlayerAdded",
            "text": email
            }
        )
        players = RoomService.get_all_users(db, lobby_code)
        await self.broadcast_to_lobby(lobby_code,{
            "type": "init_lobby",
            "players": players
        })

    async def disconnect_from_lobby(self, websocket: WebSocket, lobby_code: int, email: str):
        UserService.zero_temp_score(db, email)
        UserService.remove_user_from_room(db, email)
        self.active_lobbies[lobby_code].remove(websocket)

    async def broadcast_to_lobby(self, lobby_code: int, message: dict):
        if lobby_code in self.active_lobbies:
            for connection in self.active_lobbies[lobby_code]:
                await connection.send_json(message)

    async def handle_start_game(self, lobby_code: int):
        await self.broadcast_to_lobby(lobby_code, {"game_started": true})

    async def handle_pano_id(self, lobby_code: int, pano_id: int, db: Session = Depends(get_db)):
       RoomService.update_pan_id(db, lobby_code, pano_id)
       await self.broadcast_to_lobby(lobby_code, {
           "type": 'pano_id',
           "pano_id": pano_id
       })

    async def handle_first_ans(self, lobby_code: int):
        await self.broadcast_to_lobby(lobby_code, {"type": 'first_ans'})

    async def handle_my_res(self, lobby_code: int, email: str, lat: int, lng: int, distance: int):
        UserService.update_coord(db, email, lat, lng)
        UserService.update_temp_score(db, email, distance)
        UserService.update_and_return_elo(db, email, distance)

        results = RoomService.get_all_users_with_coord_and_tempelo(db, lobby_code)
        message = {
            "type": 'round_result',
            "results": results
        }
        await self.broadcast_to_lobby(lobby_code, message)

    async def handle_game_reset(self, lobby_code: int):
        await self.broadcast_to_lobby(lobby_code, {"type": 'game_reset'})





connection_manager = ConnectionManager()