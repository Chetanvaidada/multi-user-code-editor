import React from "react";
import { getShortClientId } from "../utils/identity";
import { ParticipantDisplay } from "./ParticipantList";

interface LastUpdatedIndicatorProps {
  lastUpdatedBy: string | null;
  participants: ParticipantDisplay[];
}

const LastUpdatedIndicator: React.FC<LastUpdatedIndicatorProps> = ({ lastUpdatedBy, participants }) => {
  const label = React.useMemo(() => {
    if (!lastUpdatedBy) return "n/a";
    const participant = participants.find((p) => p.clientId === lastUpdatedBy);
    const participantName = participant?.name || "Anon";
    const shortId = getShortClientId(lastUpdatedBy);
    return `${participantName} (${shortId})`;
  }, [lastUpdatedBy, participants]);

  return (
    <div className="last-updated">
      Last updated by: {label}
    </div>
  );
};

export default LastUpdatedIndicator;

