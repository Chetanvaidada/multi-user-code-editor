from pydantic import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str
    ALLOWED_ORIGINS: str = ""
    DEBUG: bool = False
    SAVE_DEBOUNCE_SECONDS: float = 2.0
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
    
    @property
    def allowed_origins_list(self) -> list:
        """Parse comma-separated ALLOWED_ORIGINS into a list"""
        if not self.ALLOWED_ORIGINS:
            return []
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

settings = Settings()
