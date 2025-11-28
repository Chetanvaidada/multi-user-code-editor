from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class RoomCreate(BaseModel):
    language: Optional[str] = "python"

class RoomOut(BaseModel):
    id: str
    code: str
    language: str
    last_updated_at: Optional[datetime] = None 

    class Config:
        orm_mode = True

class RoomUpdateCode(BaseModel):
    code: str

class RoomUpdateLanguage(BaseModel):
    language: str
