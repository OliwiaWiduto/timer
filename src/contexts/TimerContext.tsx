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
import { supabase } from "@/lib/supabase";
import {
  applyPersistedToState,
  clearActiveTimer,
  clearLegacyLocalTimer,
  fetchActiveTimer,
  parseActiveTimerRow,
  readLegacyLocalTimer,
  subscribeActiveTimer,
  upsertActiveTimer,
  type ActiveTimerRow,
  type PersistedTimer,
} from "@/lib/activeTimerSync";

export type TimerPhase = "idle" | "running" | "paused";

export type StopDraft = {
  projectId: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
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
  openStopSheet: () => boolean;
  cancelStopSheet: () => void;
  completeStopAfterSave: () => void;
  clear: () => void;
  error: string | null;
  dismissError: () => void;
  syncing: boolean;
};

const TimerContext = createContext<TimerContextValue | null>(null);

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

function toPersisted(
  phase: "running" | "paused",
  activeProjectId: string,
  wallStartedAt: Date,
  accumulatedMs: number,
  runStartedAt: Date | null,
): PersistedTimer {
  return {
    projectId: activeProjectId,
    wallStartedAt: wallStartedAt.toISOString(),
    phase,
    accumulatedMs,
    runStartedAt: runStartedAt ? runStartedAt.toISOString() : null,
  };
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [wallStartedAt, setWallStartedAt] = useState<Date | null>(null);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [runStartedAt, setRunStartedAt] = useState<Date | null>(null);
  const [stopDraft, setStopDraft] = useState<StopDraft | null>(null);
  const [, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const lastAppliedAtRef = useRef(0);
  const skipNextPersistRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  const dismissError = useCallback(() => setError(null), []);

  const applyRemoteRow = useCallback((row: ActiveTimerRow | null) => {
    const { persisted, stopDraft: remoteDraft, updatedAt } = parseActiveTimerRow(row);
    if (updatedAt > 0 && updatedAt < lastAppliedAtRef.current) return;
    if (updatedAt > 0) lastAppliedAtRef.current = updatedAt;

    skipNextPersistRef.current = true;

    if (!persisted) {
      setPhase("idle");
      setActiveProjectId(null);
      setWallStartedAt(null);
      setAccumulatedMs(0);
      setRunStartedAt(null);
      setStopDraft(null);
      return;
    }

    const next = applyPersistedToState(persisted);
    setActiveProjectId(next.activeProjectId);
    setWallStartedAt(next.wallStartedAt);
    setAccumulatedMs(next.accumulatedMs);
    setRunStartedAt(next.runStartedAt);
    setPhase(next.phase);
    setStopDraft(remoteDraft);
  }, []);

  const syncToServer = useCallback(
    async (persisted: PersistedTimer | null, draft: StopDraft | null) => {
      const uid = user?.id;
      if (!uid) return;
      setSyncing(true);
      try {
        if (!persisted) {
          await clearActiveTimer(uid);
          lastAppliedAtRef.current = Date.now();
        } else {
          const row = await upsertActiveTimer(uid, persisted, draft);
          if (row?.updated_at) lastAppliedAtRef.current = new Date(row.updated_at).getTime();
        }
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Could not sync timer.");
      } finally {
        setSyncing(false);
      }
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
      setHydrated(false);
    }
    userIdRef.current = uid;

    if (!uid) {
      setHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const row = await fetchActiveTimer(uid);
        if (cancelled) return;
        if (row) {
          applyRemoteRow(row);
        } else {
          const legacy = readLegacyLocalTimer(uid);
          if (legacy) {
            const next = applyPersistedToState(legacy);
            setActiveProjectId(next.activeProjectId);
            setWallStartedAt(next.wallStartedAt);
            setAccumulatedMs(next.accumulatedMs);
            setRunStartedAt(next.runStartedAt);
            setPhase(next.phase);
            await syncToServer(legacy, null);
            clearLegacyLocalTimer(uid);
          }
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load timer.");
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    const channel = subscribeActiveTimer(uid, (row) => {
      if (!cancelled) applyRemoteRow(row);
    });

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Refresh display immediately; background tabs throttle setInterval so tick can stall.
      setTick((t) => t + 1);
      void fetchActiveTimer(uid)
        .then((row) => {
          if (!cancelled) applyRemoteRow(row);
        })
        .catch(console.error);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [user?.id, applyRemoteRow, syncToServer]);

  useEffect(() => {
    if (!hydrated || phase !== "running" || stopDraft) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [hydrated, phase, stopDraft]);

  useEffect(() => {
    if (!hydrated || !user?.id) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    // Never push "idle" to the server here — an idle device must not delete another
    // machine's running timer. Clear only from completeStopAfterSave / clear().
    if (phase === "idle" || !activeProjectId || !wallStartedAt) return;

    void syncToServer(
      toPersisted(phase, activeProjectId, wallStartedAt, accumulatedMs, runStartedAt),
      stopDraft,
    );
  }, [
    hydrated,
    user?.id,
    phase,
    activeProjectId,
    wallStartedAt,
    accumulatedMs,
    runStartedAt,
    stopDraft,
    syncToServer,
  ]);

  // Recompute every render with Date.now(); tick only forces periodic re-renders while running.
  // useMemo here froze the clock when setInterval was throttled in a background tab/window.
  const elapsedMs =
    phase === "idle" || !activeProjectId || !wallStartedAt
      ? 0
      : computeElapsedMs(phase, accumulatedMs, runStartedAt, Date.now());

  const play = useCallback(
    (projectId: string) => {
      setError(null);
      if (!user?.id) {
        setError("Sign in to start a timer.");
        return;
      }
      if (!hydrated) return;
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
    [user?.id, hydrated, phase, activeProjectId, stopDraft],
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
    void syncToServer(null, null);
  }, [syncToServer]);

  const clear = useCallback(() => {
    setStopDraft(null);
    setPhase("idle");
    setActiveProjectId(null);
    setWallStartedAt(null);
    setAccumulatedMs(0);
    setRunStartedAt(null);
    void syncToServer(null, null);
  }, [syncToServer]);

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
      syncing,
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
      syncing,
    ],
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}
