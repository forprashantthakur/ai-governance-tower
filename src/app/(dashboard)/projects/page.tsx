"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FolderKanban, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Project, ProjectHealthStatus, ProjectStatus } from "@/types";

type PortfolioProject = Pick<Project, "id" | "name" | "status" | "currentPhase" | "healthScore" | "healthStatus" | "description" | "targetDate"> & {
  _count?: { tasks: number; milestones: number };
  updatedAt: string;
};

const PHASE_LABELS: Record<string, string> = {
  BUSINESS_CASE: "Business Case",
  DATA_DISCOVERY: "Data Discovery",
  MODEL_DEVELOPMENT: "Model Dev",
  TESTING_VALIDATION: "Testing",
  DEPLOYMENT: "Deployment",
  MONITORING: "Monitoring",
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  DRAFT: "bg-slate-500/15 text-slate-400",
  ACTIVE: "bg-blue-500/15 text-blue-400",
  ON_HOLD: "bg-amber-500/15 text-amber-400",
  COMPLETED: "bg-green-500/15 text-green-400",
  CANCELLED: "bg-red-500/15 text-red-400",
};

const HEALTH_COLORS: Record<ProjectHealthStatus, string> = {
  HEALTHY: "text-green-400",
  AT_RISK: "text-amber-400",
  CRITICAL: "text-red-400",
  UNKNOWN: "text-slate-400",
};

function HealthGauge({ score, status }: { score: number; status: ProjectHealthStatus }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color =
    status === "HEALTHY" ? "#10b981" : status === "AT_RISK" ? "#f59e0b" : status === "CRITICAL" ? "#ef4444" : "#64748b";
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle
        cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={36} y={40} textAnchor="middle" fontSize={14} fontWeight={700} fill={color}>
        {score}
      </text>
    </svg>
  );
}

function ProjectCard({ project }: { project: PortfolioProject }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer group">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status]}`}>
                {project.status.replace(/_/g, " ")}
              </span>
            </div>
            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
            )}
          </div>
          <HealthGauge score={Math.round(project.healthScore)} status={project.healthStatus} />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {PHASE_LABELS[project.currentPhase] ?? project.currentPhase}
          </span>
          <div className="flex items-center gap-3">
            {project._count && (
              <>
                <span>{project._count.tasks} tasks</span>
                <span>{project._count.milestones} milestones</span>
              </>
            )}
          </div>
        </div>

        {project.targetDate && (
          <div className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
            Target: {new Date(project.targetDate).toLocaleDateString()}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const [allProjects, setAllProjects] = useState<PortfolioProject[]>([]);
  const [portfolio, setPortfolio] = useState<{
    totalProjects: number;
    avgHealthScore: number;
    atRiskCount: number;
    criticalCount: number;
    byStatus: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState("");

  useEffect(() => {
    const token = JSON.parse(localStorage.getItem("ai-governance-auth") ?? "{}").state?.token ?? "";
    fetch("/api/projects/portfolio", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setAllProjects(res.data?.projects ?? []);
          setPortfolio(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const projects = allProjects.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (healthFilter && p.healthStatus !== healthFilter) return false;
    return true;
  });

  const stats = [
    {
      label: "Total Projects", value: portfolio?.totalProjects ?? 0,
      icon: FolderKanban, color: "text-blue-400",
      onClick: () => { setStatusFilter(""); setHealthFilter(""); },
      active: !statusFilter && !healthFilter,
    },
    {
      label: "Avg Health Score", value: portfolio?.avgHealthScore ?? 100,
      icon: TrendingUp, color: "text-green-400", suffix: "%",
      onClick: () => { setStatusFilter(""); setHealthFilter("HEALTHY"); },
      active: healthFilter === "HEALTHY",
    },
    {
      label: "At Risk", value: (portfolio?.atRiskCount ?? 0) + (portfolio?.criticalCount ?? 0),
      icon: AlertTriangle, color: "text-amber-400",
      onClick: () => { setStatusFilter(""); setHealthFilter("AT_RISK"); },
      active: healthFilter === "AT_RISK",
    },
    {
      label: "Active", value: portfolio?.byStatus?.["ACTIVE"] ?? 0,
      icon: CheckCircle2, color: "text-cyan-400",
      onClick: () => { setStatusFilter("ACTIVE"); setHealthFilter(""); },
      active: statusFilter === "ACTIVE",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage AI/ML project lifecycle with MS Project–style tracking
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </Link>
      </div>

      {/* KPI Stats — clickable to filter */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className={`text-left rounded-xl border p-4 transition-all hover:border-primary/60 hover:shadow-md hover:shadow-primary/5 ${
              s.active ? "border-primary/60 bg-primary/5" : "bg-card border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>
              {s.value}{s.suffix ?? ""}
            </div>
            <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100">
              Click to filter ↓
            </p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {["", "ACTIVE", "DRAFT", "ON_HOLD", "COMPLETED"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setHealthFilter(""); }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === s && !healthFilter
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "" ? `All (${allProjects.length})` : `${s.replace(/_/g, " ")} (${portfolio?.byStatus?.[s] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Project Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No projects yet</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Create your first AI project to get started
          </p>
          <Link href="/projects/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Create Project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
