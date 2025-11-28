// src/services/roomSocket.ts
export type WSMessage =
  | { type: "state"; code: string; meta?: any }
  | { type: "presence"; action: "join" | "leave"; clientId: string; name?: string }
  | { type: "presence_list"; participants: { clientId: string; name?: string }[] }
  | { type: "cursor"; clientId: string; cursor: any }
  | { type: string;[k: string]: any };

export interface Participant {
  clientId: string;
  name?: string;
}

type EventHandler = (msg: WSMessage) => void;
type PresenceHandler = (participants: Participant[]) => void;

export interface RoomSocketOptions {
  wsBase?: string; // e.g. "ws://127.0.0.1:8000"
  onMessage?: EventHandler;
  onOpen?: () => void;
  onClose?: (code?: number, reason?: string) => void;
  onPresence?: PresenceHandler;
  reconnect?: boolean;
  reconnectBaseMs?: number;
}

export class RoomSocket {
  private ws: WebSocket | null = null;
  private roomId: string;
  private clientId: string;
  private sessionId: string; // Unique ID for this connection session
  private name?: string;
  private wsBase: string;
  private onMessage?: EventHandler;
  private onOpen?: () => void;
  private onClose?: (code?: number, reason?: string) => void;
  private onPresence?: PresenceHandler;
  private reconnect: boolean;
  private reconnectBaseMs: number;
  private reconnectAttempts = 0;
  public status: "disconnected" | "connecting" | "connected" = "disconnected";

  // local participants map
  private participants: Map<string, Participant> = new Map();

  constructor(roomId: string, clientId: string, name?: string, opts?: RoomSocketOptions) {
    this.roomId = roomId;
    this.clientId = clientId;
    // Generate a unique session ID for this connection
    // This ensures each WebSocket connection is unique, even if clientId is shared
    this.sessionId = this.generateUniqueSessionId();
    this.name = name;
    // Use environment variable with fallback
    this.wsBase = opts?.wsBase ?? process.env.REACT_APP_WS_BASE ??
      (process.env.REACT_APP_API_BASE?.replace('http', 'ws')) ??
      "ws://127.0.0.1:8000";
    this.onMessage = opts?.onMessage;
    this.onOpen = opts?.onOpen;
    this.onClose = opts?.onClose;
    this.onPresence = opts?.onPresence;
    this.reconnect = opts?.reconnect ?? true;
    this.reconnectBaseMs = opts?.reconnectBaseMs ?? 1000;
  }

  private generateUniqueSessionId(): string {
    // Use crypto.randomUUID if available, otherwise generate a random string
    if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID();
    }
    // Generate a unique ID: timestamp + random string
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private wsUrl() {
    return `${this.wsBase.replace(/\/$/, "")}/ws/${encodeURIComponent(this.roomId)}`;
  }

  connect() {
    if (!this.roomId || !this.clientId) throw new Error("roomId and clientId required");
    if (this.ws) this.close();

    this.status = "connecting";
    const url = this.wsUrl();
    console.info("[RoomSocket] connect ->", url);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.status = "connected";
      this.reconnectAttempts = 0;
      // Generate new session ID for this connection
      this.sessionId = this.generateUniqueSessionId();
      // send join with unique session ID (combine clientId and sessionId for uniqueness)
      const uniqueClientId = `${this.clientId}_${this.sessionId}`;
      this.sendRaw({ type: "join", clientId: uniqueClientId, name: this.name });
      // include self in presence immediately
      this.participants.set(uniqueClientId, { clientId: uniqueClientId, name: this.name });
      this.emitPresence();
      this.onOpen?.();
    };

    this.ws.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data) as WSMessage;

        // presence_list from server: authoritative participants list
        if ((parsed as any).type === "presence_list") {
          const pls = (parsed as any).participants || [];
          // Clear and rebuild from server's authoritative list
          this.participants.clear();
          for (const p of pls) {
            if (p.clientId) {  // Only add if clientId is valid
              this.participants.set(p.clientId, { clientId: p.clientId, name: p.name || "Anonymous" });
            }
          }
          // Always include self in participants list (in case server didn't include us yet)
          const uniqueClientId = `${this.clientId}_${this.sessionId}`;
          if (uniqueClientId) {
            this.participants.set(uniqueClientId, { clientId: uniqueClientId, name: this.name });
          }
          this.emitPresence();
          return;
        }

        // presence join/leave will be handled to update local participants
        if (parsed.type === "presence") {
          const p = parsed as any;
          if (p.action === "join" && p.clientId) {
            // Add or update participant
            this.participants.set(p.clientId, { clientId: p.clientId, name: p.name || "Anonymous" });
            this.emitPresence();
          } else if (p.action === "leave" && p.clientId) {
            // Only remove if it's not self (we want to keep self in the list)
            const uniqueClientId = `${this.clientId}_${this.sessionId}`;
            if (p.clientId !== uniqueClientId) {
              this.participants.delete(p.clientId);
              this.emitPresence();
            }
          }
        }

        this.onMessage?.(parsed);
      } catch (err) {
        // parse error
        console.warn("[RoomSocket] parse error", err);
      }
    };

    this.ws.onclose = (ev) => {
      this.status = "disconnected";
      this.onClose?.(ev.code, ev.reason);
      // clear participants list on remote close (client will reconnect and get presence_list again)
      // keep local clientId only? For simplicity we clear all - hook will update after reconnect.
      this.participants.clear();
      this.emitPresence();
      if (this.reconnect) this.scheduleReconnect();
    };

    this.ws.onerror = (ev) => {
      console.warn("[RoomSocket] ws error", ev);
    };
  }

  private scheduleReconnect() {
    this.reconnectAttempts += 1;
    const wait = Math.min(30000, this.reconnectBaseMs * Math.pow(1.5, this.reconnectAttempts));
    console.info("[RoomSocket] schedule reconnect in ms:", wait);
    setTimeout(() => {
      if (this.reconnect) this.connect();
    }, wait);
  }

  private emitPresence() {
    if (!this.onPresence) return;
    const arr = Array.from(this.participants.values());
    this.onPresence(arr);
  }

  sendRaw(obj: any) {
    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
      this.ws.send(JSON.stringify(obj));
      return true;
    } catch {
      return false;
    }
  }

  sendJoin() {
    const uniqueClientId = `${this.clientId}_${this.sessionId}`;
    this.participants.set(uniqueClientId, { clientId: uniqueClientId, name: this.name });
    this.emitPresence();
    return this.sendRaw({ type: "join", clientId: uniqueClientId, name: this.name });
  }

  sendUpdate(code: string, language?: string) {
    const uniqueClientId = `${this.clientId}_${this.sessionId}`;
    const payload: any = { type: "update", clientId: uniqueClientId, code };
    if (language) {
      payload.language = language;
    }
    return this.sendRaw(payload);
  }

  sendCursor(cursor: any) {
    const uniqueClientId = `${this.clientId}_${this.sessionId}`;
    return this.sendRaw({ type: "cursor", clientId: uniqueClientId, cursor });
  }

  close() {
    this.reconnect = false;
    if (this.ws) {
      try {
        this.ws.close(1000, "client closed");
      } catch { }
      this.ws = null;
      this.status = "disconnected";
      this.participants.clear();
      this.emitPresence();
    }
  }
}
