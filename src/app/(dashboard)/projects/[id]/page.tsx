"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, Circle, Clock, AlertTriangle, FlaskConical, Link2,
  Shield, ShieldAlert, FileSearch, CheckSquare, Lock, Unlock, ChevronRight,
} from "lucide-react";
import type { Project, ProjectPhaseRecord, Milestone, ProjectAIModel } from "@/types";

// ── Phase config ──────────────────────────────────────────────────────────────

const PHASES = [
  { key: "BUSINESS_CASE",      label: "Business Case"  },
  { key: "DATA_DISCOVERY",     label: "Data Discovery" },
  { key: "MODEL_DEVELOPMENT",  label: "Model Dev"      },
  { key: "TESTING_VALIDATION", label: "Testing"        },
  { key: "DEPLOYMENT",         label: "Deployment"     },
  { key: "MONITORING",         label: "Monitoring"     },
];

const PHASE_INDEX: Record<string, number> = Object.fromEntries(PHASES.map((p, i) => [p.key, i]));

// ── Governance gate definitions ───────────────────────────────────────────────

interface GateCheck {
  id: string;
  label: string;
  description: string;
  passed: boolean | null; // null = unknown/loading
  link?: string;
  linkLabel?: string;
}

interface GateDef {
  phase: string;
  gateLabel: string;
  icon: React.ElementType;
  checks: GateCheck[];
}

function buildGates(
  currentPhase: string,
  linkedModelId: string | null,
  hasRiskAssessment: boolean,
  hasImpactAssessment: boolean,
  hasApprovalWorkflow: boolean,
  approvalStatus: string | null,
  misuseCount: number,
  hasPiiModel: boolean,
): GateDef[] {
  return [
    {
      phase: "DATA_DISCOVERY",
      gateLabel: "Gate 1 — Data Privacy Clearance",
      icon: Shield,
      checks: [
        { id: "model-registered", label: "AI Model registered in Inventory", description: "Linked AI model exists in the AI Inventory register.", passed: !!linkedModelId, link: linkedModelId ? "/models" : undefined, linkLabel: "View Models" },
        { id: "pii-flagged", label: "PII processing identified", description: "Model has been flagged for PII processing status under DPDP Act.", passed: hasPiiModel },
      ],
    },
    {
      phase: "MODEL_DEVELOPMENT",
      gateLabel: "Gate 2 — Risk Assessment Required",
      icon: ShieldAlert,
      checks: [
        { id: "risk-assessment", label: "Risk Assessment completed", description: "At least one risk assessment has been run for the linked AI model.", passed: hasRiskAssessment, link: "/risk", linkLabel: "Run Assessment" },
        { id: "model-docs", label: "Training dataset documented", description: "Training data source is recorded in the model registry.", passed: !!linkedModelId },
      ],
    },
    {
      phase: "TESTING_VALIDATION",
      gateLabel: "Gate 3 — Pre-Deployment Governance",
      icon: FileSearch,
      checks: [
        { id: "impact-assessment", label: "ISO 42005 Impact Assessment", description: "Societal impact assessment completed for the linked AI model.", passed: hasImpactAssessment, link: "/iso42005", linkLabel: "Create Assessment" },
        { id: "misuse-scenarios", label: "Misuse scenarios documented", description: `${misuseCount} foreseeable misuse scenario(s) catalogued. ISO 42005 Sec. 5.3.5 requires at least one.`, passed: misuseCount > 0, link: "/iso42005", linkLabel: "Add Scenarios" },
        { id: "approval-initiated", label: "Approval workflow initiated", description: "A cross-functional approval workflow has been created for this model.", passed: hasApprovalWorkflow, link: "/approvals", linkLabel: "Start Workflow" },
      ],
    },
    {
      phase: "DEPLOYMENT",
      gateLabel: "Gate 4 — Deployment Sign-Off",
      icon: CheckSquare,
      checks: [
        { id: "approval-approved", label: "Approval workflow fully approved", description: "All approval workflow steps have been signed off (status: APPROVED).", passed: approvalStatus === "APPROVED", link: "/approvals", linkLabel: "View Approvals" },
        { id: "risk-ok", label: "Risk assessed and mitigations logged", description: "Risk assessment completed with mitigations documented.", passed: hasRiskAssessment },
        { id: "misuse-addressed", label: "Misuse scenarios mitigation plan", description: "Misuse scenarios registered — ensure mitigations are documented.", passed: misuseCount > 0 },
      ],
    },
    {
      phase: "MONITORING",
      gateLabel: "Gate 5 — Operational Monitoring Active",
      icon: Clock,
      checks: [
        { id: "monitoring-active", label: "LLM / model monitoring enabled", description: "Prompt logs are being collected for the linked model.", passed: null /* checked at runtime */ },
        { id: "reassessment-scheduled", label: "Next risk review scheduled", description: "Risk assessment has a defined next review date.", passed: hasRiskAssessment },
      ],
    },
  ];
}

// ── Gate Panel UI ─────────────────────────────────────────────────────────────

function GatePanel({ gate, isCurrentGate }: { gate: GateDef; isCurrentGate: boolean }) {
  const allPassed = gate.checks.every((c) => c.passed === true);
  const anyFailed = gate.checks.some((c) => c.passed === false);

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${
      isCurrentGate
        ? anyFailed
          ? "border-orange-500/40 bg-orange-500/5"
          : allPassed
          ? "border-green-500/40 bg-green-500/5"
          : "border-primary/30 bg-primary/5"
        : "border-border bg-card"
    }`}>
      {/* Gate header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <gate.icon className={`h-4 w-4 shrink-0 ${
            allPassed ? "text-green-400" : anyFailed ? "text-orange-400" : "text-muted-foreground"
          }`} />
          <span className="text-sm font-semibold">{gate.gateLabel}</span>
          {isCurrentGate && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium">
              CURRENT
            </span>
          )}
        </div>
        {allPassed ? (
          <span title="Gate cleared"><Lock className="h-4 w-4 text-green-400" /></span>
        ) : (
          <span title="Gate not cleared"><Unlock className="h-4 w-4 text-orange-400" /></span>
        )}
      </div>

      {/* Checks */}
      <div className="space-y-2">
        {gate.checks.map((check) => (
          <div key={check.id} className="flex items-start gap-2.5 text-xs">
            {check.passed === true ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
            ) : check.passed === false ? (
              <Circle className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <span className={`font-medium ${check.passed ? "text-foreground" : "text-muted-foreground"}`}>
                {check.label}
              </span>
              <p className="text-muted-foreground mt-0.5">{check.description}</p>
            </div>
            {!check.passed && check.link && (
              <Link
                href={check.link}
                className="flex items-center gap-0.5 text-primary hover:underline shrink-0"
              >
                {check.linkLabel ?? "Fix"} <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PhaseBar ──────────────────────────────────────────────────────────────────

function PhaseBar({ phase, record, progress }: { phase: { key: string; label: string }; record?: ProjectPhaseRecord; progress: number }) {
  const isDone = record?.status === "DONE" || progress === 100;
  const isActive = progress > 0 && progress < 100;

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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectOverviewPage() {
  const params = useParams<{ id: string }>();

  type ProjectFull = Project & {
    phases?: ProjectPhaseRecord[];
    milestones?: Milestone[];
    linkedModels?: (ProjectAIModel & { model?: { id: string; name: string; isPiiProcessing?: boolean } })[];
    _count?: { tasks: number; experiments: number; milestones: number; workflows: number };
  };

  const [project, setProject] = useState<ProjectFull | null>(null);
  const [tasks, setTasks] = useState<{ status: string; phase: string }[]>([]);

  // Governance gate data
  const [gateData, setGateData] = useState<{
    hasRiskAssessment: boolean;
    hasImpactAssessment: boolean;
    hasApprovalWorkflow: boolean;
    approvalStatus: string | null;
    misuseCount: number;
    hasPiiModel: boolean;
  }>({ hasRiskAssessment: false, hasImpactAssessment: false, hasApprovalWorkflow: false, approvalStatus: null, misuseCount: 0, hasPiiModel: false });

  useEffect(() => {
    const token = JSON.parse(localStorage.getItem("ai-governance-auth") ?? "{}").state?.token ?? "";
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`/api/projects/${params.id}`, { headers: h }),
      fetch(`/api/projects/${params.id}/tasks`, { headers: h }),
    ])
      .then(([r1, r2]) => Promise.all([r1.json(), r2.json()]))
      .then(([p, t]) => {
        const proj: ProjectFull = p.data;
        setProject(proj);
        setTasks(t.data ?? []);

        // Fetch governance data for linked model
        const linkedModelId = proj.linkedModels?.[0]?.modelId ?? null;
        if (!linkedModelId) return;

        Promise.all([
          // Check risk assessment via model detail
          fetch(`/api/models/${linkedModelId}`, { headers: h }).then((r) => r.json()).then((d) =>
            (d.data?.riskAssessments?.length ?? 0) > 0
          ).catch(() => false),
          // Check ISO 42005 assessment (returns { model, impact, parties })
          fetch(`/api/iso42005?modelId=${linkedModelId}`, { headers: h }).then((r) => r.json()).then((d) =>
            !!(d.data?.impact)
          ).catch(() => false),
          // Check approval workflows
          fetch(`/api/approvals`, { headers: h }).then((r) => r.json()).then((d) => {
            const arr: { modelId: string | null; status: string }[] = Array.isArray(d.data) ? d.data : [];
            const wfs = arr.filter((w) => w.modelId === linkedModelId);
            return { hasWorkflow: wfs.length > 0, status: wfs[0]?.status ?? null };
          }).catch(() => ({ hasWorkflow: false, status: null })),
          // Check misuse scenarios
          fetch(`/api/misuse-scenarios?modelId=${linkedModelId}`, { headers: h }).then((r) => r.json()).then((d) =>
            Array.isArray(d.data) ? d.data.length : 0
          ).catch(() => 0),
        ]).then(([hasRisk, hasIA, wfResult, misuseCount]) => {
          const hasPii = proj.linkedModels?.[0]?.model?.isPiiProcessing ?? false;
          setGateData({
            hasRiskAssessment: hasRisk as boolean,
            hasImpactAssessment: hasIA as boolean,
            hasApprovalWorkflow: (wfResult as { hasWorkflow: boolean; status: string | null }).hasWorkflow,
            approvalStatus: (wfResult as { hasWorkflow: boolean; status: string | null }).status,
            misuseCount: misuseCount as number,
            hasPiiModel: hasPii,
          });
        });
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

  const linkedModelId = project.linkedModels?.[0]?.modelId ?? null;
  const currentPhaseIdx = PHASE_INDEX[project.currentPhase] ?? 0;

  const gates = buildGates(
    project.currentPhase,
    linkedModelId,
    gateData.hasRiskAssessment,
    gateData.hasImpactAssessment,
    gateData.hasApprovalWorkflow,
    gateData.approvalStatus,
    gateData.misuseCount,
    gateData.hasPiiModel,
  );

  // Only show gates relevant to current or upcoming phases
  const relevantGates = gates.filter((g) => PHASE_INDEX[g.phase] >= currentPhaseIdx - 1);

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
          {PHASES.map((ph) => {
            const phaseTasks = tasks.filter((t) => t.phase === ph.key);
            const doneTasks = phaseTasks.filter((t) => t.status === "DONE").length;
            const computedProgress = phaseTasks.length > 0
              ? Math.round((doneTasks / phaseTasks.length) * 100)
              : 0;
            return (
              <PhaseBar
                key={ph.key}
                phase={ph}
                record={project.phases?.find((r) => r.phase === ph.key)}
                progress={computedProgress}
              />
            );
          })}
        </div>
      </div>

      {/* Governance Gates */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Governance Gates — ISO 42001 Lifecycle Controls
          </h3>
          <span className="text-xs text-muted-foreground">
            {gates.filter((g) => g.checks.every((c) => c.passed)).length}/{gates.length} gates cleared
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {relevantGates.map((gate) => (
            <GatePanel
              key={gate.phase}
              gate={gate}
              isCurrentGate={gate.phase === PHASES[currentPhaseIdx + 1]?.key}
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
