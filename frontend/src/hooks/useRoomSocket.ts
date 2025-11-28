// src/hooks/useRoomSocket.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { RoomSocket } from "../services/roomSocket";

export interface Participant {
  clientId: string;
  name?: string;
  color?: string;
}

const PALETTE = [
  "#EF4444", // red
  "#F97316", // orange
  "#EAB308", // yellow
  "#10B981", // green
  "#06B6D4", // teal
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#374151", // gray
];

function hashStringToIndex(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % mod;
}

export function useRoomSocket(roomId: string | undefined, clientId: string, name?: string) {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);
  const [code, setCode] = useState<string>("");
  const [language, setLanguage] = useState<string>("python");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const sockRef = useRef<RoomSocket | null>(null);

  const socket = useMemo(() => {
    if (!roomId) return null;
    return new RoomSocket(roomId, clientId, name, {
      onMessage: (m) => {
        if (m.type === "state") {
          const stateMsg = m as any;
          setLastUpdatedBy(stateMsg.meta?.lastUpdatedBy ?? stateMsg.lastUpdatedBy ?? null);
          // Update code when receiving state from server
          // Always update if code is defined (including empty strings)
          // Use !== undefined to explicitly handle empty strings
          if (stateMsg.code !== undefined) {
            setCode(stateMsg.code);
          }
          // Update language from server state
          if (stateMsg.meta?.language) {
            setLanguage(stateMsg.meta.language);
          }
        }
      },
      onOpen: () => setStatus("connected"),
      onClose: () => setStatus("disconnected"),
      onPresence: (list) => {
        const withColors = list.map((p) => ({
          clientId: p.clientId,
          name: p.name,
          color: PALETTE[hashStringToIndex(p.clientId, PALETTE.length)],
        }));
        setParticipants(withColors);
      },
      reconnect: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, clientId, name]);

  useEffect(() => {
    if (!socket) return;
    sockRef.current = socket;
    setStatus("connecting");
    socket.connect();
    return () => {
      socket.close();
      sockRef.current = null;
    };
  }, [socket]);

  function sendUpdate(code: string, language?: string) {
    sockRef.current?.sendUpdate(code, language);
  }
  function sendCursor(cursor: any) {
    sockRef.current?.sendCursor(cursor);
  }
  function leave() {
    sockRef.current?.close();
  }

  return {
    status,
    lastUpdatedBy,
    code,
    language,
    participants,
    sendUpdate,
    sendCursor,
    leave,
  };
}
