import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { setRoomId } from "../features/room/roomSlice";

const API_BASE = process.env.REACT_APP_API_BASE!;

const RoomActions: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const userName = useAppSelector((s) => s.user.name);
  const [existingId, setExistingId] = useState("");
  const [loading, setLoading] = useState(false);

  if (!userName) {
    // If user hasn't set a name, go back to landing
    navigate("/");
    return null;
  }

  const createRoom = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "python" }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create room");
      }
      const data = await res.json();
      const roomId = data.id ?? data.roomId ?? data.room_id ?? data.roomId;
      // set in store and navigate
      dispatch(setRoomId(roomId));
      navigate(`/room/${roomId}`);
    } catch (err: any) {
      alert("Error creating room: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = () => {
    const id = existingId.trim();
    if (!id) return alert("Please enter a room ID");
    dispatch(setRoomId(id));
    navigate(`/room/${id}`);
  };

  return (
    <div className="room-actions-container">
      <div className="room-actions-header">
        <h2>Welcome, {userName} 👋</h2>
      </div>

      <div className="room-actions-card">
        <button className="btn-primary btn-large" onClick={createRoom} disabled={loading} style={{ width: '100%' }}>
          {loading ? "Creating..." : "Create New Room"}
        </button>
      </div>

      <div className="room-actions-card">
        <label>
          Or join an existing room:
          <input
            type="text"
            placeholder="Enter room ID"
            value={existingId}
            onChange={(e) => setExistingId(e.target.value)}
          />
        </label>
        <button className="btn-secondary" onClick={joinRoom} style={{ width: '100%' }}>Join Room</button>
      </div>
    </div>
  );
};

export default RoomActions;
