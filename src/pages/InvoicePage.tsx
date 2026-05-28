import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/types/database";
import { downloadInvoicePdf } from "@/lib/invoicePdf";
import { formatClock, formatDateTime, formatMoney, formatShortDate } from "@/lib/format";
import { IconChevronLeft } from "@/components/icons";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  invoices: { invoice_number: number } | null;
};
type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMonthRangeIso(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startIso: toIsoDate(start), endIso: toIsoDate(end) };
}

function formatDisplayDate(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

function DateField({
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  "aria-label": string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    // `showPicker` is supported in some browsers (Chromium).
    // Fallback to focus + click for others.
    (el as unknown as { showPicker?: () => void }).showPicker?.();
    el.focus();
    el.click();
  }, []);

  return (
    <div
      className="sv-datefield"
      aria-label={ariaLabel}
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
    >
      <div className="sv-datefield__value">{formatDisplayDate(value)}</div>
      <input
        ref={inputRef}
        className="sv-datefield__native"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      />
    </div>
  );
}

export function InvoicePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Pick<Project, "id" | "name">[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => getMonthRangeIso().startIso);
  const [endDate, setEndDate] = useState(() => getMonthRangeIso().endIso);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { toast, showToast } = useToast(2000);

  const load = useCallback(async () => {
    if (!user || !projectId) return;
    setLoading(true);
    setError(null);
    const startTs = startDate ? `${startDate}T00:00:00` : null;
    const endTs = endDate ? `${endDate}T23:59:59.999` : null;

    const sessionsQuery = supabase
      .from("sessions")
      .select("*, invoices(invoice_number)")
      .eq("project_id", projectId)
      .order("started_at", { ascending: false });
    const sessionsQueryWithDates =
      startTs && endTs
        ? sessionsQuery.gte("started_at", startTs).lte("started_at", endTs)
        : startTs
          ? sessionsQuery.gte("started_at", startTs)
          : endTs
            ? sessionsQuery.lte("started_at", endTs)
            : sessionsQuery;

    const [{ data: p, error: pErr }, { data: allProjects, error: apErr }, { data: s, error: sErr }, { data: inv, error: iErr }] =
      await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
      supabase.from("projects").select("id, name").order("name", { ascending: true }),
      sessionsQueryWithDates,
      supabase.from("invoices").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    ]);
    setLoading(false);
    if (pErr || apErr || sErr || iErr) {
      setError(pErr?.message ?? apErr?.message ?? sErr?.message ?? iErr?.message ?? "Failed to load");
      return;
    }
    if (!p) {
      setError("Project not found.");
      setProject(null);
      setProjects(allProjects ?? []);
      setSessions([]);
      setInvoices([]);
      return;
    }
    setProject(p);
    setProjects(allProjects ?? []);
    setSessions((s ?? []) as SessionRow[]);
    setInvoices(inv ?? []);
  }, [user, projectId, startDate, endDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredSessions = useMemo(() => sessions, [sessions]);

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
      const msg = rpcErr?.message ?? "Could not create invoice.";
      if (msg.includes("Invalid or already billed session in selection")) {
        showToast("Invalid or already billed session in selection");
      } else {
        setError(msg);
      }
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
      <div className="sv-app">
        <div className="sv-card">
          <div className="sv-header">
            <img className="sv-header__icon" src="/logo.png" alt="Studio Voodoo" />
            <div className="sv-header__title">Studio Voodoo Timer</div>
          </div>
          <div className="sv-form">
            <div className="sv-label">Missing project</div>
            <Link to="/" className="sv-link">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
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
          </div>
        </div>

        <div className="sv-shell__content">
          <div className="sv-topbar">
            <Link to={`/logs?project=${projectId}`} className="sv-icon-btn sv-icon-btn--ghost" aria-label="Back">
              <IconChevronLeft />
            </Link>
            <div className="sv-topbar__title">Invoices</div>
            <div style={{ width: 24 }} aria-hidden="true" />
          </div>

          {error ? (
            <div className="sv-form" style={{ paddingBottom: 0 }}>
              <p style={{ margin: 0 }} role="alert">
                {error}
              </p>
            </div>
          ) : null}

          {loading ? (
            <div className="sv-row" style={{ borderBottom: "none" }}>
              <div className="sv-label sv-label--muted">Loading…</div>
            </div>
          ) : null}

          {!loading && project ? (
            <div className="sv-form">
              <label style={{ display: "grid", gap: 6, width: "100%" }}>
                <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12 }}>
                  Project
                </span>
                <select
                  value={projectId}
                  aria-label="Select project"
                  onChange={(e) => {
                    const nextId = e.target.value;
                    if (nextId && nextId !== projectId) navigate(`/invoice/${nextId}`);
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: "flex", flexWrap: "nowrap", gap: 12, alignItems: "flex-end" }}>
                <label style={{ display: "grid", gap: 6, width: "100%", gridTemplateColumns: "repeat(1, 1fr)", gridTemplateRows: "repeat(1, 1fr)" }}>
                  <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12 }}>
                    From
                  </span>
                  <DateField value={startDate} onChange={setStartDate} aria-label="From date" />
                </label>
                <label style={{ display: "grid", gap: 6, width: "100%", gridTemplateColumns: "repeat(1, 1fr)", gridTemplateRows: "repeat(1, 1fr)" }}>
                  <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12 }}>
                    To
                  </span>
                  <DateField value={endDate} onChange={setEndDate} aria-label="To date" />
                </label>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12 }}>
                  No sessions for this project.
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: "Inter", fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={selected.size === filteredSessions.length && filteredSessions.length > 0}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                      Select all (filtered)
                    </label>
                    <div style={{ fontFamily: "Inter", fontSize: 12, fontWeight: 600 }}>
                      Estimated total: {formatMoney(estimatedTotal, project.currency)}
                    </div>
                  </div>

                  <div style={{ overflow: "auto", border: `1px solid var(--sv-border)`, borderRadius: 8 }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 40 }} />
                          <th>When</th>
                          <th>Duration</th>
                          <th>Description</th>
                          <th style={{ width: 120, textAlign: "right" }}>Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSessions.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selected.has(r.id)}
                                onChange={() => toggle(r.id)}
                              />
                            </td>
                            <td>
                              <div>{formatDateTime(r.started_at)}</div>
                              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>to {formatDateTime(r.ended_at)}</div>
                            </td>
                            <td style={{ fontVariantNumeric: "tabular-nums" }}>{formatClock(r.duration_seconds)}</td>
                            <td>{r.description || "—"}</td>
                            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                              {r.invoices?.invoice_number ? `#${r.invoices.invoice_number}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    className="sv-btn sv-btn--primary"
                    disabled={busy || selectedList.length === 0}
                    onClick={() => void onCreateInvoice()}
                  >
                    {busy ? "Working…" : "Create invoice + download PDF"}
                  </button>
                </>
              )}

              <div className="sv-label" style={{ fontFamily: "Inter", fontSize: 14, fontWeight: 500, marginTop: 10 }}>
                Invoice history
              </div>
              {invoices.length === 0 ? (
                <div className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12 }}>
                  No invoices yet.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {invoices.map((inv) => (
                    <div key={inv.id} className="sv-row" style={{ border: `1px solid var(--sv-border)`, borderRadius: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "Inter", fontWeight: 600 }}>Invoice #{inv.invoice_number}</div>
                        <div className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12 }}>
                          {formatShortDate(inv.created_at)}
                        </div>
                      </div>
                      <div style={{ fontFamily: "Inter", fontWeight: 700 }}>
                        {formatMoney(Number(inv.total_amount), project.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
      <Toast message={toast} />
    </div>
  );
}
