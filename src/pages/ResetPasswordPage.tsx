import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase";

export function ResetPasswordPage() {
  const { session, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <div className="sv-app">
        <div className="sv-card" style={{ width: 420 }}>
          <div className="sv-header">
            <img className="sv-header__icon" src="/logo.png" alt="Studio Voodoo" />
            <div className="sv-header__title">Studio Voodoo Timer</div>
          </div>
          <div className="sv-form">
            <div className="sv-label" style={{ fontFamily: "Inter", fontSize: 14, fontWeight: 500 }}>
              Configure Supabase
            </div>
            <div className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12 }}>
              Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`, then restart the dev server.
            </div>
            <Link to="/login" className="sv-link">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="sv-app">
        <div className="sv-card" style={{ width: 420 }}>
          <p className="sv-label sv-label--muted" style={{ margin: 0 }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ message: "Reset link is invalid or has expired. Request a new one from the sign-in page." }}
      />
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setBusy(true);
    try {
      await updatePassword(password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sv-app">
      <div className="sv-card" style={{ width: 420 }}>
        <div className="sv-header">
          <img className="sv-header__icon" src="/logo.png" alt="Studio Voodoo" />
          <div className="sv-header__title">Studio Voodoo Timer</div>
        </div>

        <div className="sv-form">
          <div
            className="sv-topbar__title"
            style={{ fontSize: 20, fontWeight: 500, fontFamily: '"Crimson Pro", serif' }}
          >
            Choose a new password
          </div>

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 4 }}>
            <label style={{ display: "grid", gap: 8 }}>
              <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
                New password
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </label>
            <label style={{ display: "grid", gap: 8 }}>
              <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
                Confirm password
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </label>
            {error ? (
              <p style={{ color: "rgba(255,255,255,0.85)", margin: 0 }} role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className="sv-btn sv-btn--primary" disabled={busy}>
              {busy ? "Please wait…" : "Update password"}
            </button>
          </form>

          <p
            className="sv-label sv-label--muted"
            style={{ fontFamily: "Inter", fontSize: 13, margin: 0, textAlign: "center" }}
          >
            <Link to="/login" className="sv-link">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
