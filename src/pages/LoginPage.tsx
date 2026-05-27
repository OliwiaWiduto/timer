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
      <div style={{ padding: 24, maxWidth: 420, margin: "10vh auto" }}>
        <h1>Freelance Timer</h1>
        <p>Add Supabase environment variables to sign in.</p>
        <Link to="/">Home</Link>
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
    <div style={{ maxWidth: 420, margin: "10vh auto", padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Freelance Timer</h1>
      <p style={{ color: "#475569" }}>Sign in to sync projects and time entries across your Macs.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setMode("signin")}
          style={{
            flex: 1,
            padding: "0.5rem",
            borderRadius: 8,
            border: mode === "signin" ? "2px solid #2563eb" : "1px solid #cbd5e1",
            background: mode === "signin" ? "#eff6ff" : "#fff",
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          style={{
            flex: 1,
            padding: "0.5rem",
            borderRadius: 8,
            border: mode === "signup" ? "2px solid #2563eb" : "1px solid #cbd5e1",
            background: mode === "signup" ? "#eff6ff" : "#fff",
          }}
        >
          Create account
        </button>
      </div>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Password</span>
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
          <p style={{ color: "#b91c1c", margin: 0 }} role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p style={{ color: "#15803d", margin: 0 }} role="status">
            {message}
          </p>
        ) : null}
        <button type="submit" disabled={busy} style={{ padding: "0.65rem", borderRadius: 8, fontWeight: 600 }}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      <p style={{ marginTop: 24 }}>
        <Link to="/">Back</Link>
      </p>
    </div>
  );
}
