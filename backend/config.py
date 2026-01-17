import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Database
    DB_HOST = os.getenv("DB_HOST")
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

    # App
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")

    # CORS
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


config = Config()