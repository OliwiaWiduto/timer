import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { IconChevronLeft } from "@/components/icons";
import { formatHoursMinutes } from "@/lib/format";
import type { Database } from "@/types/database";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

type Props = {
  open: boolean;
  session: SessionRow | null;
  onClose: () => void;
  onSaved: (next: SessionRow) => void;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalDateTimeInputValue(d: Date) {
  // datetime-local uses local time without timezone info: YYYY-MM-DDTHH:mm
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function parseLocalDateTimeInputValue(v: string) {
  // Parse "YYYY-MM-DDTHH:mm" explicitly as *local time*.
  // `new Date(value)` is inconsistent across browsers/timezones for datetime-local strings.
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const [, ys, mos, ds, hs, mins] = m;
  const y = Number(ys);
  const mo = Number(mos);
  const d = Number(ds);
  const h = Number(hs);
  const min = Number(mins);
  if (![y, mo, d, h, min].every(Number.isFinite)) return null;
  const dt = new Date(y, mo - 1, d, h, min, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function EditSessionModal({ open, session, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !session) return;
    setStart(toLocalDateTimeInputValue(new Date(session.started_at)));
    setEnd(toLocalDateTimeInputValue(new Date(session.ended_at)));
    setError(null);
    setBusy(false);
  }, [open, session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const computed = useMemo(() => {
    const s = parseLocalDateTimeInputValue(start);
    const e = parseLocalDateTimeInputValue(end);
    if (!s || !e) return { ok: false as const, message: "Enter valid start and end times." };
    const diffMs = e.getTime() - s.getTime();
    const seconds = Math.floor(diffMs / 1000);
    if (seconds <= 0) return { ok: false as const, message: "End time must be after start time." };
    return { ok: true as const, seconds, startedAt: s, endedAt: e };
  }, [start, end]);

  if (!open || !session) return null;

  async function save() {
    if (!user) return;
    if (!session) return;
    setError(null);
    if (!computed.ok) {
      setError(computed.message);
      return;
    }
    setBusy(true);
    const { startedAt, endedAt, seconds } = computed;
    const { data, error: updErr } = await supabase
      .from("sessions")
      .update({
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_seconds: seconds,
      })
      .eq("id", session.id)
      .select("*")
      .single();
    setBusy(false);
    if (updErr || !data) {
      setError(updErr?.message ?? "Failed to update session.");
      return;
    }
    onSaved(data as SessionRow);
    onClose();
  }

  return (
    <div className="sv-overlay" role="dialog" aria-modal="true" aria-label="Edit session">
      <div className="sv-modal">
        <div className="sv-header">
          <img className="sv-header__icon" src="/logo.png" alt="Studio Voodoo" />
          <div className="sv-header__title">Studio Voodoo Timer</div>
        </div>

        <div className="sv-topbar">
          <button type="button" className="sv-icon-btn sv-icon-btn--ghost" onClick={onClose} aria-label="Back" disabled={busy}>
            <IconChevronLeft />
          </button>
          <div className="sv-topbar__title">Edit session</div>
          <div style={{ width: 24 }} aria-hidden="true" />
        </div>

        <div className="sv-form">
          <label style={{ display: "grid", gap: 8 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              Start
            </span>
            <input
              className="sv-datetime"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: 8, marginTop: 10 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              End
            </span>
            <input
              className="sv-datetime"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>

          <div className="sv-row" style={{ marginTop: 10, borderBottom: "none" }}>
            <div className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12 }}>
              New duration
            </div>
            <div className="sv-time">
              {computed.ok ? formatHoursMinutes(computed.seconds) : "—"}
            </div>
          </div>

          {error ? (
            <p style={{ color: "rgba(255,255,255,0.85)", margin: 0 }} role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="sv-actions">
          <button type="button" className="sv-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="sv-btn sv-btn--primary" onClick={() => void save()} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

