// src/pages/RoomPage.tsx
import React, { useRef, useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { useRoomSocket } from "../hooks/useRoomSocket";
import { getOrCreateClientId } from "../utils/identity";
import { setClientId } from "../features/user/userSlice";
import { runCodeWithPiston } from "../services/piston";
import RoomHeader from "../components/RoomHeader";
import ParticipantList from "../components/ParticipantList";
import CodeWorkspace from "../components/CodeWorkspace";
import LastUpdatedIndicator from "../components/LastUpdatedIndicator";

const DEBOUNCE_MS = 150; // Reduced for better responsiveness
const LANGUAGE_OPTIONS = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
];

const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const name = useAppSelector((s) => s.user.name);
  const storedClientId = useAppSelector((s) => s.user.clientId);

  // ensure clientId (derive synchronously for hook)
  const ensuredClientId = storedClientId ?? getOrCreateClientId();

  // persist clientId into redux once on mount if not present
  useEffect(() => {
    if (!storedClientId) dispatch(setClientId(ensuredClientId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redirect if name missing (do in effect to keep hook order stable)
  useEffect(() => {
    if (!name) navigate("/");
  }, [name, navigate]);

  // UNCONDITIONAL hooks
  const { status, lastUpdatedBy, code: remoteCode, language: remoteLanguage, participants, sendUpdate, leave } = useRoomSocket(roomId, ensuredClientId, name ?? undefined);

  const [code, setCode] = useState("");
  const pendingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  // Initialize to null to distinguish between "never sent" and "sent empty string"
  const lastSentCodeRef = useRef<string | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const [language, setLanguage] = useState("python");
  const [runOutput, setRunOutput] = useState<string>("");
  const [runError, setRunError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const editorTheme = useMemo(() => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "vs-dark" : "light"), []);

  // Sync remote language changes to local state
  useEffect(() => {
    if (remoteLanguage) {
      setLanguage(remoteLanguage);
    }
  }, [remoteLanguage]);

  // Sync remote code changes to local state (must be before any conditional returns)
  useEffect(() => {
    // Always check if remoteCode is defined (including empty strings)
    if (remoteCode === undefined) {
      return;
    }

    // Don't apply if this is exactly our own update being echoed back
    // Only check if we've actually sent something (lastSentCodeRef is not null)
    const isOurOwnEcho = lastSentCodeRef.current !== null && remoteCode === lastSentCodeRef.current;
    if (isOurOwnEcho) {
      // This is our own update echo, ignore it since we already have this state locally
      return;
    }

    // Set flag to prevent local changes from interfering while applying remote update
    isApplyingRemoteRef.current = true;

    // Use functional update to get the latest code value for comparison
    // This ensures we're comparing against the most current state
    setCode((currentCode) => {
      // Apply remote update immediately (from another user), even if it's an empty string
      // This ensures real-time collaboration without lag
      // Always apply if different - empty strings are valid and should overwrite non-empty strings
      if (remoteCode !== currentCode) {
        // If this is the initial state (we haven't sent anything yet), sync lastSentCodeRef
        // This prevents us from sending the initial state back as our own update
        if (lastSentCodeRef.current === null && !pendingRef.current) {
          lastSentCodeRef.current = remoteCode;
        }

        return remoteCode;
      }
      return currentCode;
    });

    // Reset flag after React processes the state update
    requestAnimationFrame(() => {
      isApplyingRemoteRef.current = false;
    });
  }, [remoteCode]); // Only depend on remoteCode, not code

  // Cleanup timer on unmount (must be before any conditional returns)
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!roomId) return <div style={{ padding: 20 }}>Invalid room</div>;

  function onLocalChange(next: string) {
    // Don't update if we're currently applying a remote update
    if (isApplyingRemoteRef.current) {
      return;
    }

    // Update local state immediately for instant feedback (optimistic update)
    setCode(next);
    pendingRef.current = true;

    // Clear existing timer
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    // Store the current value to send (capture it in closure)
    // This ensures we send the correct final state even if user types/backspaces rapidly
    const valueToSend = next;

    // Set new timer to send update after user stops typing
    timerRef.current = window.setTimeout(() => {
      // Always send the update if it's different from what we last sent
      // This ensures backspaces and empty strings are also sent
      // Important: We compare with the captured value, not the current code state
      // Use strict comparison to handle empty strings correctly
      // Check if null (never sent) or different value
      if (lastSentCodeRef.current === null || valueToSend !== lastSentCodeRef.current) {
        lastSentCodeRef.current = valueToSend;
        // Send the update - empty strings are valid and should be sent
        // The backend will handle empty strings correctly
        sendUpdate(valueToSend, language);
      }
      pendingRef.current = false;
      timerRef.current = null;
    }, DEBOUNCE_MS);
  }

  function onLanguageChange(newLanguage: string) {
    setLanguage(newLanguage);
    // Send language update immediately with current code
    sendUpdate(code, newLanguage);
  }

  async function handleRun() {
    if (!code.trim()) {
      setRunError("Cannot run an empty snippet.");
      setRunOutput("");
      return;
    }

    setIsRunning(true);
    setRunError(null);
    setRunOutput("");

    try {
      const result = await runCodeWithPiston(language, code);
      const compiled = result.compile;
      const run = result.run;
      const compileOutput = compiled?.output || [compiled?.stdout, compiled?.stderr].filter(Boolean).join("").trim();
      const runOutputText = run?.output || [run?.stdout, run?.stderr].filter(Boolean).join("").trim();
      const combined = [compileOutput, runOutputText].filter((segment) => !!segment).join("\n").trim();
      setRunOutput(combined || "(no output)");
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Failed to execute code.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="room-page-container">
      <div className="room-main">
        <RoomHeader
          roomId={roomId}
          name={name}
          status={status}
          onLeave={() => {
            leave();
            navigate("/");
          }}
        />

        <CodeWorkspace
          code={code}
          language={language}
          languageOptions={LANGUAGE_OPTIONS}
          onLanguageChange={onLanguageChange}
          onCodeChange={onLocalChange}
          onRun={handleRun}
          isRunning={isRunning}
          runError={runError}
          runOutput={runOutput}
          editorTheme={editorTheme}
        />

        <LastUpdatedIndicator lastUpdatedBy={lastUpdatedBy} participants={participants} />
      </div>

      <ParticipantList participants={participants} />
    </div>
  );
};

export default RoomPage;
