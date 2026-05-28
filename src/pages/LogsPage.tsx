import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/types/database";
import { formatClock } from "@/lib/format";
import { IconChevronLeft, IconTrash } from "@/components/icons";
import { format } from "date-fns";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  projects: { name: string } | null;
};

export function LogsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("sessions")
      .select("*, projects(name)")
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
    async (id: string) => {
      if (!user) return;
      setBusyId(id);
      setError(null);
      const { error } = await supabase.from("sessions").delete().eq("id", id);
      setBusyId(null);
      if (error) {
        console.error(error);
        setError(error.message);
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
    },
    [user],
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
                const title = `${format(start, "MMM d, H:mm")} - ${format(end, "H:mm")}`;
                return (
                  <div key={r.id} className="sv-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div className="sv-label" style={{ whiteSpace: "normal" }}>
                          {title}
                        </div>
                        <div className="sv-time">{formatClock(r.duration_seconds).slice(3)}</div>
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
                      onClick={() => onDelete(r.id)}
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
