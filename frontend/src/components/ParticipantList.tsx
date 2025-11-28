import React from "react";
import { getShortClientId } from "../utils/identity";

export interface ParticipantDisplay {
  clientId: string;
  name?: string;
  color?: string;
}

interface ParticipantListProps {
  participants: ParticipantDisplay[];
}

const ParticipantList: React.FC<ParticipantListProps> = ({ participants }) => {
  return (
    <div className="participant-list">
      <h4>Participants ({participants.length})</h4>
      <div>
        {participants.map((participant) => (
          <div key={participant.clientId} className="participant-item">
            <div
              className="participant-avatar"
              style={{ backgroundColor: participant.color || "#999" }}
            >
              {(participant.name ?? "A")[0].toUpperCase()}
            </div>
            <div className="participant-name">
              <div style={{ fontWeight: 600 }}>{participant.name ?? "Anonymous"}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {getShortClientId(participant.clientId)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantList;

