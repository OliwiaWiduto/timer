import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTimer } from "@/contexts/TimerContext";
import type { Database } from "@/types/database";
import { NewProjectModal } from "@/components/NewProjectModal";
import { StopSessionModal } from "@/components/StopSessionModal";
import { formatClock, formatDateTime } from "@/lib/format";

type Project = Database["public"]["Tables"]["projects"]["Row"];

export function MainPage() {
  const { user, signOut } = useAuth();
  const timer = useTimer();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [savingStop, setSavingStop] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("last_logged_at", { ascending: false, nullsFirst: false });
    setLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    setProjects(data ?? []);
    setSelectedId((prev) => {
      if (prev && data?.some((p) => p.id === prev)) return prev;
      return data?.[0]?.id ?? null;
    });
  }, [user]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const selected = useMemo(() => projects.find((p) => p.id === selectedId) ?? null, [projects, selectedId]);

  const activeLabel = useMemo(() => {
    if (!timer.activeProjectId) return null;
    return projects.find((p) => p.id === timer.activeProjectId)?.name ?? "Project";
  }, [projects, timer.activeProjectId]);

  async function onSaveStop(description: string) {
    if (!user || !timer.stopDraft) return;
    setSavingStop(true);
    setStopError(null);
    const d = timer.stopDraft;
    const { error } = await supabase.from("sessions").insert({
      user_id: user.id,
      project_id: d.projectId,
      started_at: d.startedAt.toISOString(),
      ended_at: d.endedAt.toISOString(),
      duration_seconds: d.durationSeconds,
      description: description.trim(),
    });
    if (error) {
      setStopError(error.message);
      setSavingStop(false);
      return;
    }
    await supabase.from("projects").update({ last_logged_at: new Date().toISOString() }).eq("id", d.projectId);
    timer.completeStopAfterSave();
    setSavingStop(false);
    await loadProjects();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: "100vh" }}>
      <aside
        style={{
          borderRight: "1px solid #e2e8f0",
          background: "#fff",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <strong>Projects</strong>
          <button type="button" onClick={() => setNewOpen(true)} style={{ padding: "0.35rem 0.6rem", borderRadius: 8 }}>
            + New
          </button>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Link to="/logs">All time logs</Link>
        </nav>
        <div style={{ flex: 1, overflow: "auto" }}>
          {loading ? <p>Loading projects…</p> : null}
          {!loading && projects.length === 0 ? <p style={{ color: "#64748b" }}>No projects yet.</p> : null}
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.55rem 0.6rem",
                    borderRadius: 8,
                    border: p.id === selectedId ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    background: p.id === selectedId ? "#eff6ff" : "#fff",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {p.client_name ? `${p.client_name} · ` : null}
                    {p.hourly_rate} {p.currency}/hr
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={() => void signOut()} style={{ padding: "0.5rem", borderRadius: 8 }}>
          Sign out
        </button>
      </aside>
      <main style={{ padding: 24 }}>
        {timer.error ? (
          <div
            style={{
              marginBottom: 12,
              padding: "0.65rem 0.75rem",
              borderRadius: 8,
              background: "#fef2f2",
              color: "#991b1b",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span>{timer.error}</span>
            <button type="button" onClick={timer.dismissError}>
              Dismiss
            </button>
          </div>
        ) : null}

        {!selected ? (
          <p>Create a project to start tracking time.</p>
        ) : (
          <section style={{ maxWidth: 720 }}>
            <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <h1 style={{ margin: "0 0 6px" }}>{selected.name}</h1>
                <p style={{ margin: 0, color: "#475569" }}>
                  {selected.client_name ? <span>{selected.client_name} · </span> : null}
                  {selected.hourly_rate} {selected.currency}/hr
                </p>
              </div>
              <Link to={`/invoice/${selected.id}`} style={{ whiteSpace: "nowrap" }}>
                Create invoice
              </Link>
            </header>

            <div
              style={{
                marginTop: 24,
                padding: 20,
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                background: "#fff",
              }}
            >
              <div style={{ fontSize: 42, fontVariantNumeric: "tabular-nums", letterSpacing: 1 }}>
                {formatClock(timer.elapsedMs / 1000)}
              </div>
              <p style={{ color: "#64748b", marginTop: 8 }}>
                {timer.phase === "idle" && "Ready when you are."}
                {timer.phase === "running" && timer.activeProjectId === selected.id && "Timer is running."}
                {timer.phase === "paused" && timer.activeProjectId === selected.id && "Paused."}
                {timer.activeProjectId && timer.activeProjectId !== selected.id && (
                  <span>
                    Another project is active: <strong>{activeLabel}</strong>
                  </span>
                )}
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => timer.play(selected.id)}
                  disabled={Boolean(timer.stopDraft)}
                  style={{ padding: "0.55rem 0.9rem", borderRadius: 8, fontWeight: 600 }}
                >
                  {timer.phase === "paused" && timer.activeProjectId === selected.id ? "Resume" : "Play"}
                </button>
                <button
                  type="button"
                  onClick={timer.pause}
                  disabled={timer.phase !== "running" || timer.activeProjectId !== selected.id || Boolean(timer.stopDraft)}
                  style={{ padding: "0.55rem 0.9rem", borderRadius: 8 }}
                >
                  Pause
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (timer.activeProjectId !== selected.id) return;
                    if (!timer.openStopSheet()) return;
                  }}
                  disabled={
                    timer.phase === "idle" || timer.activeProjectId !== selected.id || Boolean(timer.stopDraft)
                  }
                  style={{ padding: "0.55rem 0.9rem", borderRadius: 8 }}
                  title="Stop session and add a description"
                >
                  Stop (✕)
                </button>
              </div>
              {timer.wallStartedAt && timer.activeProjectId === selected.id ? (
                <p style={{ marginTop: 12, color: "#64748b", fontSize: 14 }}>
                  Session started {formatDateTime(timer.wallStartedAt.toISOString())}
                </p>
              ) : null}
            </div>
          </section>
        )}
      </main>

      <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} onCreated={() => void loadProjects()} />

      {timer.stopDraft ? (
        <StopSessionModal
          draft={timer.stopDraft}
          projectName={projects.find((p) => p.id === timer.stopDraft!.projectId)?.name ?? "Project"}
          saving={savingStop}
          error={stopError}
          onSave={onSaveStop}
          onCancel={() => {
            setStopError(null);
            timer.cancelStopSheet();
          }}
        />
      ) : null}
    </div>
  );
}
