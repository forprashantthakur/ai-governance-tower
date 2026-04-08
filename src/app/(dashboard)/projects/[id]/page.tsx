"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle, Clock, AlertTriangle, FlaskConical, Link2 } from "lucide-react";
import type { Project, ProjectPhaseRecord, Milestone, ProjectAIModel } from "@/types";

const PHASES = [
  { key: "BUSINESS_CASE", label: "Business Case" },
  { key: "DATA_DISCOVERY", label: "Data Discovery" },
  { key: "MODEL_DEVELOPMENT", label: "Model Dev" },
  { key: "TESTING_VALIDATION", label: "Testing" },
  { key: "DEPLOYMENT", label: "Deployment" },
  { key: "MONITORING", label: "Monitoring" },
];

function PhaseBar({ phase, record }: { phase: { key: string; label: string }; record?: ProjectPhaseRecord }) {
  const progress = record?.progress ?? 0;
  const isDone = record?.status === "DONE" || progress === 100;
  const isActive = record?.status === "IN_PROGRESS";

  return (
    <div className={`flex-1 min-w-0 rounded-lg border p-3 ${
      isDone ? "border-green-500/30 bg-green-500/5" :
      isActive ? "border-primary/30 bg-primary/5" :
      "border-border bg-card"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        {isDone ? (
          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
        ) : isActive ? (
          <Clock className="h-4 w-4 text-primary shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs font-semibold truncate">{phase.label}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isDone ? "bg-green-500" : isActive ? "bg-primary" : "bg-muted-foreground/30"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground mt-1">{progress}%</div>
    </div>
  );
}

export default function ProjectOverviewPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project & {
    phases?: ProjectPhaseRecord[];
    milestones?: Milestone[];
    linkedModels?: ProjectAIModel[];
    _count?: { tasks: number; experiments: number; milestones: number; workflows: number };
  } | null>(null);
  const [tasks, setTasks] = useState<{ status: string }[]>([]);
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`/api/projects/${params.id}`, { headers: h }),
      fetch(`/api/projects/${params.id}/tasks`, { headers: h }),
    ])
      .then(([r1, r2]) => Promise.all([r1.json(), r2.json()]))
      .then(([p, t]) => {
        setProject(p.data);
        setTasks(t.data ?? []);
      });
  }, [params.id]);

  if (!project) {
    return (
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const done = tasks.filter((t) => t.status === "DONE").length;
  const total = tasks.length;
  const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
  const overdue = project.milestones?.filter(
    (m) => !m.completedAt && new Date(m.targetDate) < new Date()
  ).length ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tasks Complete", value: `${done}/${total}`, sub: total > 0 ? `${Math.round((done / total) * 100)}%` : "0%", color: "text-green-400" },
          { label: "Blocked Tasks", value: blocked, sub: "Need attention", color: blocked > 0 ? "text-red-400" : "text-slate-400" },
          { label: "Experiments", value: project._count?.experiments ?? 0, sub: "Tracked runs", color: "text-purple-400" },
          { label: "Overdue Milestones", value: overdue, sub: "Past target date", color: overdue > 0 ? "text-amber-400" : "text-slate-400" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Phase Progress */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Phase Progress</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {PHASES.map((ph) => (
            <PhaseBar
              key={ph.key}
              phase={ph}
              record={project.phases?.find((r) => r.phase === ph.key)}
            />
          ))}
        </div>
      </div>

      {/* Milestones */}
      {(project.milestones?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Milestones</h3>
          <div className="space-y-2">
            {project.milestones!.map((m) => {
              const isPast = !m.completedAt && new Date(m.targetDate) < new Date();
              return (
                <div key={m.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                  m.completedAt ? "border-green-500/20 bg-green-500/5" :
                  isPast ? "border-red-500/20 bg-red-500/5" :
                  "border-border bg-card"
                }`}>
                  {m.completedAt ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  ) : isPast ? (
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.completedAt
                        ? `Completed ${new Date(m.completedAt).toLocaleDateString()}`
                        : `Target: ${new Date(m.targetDate).toLocaleDateString()}`}
                    </div>
                  </div>
                  {m.isGate && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      Gate
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Linked AI Models */}
      {(project.linkedModels?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Linked AI Models</h3>
          <div className="flex flex-wrap gap-2">
            {project.linkedModels!.map((lm) => (
              <Link key={lm.modelId} href={`/models`} className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg hover:border-primary/40 transition-colors text-sm">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{lm.model?.name ?? lm.modelId}</span>
                <span className="text-xs text-muted-foreground">{lm.role}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Open Kanban", href: "kanban", color: "border-blue-500/30 hover:bg-blue-500/5" },
          { label: "View Gantt", href: "gantt", color: "border-purple-500/30 hover:bg-purple-500/5" },
          { label: "Add Experiment", href: "experiments", color: "border-teal-500/30 hover:bg-teal-500/5" },
          { label: "Edit Workflow", href: "workflow", color: "border-cyan-500/30 hover:bg-cyan-500/5" },
        ].map((a) => (
          <Link
            key={a.href}
            href={`/projects/${params.id}/${a.href}`}
            className={`p-4 text-center text-sm font-medium border rounded-xl transition-colors ${a.color}`}
          >
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
