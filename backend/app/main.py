import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from app.routers import rooms, autocomplete  # keep your REST routers
from app.services.ws_manager import WSManager

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms.router)
app.include_router(autocomplete.router)

ws_manager = WSManager()


@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    """
    WS message contract:
    - client -> server:
        {"type":"join","clientId":"...","name":"..."}
        {"type":"update","clientId":"...","code":"..."}
        {"type":"cursor","clientId":"...","cursor":{...}}
    - server -> clients:
        {"type":"state","code":"...","meta":{...}}
        {"type":"presence","action":"join"|"leave","clientId":"...","name":"..."}
        {"type":"presence_list","participants":[{"clientId":"...","name":"..."}, ...]}
        {"type":"cursor","clientId":"...","cursor":{...}}
    """
    await ws_manager.connect(room_id, websocket)
    client_id = None
    client_name = None

    try:
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
            except Exception:
                # malformed message - ignore
                continue

            typ = msg.get("type")
            if typ == "join":
                new_client_id = msg.get("clientId")
                new_client_name = msg.get("name")
                if not new_client_id:
                    # Invalid join message - ignore
                    continue
                # Update local tracking
                client_id = new_client_id
                client_name = new_client_name
                # register participant server-side (by websocket connection)
                ws_manager.add_participant(room_id, websocket, client_id, client_name)
                # send current participants list to joining client (so it sees all existing participants including self)
                try:
                    participants = ws_manager.get_participants_list(room_id)
                    await websocket.send_text(json.dumps({"type": "presence_list", "participants": participants}))
                except Exception:
                    pass
                # broadcast join to other clients (so they add the new participant)
                await ws_manager._broadcast(
                    room_id,
                    {"type": "presence", "action": "join", "clientId": client_id, "name": client_name},
                    exclude=websocket,
                )

            elif typ == "update":
                code = msg.get("code", "")
                # Use client_id from message if provided, otherwise use tracked client_id
                update_client_id = msg.get("clientId") or client_id
                language = msg.get("language")
                # Only process if we have a valid client_id
                if update_client_id:
                    # apply update and broadcast state
                    await ws_manager.apply_update(room_id, code, client_id=update_client_id, language=language)

            elif typ == "cursor":
                # Use client_id from message if provided, otherwise use tracked client_id
                cursor_client_id = msg.get("clientId") or client_id
                cursor = msg.get("cursor", {})
                if cursor_client_id:
                    await ws_manager.broadcast_cursor(room_id, cursor_client_id, cursor)

            else:
                # ignore unknown message types
                pass

    except WebSocketDisconnect:
        # cleanup participant and notify others
        if client_id:
            await ws_manager._broadcast(room_id, {"type": "presence", "action": "leave", "clientId": client_id, "name": client_name})
        await ws_manager.disconnect(room_id, websocket, client_id, persist_on_disconnect=True)
    except Exception:
        # best-effort cleanup on unexpected errors
        if client_id:
            await ws_manager._broadcast(room_id, {"type": "presence", "action": "leave", "clientId": client_id, "name": client_name})
        await ws_manager.disconnect(room_id, websocket, client_id, persist_on_disconnect=True)
