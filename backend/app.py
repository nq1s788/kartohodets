from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from config import config

# Import controllers
from controllers import users, auth
from websocket.handler import websocket_endpoint

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

# Include controllers
app.include_router(users.router, prefix="/api")
app.include_router(auth.router, prefix="/api")

# WebSocket route
@app.websocket("/ws")
async def websocket_route(websocket: WebSocket):
    await websocket_endpoint(websocket)

# Health check
@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )