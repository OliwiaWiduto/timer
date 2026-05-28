import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase";

export function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
            <Link to="/" className="sv-link">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      if (mode === "signin") await signIn(email, password);
      else {
        await signUp(email, password);
        setMessage("Check your email to confirm your account if required by your Supabase project.");
      }
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
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className={`sv-btn ${mode === "signin" ? "sv-btn--primary" : ""}`}
              onClick={() => setMode("signin")}
              style={{ flex: 1 }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`sv-btn ${mode === "signup" ? "sv-btn--primary" : ""}`}
              onClick={() => setMode("signup")}
              style={{ flex: 1 }}
            >
              Create account
            </button>
          </div>

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 8 }}>
              <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
                Email
              </span>
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label style={{ display: "grid", gap: 8 }}>
              <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
                Password
              </span>
              <input
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
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
            <button type="submit" className="sv-btn sv-btn--primary" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <Link to="/" className="sv-link">
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
