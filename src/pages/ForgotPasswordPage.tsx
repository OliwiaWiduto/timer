import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase";

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setMessage("If an account exists for that email, we've sent a password reset link.");
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
            Reset password
          </div>
          <p className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 13, margin: 0 }}>
            Enter your email and we&apos;ll send you a link to choose a new password.
          </p>

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 4 }}>
            <label style={{ display: "grid", gap: 8 }}>
              <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
                Email
              </span>
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            {error ? (
              <p style={{ color: "rgba(255,255,255,0.85)", margin: 0 }} role="alert">
                {error}
              </p>
            ) : null}
            {message ? (
              <p style={{ color: "rgba(255,255,255,0.85)", margin: 0 }} role="status">
                {message}
              </p>
            ) : null}
            <button type="submit" className="sv-btn sv-btn--primary" disabled={busy || Boolean(message)}>
              {busy ? "Please wait…" : "Send reset link"}
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
