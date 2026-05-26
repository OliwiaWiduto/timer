import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";

export type TimerPhase = "idle" | "running" | "paused";

export type StopDraft = {
  projectId: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
};

type PersistedTimer = {
  projectId: string;
  wallStartedAt: string;
  phase: TimerPhase;
  accumulatedMs: number;
  runStartedAt: string | null;
};

type TimerContextValue = {
  phase: TimerPhase;
  activeProjectId: string | null;
  wallStartedAt: Date | null;
  stopDraft: StopDraft | null;
  elapsedMs: number;
  play: (projectId: string) => void;
  pause: () => void;
  resume: () => void;
  /** Freeze timer and capture a draft for the description sheet. */
  openStopSheet: () => boolean;
  /** Resume timing after canceling the stop sheet. */
  cancelStopSheet: () => void;
  /** Reset timer after a session is saved to the server. */
  completeStopAfterSave: () => void;
  clear: () => void;
  error: string | null;
  dismissError: () => void;
};

const TimerContext = createContext<TimerContextValue | null>(null);

function storageKey(userId: string) {
  return `freelance-timer-active:${userId}`;
}

function readPersisted(userId: string): PersistedTimer | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTimer;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.phase !== "running" && parsed.phase !== "paused") return null;
    if (!parsed.projectId || !parsed.wallStartedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(userId: string, state: PersistedTimer | null) {
  const key = storageKey(userId);
  if (!state) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(state));
}

function computeElapsedMs(
  phase: TimerPhase,
  accumulatedMs: number,
  runStartedAt: Date | null,
  now: number,
): number {
  let ms = accumulatedMs;
  if (phase === "running" && runStartedAt) {
    ms += now - runStartedAt.getTime();
  }
  return ms;
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [wallStartedAt, setWallStartedAt] = useState<Date | null>(null);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [runStartedAt, setRunStartedAt] = useState<Date | null>(null);
  const [stopDraft, setStopDraft] = useState<StopDraft | null>(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const dismissError = useCallback(() => setError(null), []);

  const persist = useCallback(
    (next: PersistedTimer | null) => {
      const uid = user?.id;
      if (!uid) return;
      writePersisted(uid, next);
    },
    [user?.id],
  );

  useEffect(() => {
    const uid = user?.id ?? null;
    if (userIdRef.current && userIdRef.current !== uid) {
      setPhase("idle");
      setActiveProjectId(null);
      setWallStartedAt(null);
      setAccumulatedMs(0);
      setRunStartedAt(null);
      setStopDraft(null);
    }
    userIdRef.current = uid;
    if (!uid) return;
    const saved = readPersisted(uid);
    if (!saved) return;
    setActiveProjectId(saved.projectId);
    setWallStartedAt(new Date(saved.wallStartedAt));
    setAccumulatedMs(saved.accumulatedMs);
    setRunStartedAt(saved.runStartedAt ? new Date(saved.runStartedAt) : null);
    setPhase(saved.phase);
  }, [user?.id]);

  useEffect(() => {
    if (phase !== "running" || stopDraft) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase, stopDraft]);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    if (phase === "idle" || stopDraft) {
      if (phase === "idle") persist(null);
      return;
    }
    persist({
      projectId: activeProjectId!,
      wallStartedAt: wallStartedAt!.toISOString(),
      phase,
      accumulatedMs,
      runStartedAt: runStartedAt ? runStartedAt.toISOString() : null,
    });
  }, [user?.id, phase, activeProjectId, wallStartedAt, accumulatedMs, runStartedAt, persist, stopDraft]);

  const elapsedMs = useMemo(() => {
    if (phase === "idle" || !activeProjectId || !wallStartedAt) return 0;
    const now = Date.now();
    return computeElapsedMs(phase, accumulatedMs, runStartedAt, now);
  }, [phase, activeProjectId, wallStartedAt, accumulatedMs, runStartedAt, tick, stopDraft]);

  const play = useCallback(
    (projectId: string) => {
      setError(null);
      if (!user?.id) {
        setError("Sign in to start a timer.");
        return;
      }
      if (stopDraft) {
        setError("Finish or cancel the session description first.");
        return;
      }
      if (phase === "running" && activeProjectId === projectId) return;
      if ((phase === "running" || phase === "paused") && activeProjectId && activeProjectId !== projectId) {
        setError("Stop the current timer before starting another project.");
        return;
      }
      if (phase === "paused" && activeProjectId === projectId) {
        setRunStartedAt(new Date());
        setPhase("running");
        return;
      }
      const now = new Date();
      setActiveProjectId(projectId);
      setWallStartedAt(now);
      setAccumulatedMs(0);
      setRunStartedAt(now);
      setPhase("running");
    },
    [user?.id, phase, activeProjectId, stopDraft],
  );

  const pause = useCallback(() => {
    if (stopDraft) return;
    if (phase !== "running" || !runStartedAt) return;
    const now = Date.now();
    setAccumulatedMs((a) => a + (now - runStartedAt.getTime()));
    setRunStartedAt(null);
    setPhase("paused");
  }, [phase, runStartedAt, stopDraft]);

  const resume = useCallback(() => {
    if (stopDraft) return;
    if (phase !== "paused") return;
    setRunStartedAt(new Date());
    setPhase("running");
  }, [phase, stopDraft]);

  const openStopSheet = useCallback((): boolean => {
    setError(null);
    if (stopDraft) return true;
    if (phase === "idle" || !activeProjectId || !wallStartedAt) return false;
    const endedAt = new Date();
    const now = endedAt.getTime();
    let total = accumulatedMs;
    if (phase === "running" && runStartedAt) {
      total += now - runStartedAt.getTime();
    }
    const durationSeconds = Math.max(1, Math.round(total / 1000));
    setAccumulatedMs(total);
    setRunStartedAt(null);
    setPhase("paused");
    setStopDraft({
      projectId: activeProjectId,
      startedAt: wallStartedAt,
      endedAt,
      durationSeconds,
    });
    return true;
  }, [stopDraft, phase, activeProjectId, wallStartedAt, accumulatedMs, runStartedAt]);

  const cancelStopSheet = useCallback(() => {
    if (!stopDraft) return;
    setStopDraft(null);
    setRunStartedAt(new Date());
    setPhase("running");
  }, [stopDraft]);

  const completeStopAfterSave = useCallback(() => {
    setStopDraft(null);
    setPhase("idle");
    setActiveProjectId(null);
    setWallStartedAt(null);
    setAccumulatedMs(0);
    setRunStartedAt(null);
    if (user?.id) writePersisted(user.id, null);
  }, [user?.id]);

  const clear = useCallback(() => {
    setStopDraft(null);
    setPhase("idle");
    setActiveProjectId(null);
    setWallStartedAt(null);
    setAccumulatedMs(0);
    setRunStartedAt(null);
    if (user?.id) writePersisted(user.id, null);
  }, [user?.id]);

  const value = useMemo<TimerContextValue>(
    () => ({
      phase,
      activeProjectId,
      wallStartedAt,
      stopDraft,
      elapsedMs,
      play,
      pause,
      resume,
      openStopSheet,
      cancelStopSheet,
      completeStopAfterSave,
      clear,
      error,
      dismissError,
    }),
    [
      phase,
      activeProjectId,
      wallStartedAt,
      stopDraft,
      elapsedMs,
      play,
      pause,
      resume,
      openStopSheet,
      cancelStopSheet,
      completeStopAfterSave,
      clear,
      error,
      dismissError,
    ],
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}
