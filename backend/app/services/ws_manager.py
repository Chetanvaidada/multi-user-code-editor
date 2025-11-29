import asyncio
import json
import time
from typing import Dict, Set, Any, Optional, List

from fastapi import WebSocket

from app.db import crud
from app.db.base import AsyncSessionLocal
from config import settings

SAVE_DEBOUNCE_SECONDS = float(getattr(settings, "SAVE_DEBOUNCE_SECONDS", 2.0))


class RoomState:
    def __init__(self):
        self.code: str = ""
        self.clients: Set[WebSocket] = set()
        self.lock = asyncio.Lock()
        self.meta: Dict[str, Any] = {}  # e.g. lastUpdatedBy, language
        self._dirty: bool = False
        self._last_edit_ts: float = 0.0
        self._save_task: Optional[asyncio.Task] = None
        self._loaded: bool = False  # Track if data has been loaded from DB
        # Track participants by WebSocket connection to handle duplicate client_ids
        # Map: WebSocket -> (client_id, name)
        self.connection_participants: Dict[WebSocket, tuple[str, str]] = {}

    def mark_dirty(self):
        self._dirty = True
        self._last_edit_ts = time.time()

    def clear_dirty(self):
        self._dirty = False
        self._last_edit_ts = 0.0

    def cancel_save_task(self):
        if self._save_task and not self._save_task.done():
            self._save_task.cancel()
            self._save_task = None


class WSManager:
    def __init__(self):
        self.rooms: Dict[str, RoomState] = {}

    def _ensure(self, room_id: str) -> RoomState:
        if room_id not in self.rooms:
            self.rooms[room_id] = RoomState()
        return self.rooms[room_id]

    # -----------------------
    # Participant helpers
    # -----------------------
    def add_participant(self, room_id: str, websocket: WebSocket, client_id: str, name: Optional[str]):
        room = self._ensure(room_id)
        if client_id and websocket:
            room.connection_participants[websocket] = (client_id, name or "")

    def remove_participant(self, room_id: str, websocket: WebSocket):
        room = self._ensure(room_id)
        if websocket in room.connection_participants:
            room.connection_participants.pop(websocket, None)

    def get_participants_list(self, room_id: str) -> List[Dict[str, Optional[str]]]:
        room = self._ensure(room_id)
        # Return all participants (each connection now has a unique client_id from frontend)
        return [{"clientId": client_id, "name": name} for client_id, name in room.connection_participants.values()]

    # -----------------------
    # Connection lifecycle
    # -----------------------
    async def connect(self, room_id: str, websocket: WebSocket):
        room = self._ensure(room_id)
        await websocket.accept()
        room.clients.add(websocket)
        
        print(f"🔴 [Backend] Client connected to room {room_id}")
        print(f"🔴 [Backend] Total clients now: {len(room.clients)}")
        print(f"🔴 [Backend] Current room.code: {repr(room.code)}")
        print(f"🔴 [Backend] Current room.meta: {room.meta}")
        print(f"🔴 [Backend] Room already loaded: {room._loaded}")
        
        # Load persisted room data from database if not yet loaded
        # Use _loaded flag instead of checking client count to handle multiple simultaneous connections
        if not room._loaded:
            print(f"🔴 [Backend] Loading from DB (first time)...")
            try:
                async with AsyncSessionLocal() as session:
                    existing = await crud.get_room(session, room_id)
                    if existing:
                        print(f"🔴 [Backend] Found in DB - code: {repr(existing.code)}, language: {existing.language}")
                        # Load persisted code and language
                        room.code = existing.code or ""
                        room.meta["language"] = existing.language or "python"
                    else:
                        print(f"🔴 [Backend] Room not found in DB, starting fresh")
                    # Mark as loaded regardless of whether we found it in DB
                    room._loaded = True
            except Exception as exc:
                # Log error but continue - room will just start empty
                print(f"[WSManager.connect] failed to load room {room_id}: {exc}")
                # Still mark as loaded to prevent retry loops
                room._loaded = True
        else:
            print(f"🔴 [Backend] Skipping DB load - already loaded")
        
        # send initial state to the connecting client
        print(f"🔴 [Backend] Sending initial state: code={repr(room.code)}, meta={room.meta}")
        try:
            await websocket.send_text(json.dumps({"type": "state", "code": room.code, "meta": room.meta}))
            # also send the current participants list so the joining client sees everyone
            participants = self.get_participants_list(room_id)
            await websocket.send_text(json.dumps({"type": "presence_list", "participants": participants}))
            print(f"🔴 [Backend] Initial state sent successfully")
        except Exception as e:
            # Best-effort; don't fail connect if send fails
            print(f"🔴 [Backend] Failed to send initial state: {e}")
            pass

    async def disconnect(self, room_id: str, websocket: WebSocket, client_id: Optional[str] = None, persist_on_disconnect: bool = True):
        room = self._ensure(room_id)
        room.clients.discard(websocket)
        # Remove participant by websocket connection
        self.remove_participant(room_id, websocket)

        # If no clients left -> try to persist and cleanup
        if not room.clients:
            room.cancel_save_task()
            if persist_on_disconnect:
                # attempt one last persist (await it to increase chance of success)
                await self._persist_room_now(room_id, room.code, room.meta.get("language"), room.meta.get("lastUpdatedBy"))
            # remove room from memory
            self.rooms.pop(room_id, None)

    # -----------------------
    # Apply updates & persistence
    # -----------------------
    async def apply_update(self, room_id: str, code: str, client_id: Optional[str] = None, language: Optional[str] = None):
        room = self._ensure(room_id)
        async with room.lock:
            room.code = code
            if client_id:
                room.meta["lastUpdatedBy"] = client_id
            if language:
                room.meta["language"] = language
            room.mark_dirty()

            # debounce persistence: cancel previously scheduled save and schedule a new one
            room.cancel_save_task()
            loop = asyncio.get_running_loop()
            room._save_task = loop.create_task(self._debounced_save(room_id, SAVE_DEBOUNCE_SECONDS))

        # broadcast the new state to ALL clients (including originator; client will decide to ignore if needed)
        await self._broadcast(room_id, {"type": "state", "code": room.code, "meta": room.meta})

    async def _debounced_save(self, room_id: str, debounce_seconds: float):
        room = self._ensure(room_id)
        try:
            await asyncio.sleep(debounce_seconds)
            now = time.time()
            if (now - room._last_edit_ts) >= debounce_seconds and room._dirty:
                # run DB persistence in background to avoid blocking
                asyncio.create_task(self._persist_room_now(room_id, room.code, room.meta.get("language"), room.meta.get("lastUpdatedBy")))
                room.clear_dirty()
        except asyncio.CancelledError:
            return

    async def _persist_room_now(self, room_id: str, code: str, language: Optional[str] = "python", last_updated_by: Optional[str] = None):
        try:
            async with AsyncSessionLocal() as session:
                existing = await crud.get_room(session, room_id)
                if existing:
                    await crud.update_room_code(session, room_id, code)
                    # Also update language if provided
                    if language:
                        await crud.update_room_language(session, room_id, language)
                else:
                    # create with explicit id (crud.create_room should accept room_id optional param)
                    # If your crud.create_room signature differs, adapt accordingly.
                    await crud.create_room(session, room_id=room_id, language=language or "python")
                    await crud.update_room_code(session, room_id, code)
        except Exception as exc:
            # replace with proper logging in production
            print(f"[WSManager.persist] failed to persist room {room_id}: {exc}")

    # -----------------------
    # Broadcast helpers
    # -----------------------
    async def broadcast_cursor(self, room_id: str, client_id: str, cursor: dict):
        await self._broadcast(room_id, {"type": "cursor", "clientId": client_id, "cursor": cursor})

    async def _broadcast(self, room_id: str, message: dict, exclude: Optional[WebSocket] = None):
        room = self._ensure(room_id)
        data = json.dumps(message)
        to_remove: Set[WebSocket] = set()
        for ws in list(room.clients):
            if ws == exclude:
                continue
            try:
                await ws.send_text(data)
            except Exception:
                # collect closed/broken websockets to remove them
                to_remove.add(ws)
        for ws in to_remove:
            room.clients.discard(ws)
