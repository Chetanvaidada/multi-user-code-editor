from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.schemas.room import RoomCreate, RoomOut, RoomUpdateCode, RoomUpdateLanguage
from app.deps import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db import crud

router = APIRouter(prefix="/rooms", tags=["rooms"])

@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
async def create_room(payload: RoomCreate, db: AsyncSession = Depends(get_db)):
    room = await crud.create_room(db, language=payload.language)
    return room

@router.get("", response_model=List[RoomOut])
async def read_rooms(limit: int = Query(50, ge=1, le=1000), offset: int = Query(0, ge=0), db: AsyncSession = Depends(get_db)):
    rooms = await crud.list_rooms(db, limit=limit, offset=offset)
    return rooms

@router.get("/{room_id}", response_model=RoomOut)
async def read_room(room_id: str, db: AsyncSession = Depends(get_db)):
    room = await crud.get_room(db, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@router.patch("/{room_id}/code", response_model=RoomOut)
async def update_room_code_endpoint(room_id: str, payload: RoomUpdateCode, db: AsyncSession = Depends(get_db)):
    room = await crud.update_room_code(db, room_id, payload.code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@router.patch("/{room_id}/language", response_model=RoomOut)
async def update_room_language_endpoint(room_id: str, payload: RoomUpdateLanguage, db: AsyncSession = Depends(get_db)):
    room = await crud.update_room_language(db, room_id, payload.language)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room_endpoint(room_id: str, db: AsyncSession = Depends(get_db)):
    ok = await crud.delete_room(db, room_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Room not found")
    return None
