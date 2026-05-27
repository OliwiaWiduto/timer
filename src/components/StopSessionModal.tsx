import { useEffect, useState } from "react";
import type { StopDraft } from "@/contexts/TimerContext";
import { formatClock } from "@/lib/format";

type Props = {
  draft: StopDraft;
  projectName: string;
  saving: boolean;
  error: string | null;
  onSave: (description: string) => Promise<void>;
  onCancel: () => void;
};

export function StopSessionModal({ draft, projectName, saving, error, onSave, onCancel }: Props) {
  const [description, setDescription] = useState("");

  useEffect(() => {
    setDescription("");
  }, [draft.projectId, draft.startedAt.toISOString(), draft.endedAt.toISOString()]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stop-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.35)",
        }}
      >
        <h2 id="stop-title" style={{ marginTop: 0 }}>
          Log this session
        </h2>
        <p style={{ color: "#475569", marginTop: 0 }}>
          Project <strong>{projectName}</strong> · {formatClock(draft.durationSeconds)} tracked
        </p>
        <label style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <span>What did you do?</span>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short notes for your records and invoices."
          />
        </label>
        {error ? (
          <p style={{ color: "#b91c1c", marginBottom: 0 }} role="alert">
            {error}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" onClick={onCancel} disabled={saving} style={{ padding: "0.5rem 0.9rem", borderRadius: 8 }}>
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave(description)}
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: 8,
              background: "#2563eb",
              color: "#fff",
              border: "none",
              fontWeight: 600,
            }}
          >
            {saving ? "Saving…" : "Save entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
