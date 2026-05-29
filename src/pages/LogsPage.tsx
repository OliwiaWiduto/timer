import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/types/database";
import { formatHoursMinutes, formatMoney } from "@/lib/format";
import { IconChevronLeft, IconTrash } from "@/components/icons";
import { endOfMonth, format, isWithinInterval, startOfMonth } from "date-fns";
import { DeleteSessionConfirmModal } from "@/components/DeleteSessionConfirmModal";
import { EditSessionModal } from "@/components/EditSessionModal";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  projects: Pick<
    Database["public"]["Tables"]["projects"]["Row"],
    "name" | "avatar_color" | "avatar_initial" | "id" | "hourly_rate" | "currency"
  > | null;
};

import { projectAvatarDisplay } from "@/lib/projectAvatar";

const DELETE_CONFIRM_THRESHOLD_SECONDS = 600;

function formatSummaryHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  const n = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${n} hour${rounded === 1 ? "" : "s"}`;
}

export function LogsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast(2000);
  const [editOpen, setEditOpen] = useState(false);
  const [editSession, setEditSession] = useState<Database["public"]["Tables"]["sessions"]["Row"] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SessionRow | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("sessions")
      .select("*, projects(id, name, avatar_color, avatar_initial, hourly_rate, currency)")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.error(error);
      setError(error.message);
      return;
    }
    setRows((data ?? []) as SessionRow[]);
  }, [user]);

  const onDelete = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;
      setBusyId(id);
      const { error } = await supabase.from("sessions").delete().eq("id", id);
      setBusyId(null);
      if (error) {
        console.error(error);
        showToast(error.message);
        return false;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      return true;
    },
    [user, showToast],
  );

  const requestDelete = useCallback(
    (session: SessionRow) => {
      if (session.duration_seconds > DELETE_CONFIRM_THRESHOLD_SECONDS) {
        setDeleteTarget(session);
        return;
      }
      void onDelete(session.id);
    },
    [onDelete],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const param = searchParams.get("project");
    if (!param) return;
    setProjectFilter(param);
  }, [searchParams]);

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const name = r.projects?.name ?? "Project";
      map.set(r.project_id, name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    if (projectFilter === "all") return rows;
    return rows.filter((r) => String(r.project_id) === projectFilter);
  }, [rows, projectFilter]);

  const monthSummary = useMemo(() => {
    if (projectFilter === "all") return null;
    const now = new Date();
    const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };
    let totalSeconds = 0;
    let hourlyRate = 0;
    let currency = "GBP";
    for (const r of rows) {
      if (String(r.project_id) !== projectFilter) continue;
      if (r.projects) {
        hourlyRate = Number(r.projects.hourly_rate);
        currency = r.projects.currency ?? "GBP";
      }
      const started = new Date(r.started_at);
      if (!isWithinInterval(started, monthInterval)) continue;
      totalSeconds += r.duration_seconds;
    }
    const hours = totalSeconds / 3600;
    return {
      hours,
      money: hours * hourlyRate,
      currency,
    };
  }, [rows, projectFilter]);

  const invoiceProjectId = projectFilter !== "all" ? projectFilter : projectOptions[0]?.[0];

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
              <Link
                to={invoiceProjectId ? `/invoice/${invoiceProjectId}` : "/invoice/00000000-0000-0000-0000-000000000000"}
                className="sv-link"
                onClick={(e) => {
                  if (!invoiceProjectId) e.preventDefault();
                }}
              >
                Invoices
              </Link>
            </div>
          </div>
        </div>

        <div className="sv-shell__content">
          <div className="sv-topbar">
            <Link to="/" className="sv-icon-btn sv-icon-btn--ghost" aria-label="Back">
              <IconChevronLeft />
            </Link>
            <div className="sv-topbar__title">Project logs</div>
            <div style={{ width: 24 }} aria-hidden="true" />
          </div>

          <div className="sv-form" style={{ paddingBottom: 0 }}>
            <div className="sv-pillbar" role="tablist" aria-label="Project filter">
              <button
                type="button"
                className={`sv-pill ${projectFilter === "all" ? "sv-pill--active" : ""}`}
                role="tab"
                aria-selected={projectFilter === "all"}
                onClick={() => {
                  setProjectFilter("all");
                  setSearchParams((prev) => {
                    const copy = new URLSearchParams(prev);
                    copy.delete("project");
                    return copy;
                  });
                }}
              >
                All
              </button>
              {projectOptions.map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  className={`sv-pill ${projectFilter === id ? "sv-pill--active" : ""}`}
                  role="tab"
                  aria-selected={projectFilter === id}
                  onClick={() => {
                    setProjectFilter(id);
                    setSearchParams((prev) => {
                      const copy = new URLSearchParams(prev);
                      copy.set("project", id);
                      return copy;
                    });
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {projectFilter !== "all" && !loading && monthSummary ? (
            <div
              className="sv-label sv-label--muted"
              style={{
                fontFamily: "Inter",
                fontSize: 13,
                lineHeight: "18px",
                padding: "8px 0 4px 16px",
              }}
            >
              This month: {formatSummaryHours(monthSummary.hours)} ·{" "}
              {formatMoney(monthSummary.money, monthSummary.currency)}
            </div>
          ) : null}

          {error ? (
            <div className="sv-row" style={{ borderBottom: "none" }}>
              <div className="sv-label sv-label--muted" role="alert">
                {error}
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="sv-row" style={{ borderBottom: "none" }}>
              <div className="sv-label sv-label--muted">Loading…</div>
            </div>
          ) : null}

          {!loading && filtered.length === 0 ? (
            <div className="sv-row" style={{ borderBottom: "none" }}>
              <div className="sv-label sv-label--muted">No entries yet</div>
            </div>
          ) : null}

          {!loading && filtered.length > 0 ? (
            <div className="sv-list">
              {filtered.map((r) => {
                const start = new Date(r.started_at);
                const end = new Date(r.ended_at);
                const sameDay =
                  start.getFullYear() === end.getFullYear() &&
                  start.getMonth() === end.getMonth() &&
                  start.getDate() === end.getDate();
                const title = sameDay
                  ? `${format(start, "MMM d, H:mm")} - ${format(end, "H:mm")}`
                  : `${format(start, "MMM d, H:mm")} - ${format(end, "MMM d, H:mm")}`;
                const projectName = r.projects?.name ?? "Project";
                const avatar = r.projects
                  ? projectAvatarDisplay(r.projects)
                  : projectAvatarDisplay({ id: r.project_id, name: projectName, avatar_color: null, avatar_initial: null });
                return (
                  <div
                    key={r.id}
                    className="sv-row"
                    role="button"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setEditSession(r);
                      setEditOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setEditSession(r);
                        setEditOpen(true);
                      }
                    }}
                  >
                    {projectFilter === "all" ? (
                      <div className="sv-avatar" style={{ background: avatar.color }} aria-label={`Project ${projectName}`}>
                        {avatar.initial}
                      </div>
                    ) : null}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div className="sv-label" style={{ whiteSpace: "normal" }}>
                          {title}
                        </div>
                        <div className="sv-time">{formatHoursMinutes(r.duration_seconds)}</div>
                      </div>
                      <div
                        className="sv-label sv-label--muted"
                        style={{ fontFamily: "Inter", fontSize: 12, marginTop: 2, whiteSpace: "normal" }}
                      >
                        {r.description || "—"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="sv-icon-btn sv-icon-btn--ghost sv-row__delete"
                      aria-label="Delete log"
                      disabled={busyId === r.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        requestDelete(r);
                      }}
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          <EditSessionModal
            open={editOpen}
            session={editSession}
            onClose={() => setEditOpen(false)}
            onSaved={(next) => {
              setRows((prev) => prev.map((r) => (r.id === next.id ? ({ ...r, ...next } as SessionRow) : r)));
            }}
          />

          {deleteTarget ? (
            <DeleteSessionConfirmModal
              session={deleteTarget}
              busy={busyId === deleteTarget.id}
              onKeep={() => setDeleteTarget(null)}
              onConfirm={() => {
                void onDelete(deleteTarget.id).then((ok) => {
                  if (ok) setDeleteTarget(null);
                });
              }}
            />
          ) : null}

          <Toast message={toast} />
        </div>
      </div>
    </div>
  );
}
