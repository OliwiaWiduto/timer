import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/types/database";
import { NewProjectModal } from "@/components/NewProjectModal";
import { EditProjectModal } from "@/components/EditProjectModal";
import { IconChevronLeft } from "@/components/icons";
import { projectAvatarDisplay } from "@/lib/projectAvatar";
import { formatMoney } from "@/lib/format";

type Project = Database["public"]["Tables"]["projects"]["Row"];

export function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from("projects").select("*").order("name", { ascending: true });
    setLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    setProjects(data ?? []);
  }, [user]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return (
    <div className="sv-app sv-app--shell">
      <div className="sv-shell">
        <div className="sv-shell__header">
          <div className="sv-header">
            <div className="sv-header__center">
              <img className="sv-header__icon" src="/logo.png" alt="Studio Voodoo" />
              <div className="sv-header__title">Studio Voodoo Timer</div>
            </div>
          </div>
        </div>

        <div className="sv-shell__content">
          <div className="sv-topbar">
            <Link to="/" className="sv-icon-btn sv-icon-btn--ghost" aria-label="Back">
              <IconChevronLeft />
            </Link>
            <div className="sv-topbar__title">Projects</div>
            <div style={{ width: 24 }} aria-hidden="true" />
          </div>

          <div className="sv-list" aria-busy={loading ? "true" : "false"}>
            {loading ? (
              <div className="sv-row" style={{ borderBottom: "none" }}>
                <div className="sv-label sv-label--muted">Loading…</div>
              </div>
            ) : null}

            {!loading && projects.length === 0 ? (
              <div className="sv-row" style={{ borderBottom: "none" }}>
                <div className="sv-label sv-label--muted">No projects yet</div>
              </div>
            ) : null}

            {!loading &&
              projects.map((p) => {
                const { color, initial } = projectAvatarDisplay(p);
                return (
                  <div
                    key={p.id}
                    className="sv-row"
                    role="button"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setEditProject(p);
                      setEditOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setEditProject(p);
                        setEditOpen(true);
                      }
                    }}
                  >
                    <div className="sv-avatar" style={{ background: color }} aria-hidden="true">
                      {initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="sv-label">{p.name}</div>
                      <div
                        className="sv-label sv-label--muted"
                        style={{ fontFamily: "Inter", fontSize: 12, marginTop: 2 }}
                      >
                        {formatMoney(Number(p.hourly_rate), p.currency)}/hr
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="sv-shell__footer">
          <div
            className="sv-footer"
            style={{
              paddingTop: 16,
              justifyContent: "flex-start",
              paddingLeft: 16,
              paddingRight: 16,
            }}
          >
            <button type="button" className="sv-link sv-link-btn" onClick={() => setNewOpen(true)}>
              Add new project
            </button>
          </div>
        </div>
      </div>

      <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} onCreated={() => void loadProjects()} />

      <EditProjectModal
        open={editOpen}
        project={editProject}
        onClose={() => setEditOpen(false)}
        onSaved={(next) => {
          setProjects((prev) => prev.map((p) => (p.id === next.id ? next : p)));
        }}
      />
    </div>
  );
}
