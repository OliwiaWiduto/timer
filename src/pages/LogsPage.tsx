import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/types/database";
import { formatClock, formatDateTime } from "@/lib/format";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  projects: { name: string } | null;
};

export function LogsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sessions")
      .select("*, projects(name)")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    setRows((data ?? []) as SessionRow[]);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

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
    return rows.filter((r) => r.project_id === projectFilter);
  }, [rows, projectFilter]);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Time logs</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>Every saved session appears here.</p>
        </div>
        <Link to="/">Back to timer</Link>
      </header>

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>Project</span>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="all">All projects</option>
            {projectOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? <p>Loading…</p> : null}

      {!loading && filtered.length === 0 ? <p>No entries yet.</p> : null}

      {!loading && filtered.length > 0 ? (
        <div style={{ marginTop: 16, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>When</th>
                <th>Duration</th>
                <th>Description</th>
                <th>Billing</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.projects?.name ?? "—"}</td>
                  <td>
                    <div>{formatDateTime(r.started_at)}</div>
                    <div style={{ color: "#64748b", fontSize: 13 }}>to {formatDateTime(r.ended_at)}</div>
                  </td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{formatClock(r.duration_seconds)}</td>
                  <td>{r.description || "—"}</td>
                  <td>{r.billing_status === "billed" ? "Billed" : "Unbilled"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
