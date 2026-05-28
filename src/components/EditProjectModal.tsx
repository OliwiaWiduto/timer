import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { IconChevronLeft } from "@/components/icons";
import { PROJECT_AVATAR_COLORS, projectAvatarDisplay } from "@/lib/projectAvatar";
import type { Database } from "@/types/database";

type Project = Database["public"]["Tables"]["projects"]["Row"];

type Props = {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onSaved: (next: Project) => void;
};

export function EditProjectModal({ open, project, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [avatarColor, setAvatarColor] = useState<string>(PROJECT_AVATAR_COLORS[0]);
  const [avatarInitial, setAvatarInitial] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !project) return;
    const display = projectAvatarDisplay(project);
    setName(project.name);
    setHourlyRate(String(project.hourly_rate));
    setAvatarColor(display.color);
    setAvatarInitial(display.initial);
    setError(null);
    setBusy(false);
  }, [open, project?.id]);

  if (!open || !project) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !project) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a project name.");
      return;
    }
    const rate = Number(hourlyRate);
    if (!Number.isFinite(rate) || rate < 0) {
      setError("Enter a valid hourly rate.");
      return;
    }
    const initial = avatarInitial.trim().slice(0, 1).toUpperCase() || trimmed[0]?.toUpperCase() || "P";

    setBusy(true);
    setError(null);
    const { data, error: updErr } = await supabase
      .from("projects")
      .update({
        name: trimmed,
        hourly_rate: rate,
        avatar_color: avatarColor,
        avatar_initial: initial,
      })
      .eq("id", project.id)
      .select("*")
      .single();
    setBusy(false);
    if (updErr || !data) {
      setError(updErr?.message ?? "Failed to update project.");
      return;
    }
    onSaved(data as Project);
    onClose();
  }

  return (
    <div className="sv-overlay" role="dialog" aria-modal="true" aria-label="Edit project">
      <form className="sv-modal" onSubmit={save}>
        <div className="sv-header">
          <img className="sv-header__icon" src="/logo.png" alt="Studio Voodoo" />
          <div className="sv-header__title">Studio Voodoo Timer</div>
        </div>

        <div className="sv-topbar">
          <button type="button" className="sv-icon-btn sv-icon-btn--ghost" onClick={onClose} aria-label="Back" disabled={busy}>
            <IconChevronLeft />
          </button>
          <div className="sv-topbar__title">Edit project</div>
          <div style={{ width: 24 }} aria-hidden="true" />
        </div>

        <div className="sv-form">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="sv-avatar" style={{ background: avatarColor, width: 40, height: 40, fontSize: 16 }}>
              {avatarInitial.trim().slice(0, 1).toUpperCase() || "?"}
            </div>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12 }}>
              Preview
            </span>
          </div>

          <label style={{ display: "grid", gap: 8 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              Name
            </span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              Hourly rate
            </span>
            <input
              inputMode="decimal"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              required
            />
          </label>

          <div style={{ display: "grid", gap: 8 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              Colour
            </span>
            <div className="sv-color-swatches" role="listbox" aria-label="Avatar colour">
              {PROJECT_AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="option"
                  aria-selected={avatarColor === c}
                  className={`sv-color-swatch ${avatarColor === c ? "sv-color-swatch--active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setAvatarColor(c)}
                />
              ))}
            </div>
          </div>

          <label style={{ display: "grid", gap: 8 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              Initial
            </span>
            <input
              value={avatarInitial}
              onChange={(e) => setAvatarInitial(e.target.value.slice(0, 1))}
              maxLength={1}
              placeholder="A"
              style={{ width: 72, textAlign: "center", textTransform: "uppercase" }}
            />
          </label>

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
          <button type="submit" className="sv-btn sv-btn--primary" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
