/**
 * Generate or return a persistent clientId stored in localStorage.
 * Returns a string (never null).
 */
export function getOrCreateClientId(): string {
  const key = "realtime_client_id";
  const existing = localStorage.getItem(key);

  if (existing) return existing;

  // generate a new id (use crypto.randomUUID when available)
  const generated =
    typeof crypto !== "undefined" && (crypto as any).randomUUID
      ? (crypto as any).randomUUID()
      : "cid_" + Math.random().toString(36).slice(2, 9);

  localStorage.setItem(key, generated);
  return generated;
}

/**
 * Generate a unique session ID for this WebSocket connection.
 * This ensures each connection gets a unique ID, even if multiple tabs
 * share the same persistent clientId from localStorage.
 */
export function generateSessionId(): string {
  // Use crypto.randomUUID if available, otherwise generate a random string
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  // Generate a unique ID: timestamp + random string
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Generate a short 6-character unique display ID from a longer client ID.
 * Uses a hash function to deterministically convert the full client_id to a short ID.
 * Characters can be alphanumeric (0-9, a-z, A-Z).
 */
export function getShortClientId(fullClientId: string): string {
  if (!fullClientId) return "------";

  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < fullClientId.length; i++) {
    const char = fullClientId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use absolute value and convert to base 62 (0-9, a-z, A-Z = 62 characters)
  const absHash = Math.abs(hash);
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let shortId = "";

  // Generate 6 characters
  let num = absHash;
  for (let i = 0; i < 6; i++) {
    shortId = chars[num % 62] + shortId;
    num = Math.floor(num / 62);
  }

  // If hash was too small, use additional characters from the original ID
  if (absHash < 1000000) {
    // Mix in characters from the original ID for more uniqueness
    for (let i = 0; i < Math.min(6, fullClientId.length); i++) {
      const char = fullClientId.charCodeAt(i);
      const idx = (absHash + char) % 62;
      shortId = shortId.slice(0, i) + chars[idx] + shortId.slice(i + 1);
    }
  }

  return shortId;
}