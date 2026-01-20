from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from config import config
from endpoints import auth
from websocket import room_ws

# Create tables on startup
from models.database import Base, engine
Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(room_ws.router)


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )