import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

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
  const [currency, setCurrency] = useState("USD");
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
    const { error: insErr } = await supabase.from("projects").insert({
      user_id: user.id,
      name: name.trim(),
      client_name: clientName.trim() || null,
      hourly_rate: rate,
      currency: currency.trim() || "USD",
    });
    setBusy(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setName("");
    setClientName("");
    setHourlyRate("100");
    setCurrency("USD");
    onCreated();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 40,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "min(520px, 100%)",
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.35)",
          display: "grid",
          gap: 12,
        }}
      >
        <h2 style={{ marginTop: 0 }}>New project</h2>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Project name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Client name (optional)</span>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Hourly rate</span>
            <input inputMode="decimal" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} required />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Currency</span>
            <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={8} />
          </label>
        </div>
        {error ? (
          <p style={{ color: "#b91c1c", margin: 0 }} role="alert">
            {error}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} disabled={busy}>
            Close
          </button>
          <button
            type="submit"
            disabled={busy}
            style={{ padding: "0.5rem 0.9rem", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none" }}
          >
            {busy ? "Saving…" : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}
