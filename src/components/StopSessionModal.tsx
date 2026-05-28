import { useEffect, useState } from "react";
import type { StopDraft } from "@/contexts/TimerContext";
import { formatClock } from "@/lib/format";
import { IconPlay } from "@/components/icons";

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
    <div className="sv-overlay" role="dialog" aria-modal="true" aria-label="Stop timer">
      <div className="sv-modal">
        <div className="sv-header">
          <img className="sv-header__icon" src="/logo.png" alt="Studio Voodoo" />
          <div className="sv-header__title">Studio Voodoo Timer</div>
        </div>

        <div className="sv-list">
          <div className="sv-row sv-row--active" style={{ borderBottom: "none" }}>
            <div className="sv-row__left">
              <div className="sv-icon-btn" aria-hidden="true">
                <IconPlay />
              </div>
              <div className="sv-label">{projectName}</div>
            </div>
            <div className="sv-time">{formatClock(draft.durationSeconds).slice(3)}</div>
          </div>
        </div>

        <div className="sv-form">
          <label style={{ display: "grid", gap: 8 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              Description
            </span>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Here is what I did today"
              style={{ resize: "none" }}
            />
          </label>
          {error ? (
            <p style={{ color: "rgba(255,255,255,0.85)", margin: 0 }} role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="sv-actions">
          <button type="button" className="sv-btn" onClick={onCancel} disabled={saving}>
            Discard
          </button>
          <button type="button" className="sv-btn sv-btn--primary" disabled={saving} onClick={() => void onSave(description)}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
