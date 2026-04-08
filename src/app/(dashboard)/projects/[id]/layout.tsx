"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ArrowLeft, LayoutDashboard, GanttChart, Columns3, Users, FlaskConical, Workflow, Settings } from "lucide-react";
import type { Project } from "@/types";
import { useProjectStore } from "@/store/project.store";

const TABS = [
  { label: "Overview", path: "", icon: LayoutDashboard },
  { label: "Gantt", path: "/gantt", icon: GanttChart },
  { label: "Kanban", path: "/kanban", icon: Columns3 },
  { label: "Resources", path: "/resources", icon: Users },
  { label: "Experiments", path: "/experiments", icon: FlaskConical },
  { label: "Workflow", path: "/workflow", icon: Workflow },
  { label: "Settings", path: "/settings", icon: Settings },
];

const HEALTH_COLOR: Record<string, string> = {
  HEALTHY: "text-green-400 bg-green-400/10",
  AT_RISK: "text-amber-400 bg-amber-400/10",
  CRITICAL: "text-red-400 bg-red-400/10",
  UNKNOWN: "text-slate-400 bg-slate-400/10",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "text-slate-400 bg-slate-400/10",
  ACTIVE: "text-blue-400 bg-blue-400/10",
  ON_HOLD: "text-amber-400 bg-amber-400/10",
  COMPLETED: "text-green-400 bg-green-400/10",
  CANCELLED: "text-red-400 bg-red-400/10",
};

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const { setActiveProject } = useProjectStore();
  const [project, setProject] = useState<Project | null>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  useEffect(() => {
    fetch(`/api/projects/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setProject(d.data);
          setActiveProject(d.data);
        }
      });
  }, [params.id, token]);

  const baseHref = `/projects/${params.id}`;

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div className="border-b border-border bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/projects" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm truncate">{project?.name ?? "Loading…"}</h2>
              {project && (
                <>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[project.status]}`}>
                    {project.status.replace(/_/g, " ")}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${HEALTH_COLOR[project.healthStatus]}`}>
                    Health: {Math.round(project.healthScore)}
                  </span>
                </>
              )}
            </div>
            {project && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Phase: {project.currentPhase.replace(/_/g, " ")}
                {project.targetDate && ` · Due ${new Date(project.targetDate).toLocaleDateString()}`}
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map(({ label, path, icon: Icon }) => {
            const href = `${baseHref}${path}`;
            const isActive = path === ""
              ? pathname === baseHref || pathname === `${baseHref}/`
              : pathname.startsWith(href);
            return (
              <Link
                key={path}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
