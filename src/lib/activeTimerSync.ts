import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type TimerPhase = "idle" | "running" | "paused";

export type StopDraftPayload = {
  projectId: string;
  startedAt: Date;
  endedAt: Date;
  durationSeconds: number;
};

export type ActiveTimerRow = Database["public"]["Tables"]["active_timers"]["Row"];

export type PersistedTimer = {
  projectId: string;
  wallStartedAt: string;
  phase: "running" | "paused";
  accumulatedMs: number;
  runStartedAt: string | null;
};

type StopDraftJson = {
  projectId: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
};

function stopDraftToJson(draft: StopDraftPayload): StopDraftJson {
  return {
    projectId: draft.projectId,
    startedAt: draft.startedAt.toISOString(),
    endedAt: draft.endedAt.toISOString(),
    durationSeconds: draft.durationSeconds,
  };
}

function stopDraftFromJson(raw: unknown): StopDraftPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as StopDraftJson;
  if (!o.projectId || !o.startedAt || !o.endedAt) return null;
  return {
    projectId: o.projectId,
    startedAt: new Date(o.startedAt),
    endedAt: new Date(o.endedAt),
    durationSeconds: o.durationSeconds,
  };
}

export function parseActiveTimerRow(row: ActiveTimerRow | null): {
  persisted: PersistedTimer | null;
  stopDraft: StopDraftPayload | null;
  updatedAt: number;
} {
  if (!row) return { persisted: null, stopDraft: null, updatedAt: 0 };
  if (row.phase !== "running" && row.phase !== "paused") {
    return { persisted: null, stopDraft: null, updatedAt: 0 };
  }
  return {
    persisted: {
      projectId: row.project_id,
      wallStartedAt: row.wall_started_at,
      phase: row.phase,
      accumulatedMs: Number(row.accumulated_ms),
      runStartedAt: row.run_started_at,
    },
    stopDraft: stopDraftFromJson(row.stop_draft),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export function applyPersistedToState(saved: PersistedTimer) {
  return {
    activeProjectId: saved.projectId,
    wallStartedAt: new Date(saved.wallStartedAt),
    accumulatedMs: saved.accumulatedMs,
    runStartedAt: saved.runStartedAt ? new Date(saved.runStartedAt) : null,
    phase: saved.phase,
  };
}

export async function fetchActiveTimer(userId: string) {
  const { data, error } = await supabase.from("active_timers").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertActiveTimer(
  userId: string,
  persisted: PersistedTimer,
  stopDraft: StopDraftPayload | null,
) {
  const { data, error } = await supabase
    .from("active_timers")
    .upsert(
      {
        user_id: userId,
        project_id: persisted.projectId,
        phase: persisted.phase,
        wall_started_at: persisted.wallStartedAt,
        accumulated_ms: persisted.accumulatedMs,
        run_started_at: persisted.runStartedAt,
        stop_draft: stopDraft ? stopDraftToJson(stopDraft) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function clearActiveTimer(userId: string) {
  const { error } = await supabase.from("active_timers").delete().eq("user_id", userId);
  if (error) throw error;
}

export function subscribeActiveTimer(userId: string, onChange: (row: ActiveTimerRow | null) => void): RealtimeChannel {
  return supabase
    .channel(`active-timer-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "active_timers",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === "DELETE") {
          onChange(null);
          return;
        }
        onChange(payload.new as ActiveTimerRow);
      },
    )
    .subscribe();
}

/** One-time migration from pre-sync localStorage timer state. */
export function readLegacyLocalTimer(userId: string): PersistedTimer | null {
  try {
    const raw = localStorage.getItem(`freelance-timer-active:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTimer;
    if (!parsed?.projectId || !parsed.wallStartedAt) return null;
    if (parsed.phase !== "running" && parsed.phase !== "paused") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLegacyLocalTimer(userId: string) {
  localStorage.removeItem(`freelance-timer-active:${userId}`);
}
