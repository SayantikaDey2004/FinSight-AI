from pydantic_settings import BaseSettings
from functools import lru_cache
from dotenv import load_dotenv
import os
load_dotenv()

class Settings(BaseSettings):
    # Server
    PORT: int = 8000
    ENVIRONMENT: str = "development"

    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "fintech_auth"

    # JWT
    JWT_SECRET: str
    JWT_REFRESH_SECRET: str = ""   # Falls back to JWT_SECRET if not set
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @property
    def effective_refresh_secret(self) -> str:
        return self.JWT_REFRESH_SECRET or self.JWT_SECRET

    # Password Reset
    RESET_TOKEN_EXPIRE_MINUTES: int = 15

    # Email
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@fintechapp.com"
    MAIL_SERVER: str = "sandbox.smtp.mailtrap.io"
    MAIL_PORT: int = 2525
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    # Frontend
    CLIENT_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


@lru_cache()          # called once, cached forever — efficient
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
