import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { PROJECT_AVATAR_COLORS, defaultAvatarInitial } from "@/lib/projectAvatar";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function NewProjectModal({ open, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("100");
  const [currency, setCurrency] = useState("GBP");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    const rate = Number(hourlyRate);
    if (!Number.isFinite(rate) || rate < 0) {
      setError("Enter a valid hourly rate.");
      setBusy(false);
      return;
    }
    const trimmedName = name.trim();
    const { error: insErr } = await supabase.from("projects").insert({
      user_id: user.id,
      name: trimmedName,
      client_name: clientName.trim() || null,
      hourly_rate: rate,
      currency: currency.trim() || "GBP",
      avatar_color: PROJECT_AVATAR_COLORS[Math.floor(Math.random() * PROJECT_AVATAR_COLORS.length)],
      avatar_initial: defaultAvatarInitial(trimmedName),
    });
    setBusy(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setName("");
    setClientName("");
    setHourlyRate("100");
    setCurrency("GBP");
    onCreated();
    onClose();
  }

  return (
    <div className="sv-overlay" role="dialog" aria-modal="true" aria-label="Add new project">
      <form className="sv-modal" onSubmit={submit}>
        <div className="sv-header">
          <img className="sv-header__icon" src="/logo.png" alt="Studio Voodoo" />
          <div className="sv-header__title">Studio Voodoo Timer</div>
        </div>

        <div className="sv-form">
          <label style={{ display: "grid", gap: 8 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              Name
            </span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My new project" required />
          </label>

          <div style={{ display: "none" }}>
            <label>
              Client name
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </label>
            <label>
              Hourly rate
              <input inputMode="decimal" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} required />
            </label>
            <label>
              Currency
              <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={8} />
            </label>
          </div>

          {error ? (
            <p style={{ color: "rgba(255,255,255,0.85)", margin: 0 }} role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="sv-actions">
          <button type="button" className="sv-btn" onClick={onClose} disabled={busy}>
            Discard
          </button>
          <button type="submit" className="sv-btn sv-btn--primary" disabled={busy}>
            {busy ? "Saving…" : "Add project"}
          </button>
        </div>
      </form>
    </div>
  );
}
