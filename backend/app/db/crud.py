from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Room
from typing import Optional, List

async def get_room(session: AsyncSession, room_id: str) -> Optional[Room]:
    q = await session.execute(select(Room).where(Room.id == room_id))
    return q.scalars().first()

async def list_rooms(session: AsyncSession, limit: int = 100, offset: int = 0) -> List[Room]:
    q = await session.execute(select(Room).limit(limit).offset(offset))
    return q.scalars().all()

async def create_room(session: AsyncSession, room_id: Optional[str] = None, language: str = "python") -> Room:
    r = Room(id=room_id) if room_id else Room()
    r.language = language
    session.add(r)
    await session.commit()
    await session.refresh(r)
    return r

async def update_room_code(session: AsyncSession, room_id: str, code: str) -> Optional[Room]:
    r = await get_room(session, room_id)
    if not r:
        return None
    r.code = code
    session.add(r)
    await session.commit()
    await session.refresh(r)
    return r

async def update_room_language(session: AsyncSession, room_id: str, language: str) -> Optional[Room]:
    r = await get_room(session, room_id)
    if not r:
        return None
    r.language = language
    session.add(r)
    await session.commit()
    await session.refresh(r)
    return r

async def delete_room(session: AsyncSession, room_id: str) -> bool:
    r = await get_room(session, room_id)
    if not r:
        return False
    await session.delete(r)
    await session.commit()
    return True
