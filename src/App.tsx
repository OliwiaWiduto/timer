import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TimerProvider } from "@/contexts/TimerContext";
import { LoginPage } from "@/pages/LoginPage";
import { MainPage } from "@/pages/MainPage";
import { LogsPage } from "@/pages/LogsPage";
import { InvoicePage } from "@/pages/InvoicePage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { InvoicePreviewPage } from "@/pages/InvoicePreviewPage";
import { isSupabaseConfigured } from "@/lib/supabase";
import { UpdateChecker } from "@/components/UpdateChecker";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (!isSupabaseConfigured) {
    return (
      <div style={{ padding: 24, maxWidth: 560, margin: "10vh auto" }}>
        <h1>Configure Supabase</h1>
        <p>
          Create a Supabase project, run <code>supabase/migrations/20250526120000_init.sql</code>, then add
          environment variables:
        </p>
        <ul>
          <li>
            <code>VITE_SUPABASE_URL</code>
          </li>
          <li>
            <code>VITE_SUPABASE_ANON_KEY</code>
          </li>
        </ul>
        <p>Restart the dev server after changing <code>.env</code>.</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Loading…</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return (
    <TimerProvider>
      <UpdateChecker />
      <Outlet />
    </TimerProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {import.meta.env.DEV ? <Route path="/invoice-preview" element={<InvoicePreviewPage />} /> : null}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<MainPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/invoice/:projectId" element={<InvoicePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
