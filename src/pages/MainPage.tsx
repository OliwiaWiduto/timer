import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTimer } from "@/contexts/TimerContext";
import type { Database } from "@/types/database";
import { StopSessionModal } from "@/components/StopSessionModal";
import { formatClock } from "@/lib/format";
import { IconClose, IconPause, IconPlay } from "@/components/icons";

type Project = Database["public"]["Tables"]["projects"]["Row"];

export function MainPage() {
  const { user, signOut } = useAuth();
  const timer = useTimer();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
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
  }, [user]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

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
    <div className="sv-app sv-app--shell">
      <div className="sv-shell">
        <div className="sv-shell__header">
          <div className="sv-header">
            <div className="sv-header__center">
              <img className="sv-header__icon" src="/logo.png" alt="Studio Voodoo" />
              <div className="sv-header__title">Studio Voodoo Timer</div>
            </div>
            <div className="sv-header__right">
              <Link to="/logs" className="sv-link">
                Project logs
              </Link>
            </div>
          </div>
        </div>

        <div className="sv-shell__content">
          <div className="sv-list" aria-busy={loading ? "true" : "false"}>
            {projects.map((p) => {
              const isActive = timer.activeProjectId === p.id;
              const isRunning = timer.phase === "running" && isActive;
              const isPaused = timer.phase === "paused" && isActive;
              const showTime = isActive && (timer.phase === "running" || timer.phase === "paused");

              return (
                <div
                  key={p.id}
                  className={`sv-row ${isActive ? "sv-row--active" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/logs?project=${p.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") navigate(`/logs?project=${p.id}`);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="sv-row__left">
                    {isRunning ? (
                      <>
                        <button
                          type="button"
                          className="sv-icon-btn sv-icon-btn--primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            timer.pause();
                          }}
                          disabled={Boolean(timer.stopDraft)}
                          aria-label="Pause"
                        >
                          <IconPause />
                        </button>
                        <button
                          type="button"
                          className="sv-icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!timer.openStopSheet()) return;
                          }}
                          disabled={Boolean(timer.stopDraft)}
                          aria-label="Stop"
                          title="Stop session and add a description"
                        >
                          <IconClose />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={`sv-icon-btn ${isPaused ? "sv-icon-btn--primary" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          timer.play(p.id);
                        }}
                        disabled={Boolean(timer.stopDraft)}
                        aria-label={isPaused ? "Resume" : "Play"}
                      >
                        <IconPlay />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        appearance: "none",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        color: "inherit",
                      }}
                    >
                      <div className="sv-label">{p.name}</div>
                    </button>
                  </div>

                  {showTime ? <div className="sv-time">{formatClock(timer.elapsedMs / 1000).slice(3)}</div> : null}
                </div>
              );
            })}

            {!loading && projects.length === 0 ? (
              <div className="sv-row" style={{ borderBottom: "none" }}>
                <div className="sv-label sv-label--muted">No projects yet</div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="sv-shell__footer">
          <div
            className="sv-footer"
            style={{
              paddingTop: 16,
              justifyContent: "space-between",
              paddingLeft: 16,
              paddingRight: 16,
            }}
          >
            <Link to="/projects" className="sv-link sv-link-btn">
              Projects
            </Link>
            <button
              type="button"
              className="sv-label sv-label--muted"
              style={{
                fontFamily: "Inter",
                fontSize: 12,
                letterSpacing: 0.5,
                background: "transparent",
                border: "none",
              }}
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

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
