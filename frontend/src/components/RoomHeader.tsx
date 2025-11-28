import React from "react";

interface RoomHeaderProps {
  roomId: string;
  name?: string | null;
  status: "disconnected" | "connecting" | "connected";
  onLeave: () => void;
}

const RoomHeader: React.FC<RoomHeaderProps> = ({ roomId, name, status, onLeave }) => {
  return (
    <div className="room-header">
      <div className="room-header-content">
        <div className="room-info">
          <h3 style={{ margin: 0 }}>Room: {roomId}</h3>
          <div className="status-indicator">
            <div className={`status-dot ${status}`} />
            <span>{status}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <strong>{name}</strong>
          <button className="btn-secondary" onClick={onLeave}>
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomHeader;

