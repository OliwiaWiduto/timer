import { format } from "date-fns";
import type { Database } from "@/types/database";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

function formatDeleteTarget(session: SessionRow): string {
  const date = format(new Date(session.started_at), "MMM d");
  const desc = session.description.trim();
  return desc ? `${date} ${desc}` : date;
}

type Props = {
  session: SessionRow;
  busy: boolean;
  onKeep: () => void;
  onConfirm: () => void;
};

export function DeleteSessionConfirmModal({ session, busy, onKeep, onConfirm }: Props) {
  return (
    <div className="sv-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-session-title">
      <div className="sv-modal">
        <div className="sv-form">
          <p id="delete-session-title" className="sv-label" style={{ whiteSpace: "normal", margin: 0 }}>
            Are you sure you want to delete {formatDeleteTarget(session)}?
          </p>
        </div>
        <div className="sv-actions">
          <button type="button" className="sv-btn" onClick={onKeep} disabled={busy}>
            Keep
          </button>
          <button type="button" className="sv-btn sv-btn--danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
