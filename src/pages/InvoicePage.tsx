import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/types/database";
import { downloadInvoicePdf } from "@/lib/invoicePdf";
import { formatClock, formatDateTime, formatMoney, formatShortDate } from "@/lib/format";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];

export function InvoicePage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!user || !projectId) return;
    setLoading(true);
    setError(null);
    const [{ data: p, error: pErr }, { data: s, error: sErr }, { data: inv, error: iErr }] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
      supabase
        .from("sessions")
        .select("*")
        .eq("project_id", projectId)
        .eq("billing_status", "unbilled")
        .order("started_at", { ascending: true }),
      supabase.from("invoices").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    ]);
    setLoading(false);
    if (pErr || sErr || iErr) {
      setError(pErr?.message ?? sErr?.message ?? iErr?.message ?? "Failed to load");
      return;
    }
    if (!p) {
      setError("Project not found.");
      setProject(null);
      setSessions([]);
      setInvoices([]);
      return;
    }
    setProject(p);
    setSessions(s ?? []);
    setInvoices(inv ?? []);
  }, [user, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((row) => {
      const t = new Date(row.started_at).getTime();
      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`).getTime();
        if (t < start) return false;
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999`).getTime();
        if (t > end) return false;
      }
      return true;
    });
  }, [sessions, startDate, endDate]);

  useEffect(() => {
    setSelected(new Set(filteredSessions.map((r) => r.id)));
  }, [filteredSessions]);

  const selectedList = useMemo(() => filteredSessions.filter((r) => selected.has(r.id)), [filteredSessions, selected]);

  const estimatedTotal = useMemo(() => {
    if (!project) return 0;
    const rate = Number(project.hourly_rate);
    return selectedList.reduce((sum, r) => sum + (r.duration_seconds / 3600) * rate, 0);
  }, [project, selectedList]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(filteredSessions.map((r) => r.id)));
    else setSelected(new Set());
  }

  async function onCreateInvoice() {
    if (!projectId || !project) return;
    const ids = [...selected];
    if (!ids.length) {
      setError("Select at least one session.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data: invoiceId, error: rpcErr } = await supabase.rpc("finalize_invoice", {
      p_project_id: projectId,
      p_session_ids: ids,
    });
    if (rpcErr || !invoiceId) {
      setError(rpcErr?.message ?? "Could not create invoice.");
      setBusy(false);
      return;
    }

    const { data: inv, error: invErr } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
    const { data: lines, error: lineErr } = await supabase
      .from("invoice_lines")
      .select("*, sessions(*)")
      .eq("invoice_id", invoiceId);
    setBusy(false);
    if (invErr || lineErr || !inv || !lines) {
      setError(invErr?.message ?? lineErr?.message ?? "Invoice created but PDF download failed.");
      await load();
      return;
    }

    const pdfRows = lines
      .map((line) => {
        const session = line.sessions as SessionRow | null;
        if (!session) return null;
        return {
          startedAt: session.started_at,
          endedAt: session.ended_at,
          description: session.description,
          hours: Number(line.hours),
          lineTotal: Number(line.line_total),
        };
      })
      .filter(Boolean) as Parameters<typeof downloadInvoicePdf>[0]["rows"];

    downloadInvoicePdf(
      {
        projectName: project.name,
        clientName: project.client_name,
        clientEmail: project.client_email,
        billingAddress: project.billing_address,
        invoiceNumber: inv.invoice_number,
        currency: project.currency,
        rate: Number(project.hourly_rate),
        rows: pdfRows,
        total: Number(inv.total_amount),
      },
      `invoice-${inv.invoice_number}.pdf`,
    );

    await load();
  }

  if (!projectId) {
    return (
      <div style={{ padding: 24 }}>
        <p>Missing project.</p>
        <Link to="/">Home</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0 }}>Invoice</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>
            {project ? (
              <>
                Project <strong>{project.name}</strong> · defaults to{" "}
                <strong>unbilled sessions only</strong> so you do not double-bill.
              </>
            ) : (
              "Loading…"
            )}
          </p>
        </div>
        <Link to="/">Back</Link>
      </header>

      {error ? (
        <p style={{ color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <p>Loading…</p> : null}

      {!loading && project ? (
        <>
          <section style={{ marginTop: 20, padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
            <h2 style={{ marginTop: 0 }}>Unbilled sessions</h2>
            <p style={{ color: "#64748b", marginTop: 0 }}>
              Optional date filters only hide rows in this view; they still must be unbilled to appear here.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span>From</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span>To</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
              <button type="button" onClick={() => { setStartDate(""); setEndDate(""); }}>
                Clear dates
              </button>
            </div>

            {filteredSessions.length === 0 ? (
              <p style={{ marginTop: 16 }}>No unbilled sessions for this project.</p>
            ) : (
              <>
                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={selected.size === filteredSessions.length && filteredSessions.length > 0}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                    Select all (filtered)
                  </label>
                  <div style={{ fontWeight: 600 }}>
                    Estimated total: {formatMoney(estimatedTotal, project.currency)}
                  </div>
                </div>

                <div style={{ marginTop: 10, border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40 }} />
                        <th>When</th>
                        <th>Duration</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSessions.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                          </td>
                          <td>
                            <div>{formatDateTime(r.started_at)}</div>
                            <div style={{ color: "#64748b", fontSize: 13 }}>to {formatDateTime(r.ended_at)}</div>
                          </td>
                          <td style={{ fontVariantNumeric: "tabular-nums" }}>{formatClock(r.duration_seconds)}</td>
                          <td>{r.description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  disabled={busy || selectedList.length === 0}
                  onClick={() => void onCreateInvoice()}
                  style={{
                    marginTop: 14,
                    padding: "0.65rem 1rem",
                    borderRadius: 8,
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    fontWeight: 700,
                  }}
                >
                  {busy ? "Working…" : "Create invoice + download PDF"}
                </button>
              </>
            )}
          </section>

          <section style={{ marginTop: 24 }}>
            <h2>Invoice history</h2>
            {invoices.length === 0 ? <p style={{ color: "#64748b" }}>No invoices yet.</p> : null}
            {invoices.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                {invoices.map((inv) => (
                  <li
                    key={inv.id}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <strong>Invoice #{inv.invoice_number}</strong>
                      <div style={{ color: "#64748b", fontSize: 14 }}>{formatShortDate(inv.created_at)}</div>
                    </div>
                    <div style={{ fontWeight: 700 }}>{formatMoney(Number(inv.total_amount), project.currency)}</div>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
