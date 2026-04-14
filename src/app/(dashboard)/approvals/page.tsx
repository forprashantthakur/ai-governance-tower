"use client";

import { useEffect, useState } from "react";
import {
  CheckSquare, Clock, XCircle, AlertTriangle, Plus, ChevronDown, ChevronUp,
  User, Calendar, MessageSquare, Loader2, CheckCircle2, Shield, Scale, Lock,
  Database, Crown, Wrench
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Types ───────────────────────────────────────────────────────────────────

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED" | "WITHDRAWN";
type ApprovalStepType = "RISK_OFFICER" | "LEGAL" | "ETHICS" | "DATA_PROTECTION" | "EXECUTIVE" | "CUSTOM";

interface ApprovalStep {
  id: string;
  stepType: ApprovalStepType;
  label: string;
  stepOrder: number;
  status: ApprovalStatus;
  comments?: string;
  decidedAt?: string;
  dueDate?: string;
  assignee?: { id: string; name: string } | null;
}

interface ApprovalWorkflow {
  id: string;
  title: string;
  description?: string;
  status: ApprovalStatus;
  dueDate?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  model: { id: string; name: string; type: string; status: string } | null;
  requester: { id: string; name: string };
  steps: ApprovalStep[];
}

interface UserOption { id: string; name: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  PENDING:   "bg-amber-500/15 text-amber-400 border-amber-500/30",
  APPROVED:  "bg-green-500/15 text-green-400 border-green-500/30",
  REJECTED:  "bg-red-500/15 text-red-400 border-red-500/30",
  ESCALATED: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  WITHDRAWN: "bg-muted text-muted-foreground border-border",
};

const STEP_ICONS: Record<ApprovalStepType, React.ElementType> = {
  RISK_OFFICER:    Shield,
  LEGAL:           Scale,
  ETHICS:          CheckCircle2,
  DATA_PROTECTION: Lock,
  EXECUTIVE:       Crown,
  CUSTOM:          Wrench,
};

// Suppress unused import warning — Database is available for future use
void Database;

const STEP_TYPES: { value: ApprovalStepType; label: string }[] = [
  { value: "RISK_OFFICER",    label: "Risk Officer" },
  { value: "LEGAL",           label: "Legal Review" },
  { value: "ETHICS",          label: "Ethics Committee" },
  { value: "DATA_PROTECTION", label: "Data Protection Officer" },
  { value: "EXECUTIVE",       label: "Executive Approval" },
  { value: "CUSTOM",          label: "Custom Reviewer" },
];

function statusBadge(status: ApprovalStatus) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function progressBar(steps: ApprovalStep[]) {
  const total = steps.length;
  const done = steps.filter((s) => s.status === "APPROVED").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{done}/{total}</span>
    </div>
  );
}

// ─── New Workflow Modal ───────────────────────────────────────────────────────

function NewWorkflowModal({ onClose, onCreated }: { onClose: () => void; onCreated: (w: ApprovalWorkflow) => void }) {
  const api = useApi();
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [form, setForm] = useState({
    modelId: "", title: "", description: "", dueDate: "", notes: "",
  });
  const [steps, setSteps] = useState<{ stepType: ApprovalStepType; label: string; assigneeId: string; dueDate: string }[]>([
    { stepType: "RISK_OFFICER", label: "Risk Officer Review", assigneeId: "", dueDate: "" },
    { stepType: "LEGAL",        label: "Legal Review",        assigneeId: "", dueDate: "" },
    { stepType: "ETHICS",       label: "Ethics Approval",     assigneeId: "", dueDate: "" },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ models: { id: string; name: string }[] }>("/models?limit=200").then((r) => setModels(r.models ?? [])).catch(() => {});
    api.get<UserOption[]>("/users").then(setUsers).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addStep() {
    setSteps([...steps, { stepType: "CUSTOM", label: "", assigneeId: "", dueDate: "" }]);
  }
  function removeStep(i: number) {
    setSteps(steps.filter((_, idx) => idx !== i));
  }
  function updateStep(i: number, field: string, value: string) {
    setSteps(steps.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  // Virtual model IDs that don't correspond to real DB records
  const VIRTUAL_MODELS: Record<string, string> = {
    "agentic-ai-mode": "Agentic AI Mode",
    "others": "Others",
  };

  async function submit() {
    if (!form.modelId || !form.title || steps.length === 0) return;
    setSaving(true);
    try {
      // For virtual models, pass modelId as null and embed name in notes
      const isVirtual = form.modelId in VIRTUAL_MODELS;
      const payload = {
        ...form,
        modelId: isVirtual ? null : form.modelId,
        notes: isVirtual
          ? `[${VIRTUAL_MODELS[form.modelId]}] ${form.notes ?? ""}`.trim()
          : form.notes,
        steps: steps.map((s) => ({
          stepType: s.stepType,
          label: s.label || STEP_TYPES.find((t) => t.value === s.stepType)?.label || s.stepType,
          assigneeId: s.assigneeId || undefined,
          dueDate: s.dueDate || undefined,
        })),
      };
      const wf = await api.post<ApprovalWorkflow>("/approvals", payload);
      onCreated(wf);
    } catch { /* toast shown */ } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">New Approval Workflow</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-5">
          {/* Model + Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">AI Model *</label>
              <select value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">— Select model —</option>
                {models.length > 0 && (
                  <optgroup label="── AI Inventory ──">
                    {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </optgroup>
                )}
                <optgroup label="── Other ──">
                  <option value="agentic-ai-mode">Agentic AI Mode</option>
                  <option value="others">Others</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Workflow Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Production Deployment Approval"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} placeholder="What needs to be approved and why?"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Notes</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional context"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
            </div>
          </div>

          {/* Approval Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approval Steps *</label>
              <Button size="sm" variant="outline" onClick={addStep} type="button">
                <Plus className="h-3.5 w-3.5 mr-1" />Add Step
              </Button>
            </div>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold shrink-0">{i + 1}</span>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select value={step.stepType} onChange={(e) => {
                        const t = e.target.value as ApprovalStepType;
                        const defaultLabel = STEP_TYPES.find((x) => x.value === t)?.label ?? "";
                        updateStep(i, "stepType", t);
                        if (!step.label || STEP_TYPES.some((x) => x.label === step.label)) {
                          updateStep(i, "label", defaultLabel);
                        }
                      }}
                        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                        {STEP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <input value={step.label} onChange={(e) => updateStep(i, "label", e.target.value)}
                        placeholder="Step label"
                        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
                    </div>
                    {steps.length > 1 && (
                      <button onClick={() => removeStep(i)} className="text-muted-foreground hover:text-red-400 shrink-0">
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-7">
                    <select value={step.assigneeId} onChange={(e) => updateStep(i, "assigneeId", e.target.value)}
                      className="rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="">— Assign to —</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <input type="date" value={step.dueDate} onChange={(e) => updateStep(i, "dueDate", e.target.value)}
                      className="rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.modelId || !form.title} className="flex-1">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : "Create Workflow"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step Decision Modal ──────────────────────────────────────────────────────

function DecideModal({ workflowId, step, onClose, onDone }: {
  workflowId: string; step: ApprovalStep;
  onClose: () => void; onDone: (stepId: string, status: ApprovalStatus, comments: string) => void;
}) {
  const api = useApi();
  const [status, setStatus] = useState<"APPROVED" | "REJECTED" | "ESCALATED">("APPROVED");
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await api.patch(`/approvals/${workflowId}/steps/${step.id}`, { status, comments });
      onDone(step.id, status, comments);
    } catch { /* toast */ } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold">Record Decision — {step.label}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">Decision *</label>
            <div className="flex gap-2">
              {(["APPROVED","REJECTED","ESCALATED"] as const).map((s) => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                    status === s
                      ? s === "APPROVED" ? "bg-green-500/20 border-green-500 text-green-400"
                        : s === "REJECTED" ? "bg-red-500/20 border-red-500 text-red-400"
                        : "bg-orange-500/20 border-orange-500 text-orange-400"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Comments / Rationale</label>
            <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3}
              placeholder="Explain the decision, conditions, or escalation reason…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={submit} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Decision"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Workflow Card ────────────────────────────────────────────────────────────

function WorkflowCard({ wf, onStepDecide }: { wf: ApprovalWorkflow; onStepDecide: (wf: ApprovalWorkflow, step: ApprovalStep) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="cursor-pointer select-none py-4" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <CardTitle className="text-sm font-semibold">{wf.title}</CardTitle>
              {statusBadge(wf.status)}
            </div>
            <p className="text-xs text-muted-foreground">
              AI Model: <span className="text-foreground">{wf.model?.name ?? wf.notes?.match(/^\[([^\]]+)\]/)?.[1] ?? "—"}</span>
              {" · "}Requested by <span className="text-foreground">{wf.requester.name}</span>
              {" · "}{new Date(wf.createdAt).toLocaleDateString("en-IN")}
            </p>
            <div className="mt-2">{progressBar(wf.steps)}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {wf.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />Due {new Date(wf.dueDate).toLocaleDateString("en-IN")}
              </span>
            )}
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 space-y-3">
          {wf.description && <p className="text-sm text-muted-foreground border-t border-border pt-3">{wf.description}</p>}
          {/* Steps timeline */}
          <div className="space-y-2 border-t border-border pt-3">
            {wf.steps.map((step) => {
              const Icon = STEP_ICONS[step.stepType] ?? Shield;
              const canDecide = step.status === "PENDING" && wf.status === "PENDING";
              return (
                <div key={step.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  step.status === "APPROVED" ? "border-green-500/30 bg-green-500/5"
                  : step.status === "REJECTED" ? "border-red-500/30 bg-red-500/5"
                  : step.status === "ESCALATED" ? "border-orange-500/30 bg-orange-500/5"
                  : "border-border bg-muted/10"
                }`}>
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-card border border-border shrink-0 mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold">{step.label}</span>
                      {statusBadge(step.status)}
                      {step.assignee && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />{step.assignee.name}
                        </span>
                      )}
                    </div>
                    {step.comments && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                        <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />{step.comments}
                      </p>
                    )}
                    {step.decidedAt && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Decided: {new Date(step.decidedAt).toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </div>
                  {canDecide && (
                    <Button size="sm" variant="outline" onClick={() => onStepDecide(wf, step)} className="shrink-0">
                      Decide
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const api = useApi();
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [deciding, setDeciding] = useState<{ wf: ApprovalWorkflow; step: ApprovalStep } | null>(null);
  const [filter, setFilter] = useState<"ALL" | ApprovalStatus>("ALL");

  useEffect(() => {
    api.get<ApprovalWorkflow[]>("/approvals")
      .then(setWorkflows)
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCreated(wf: ApprovalWorkflow) {
    setWorkflows((prev) => [wf, ...prev]);
    setShowNew(false);
  }

  function handleStepDone(wfId: string, stepId: string, status: ApprovalStatus, comments: string) {
    setWorkflows((prev) => prev.map((wf) => {
      if (wf.id !== wfId) return wf;
      const steps = wf.steps.map((s) => s.id === stepId ? { ...s, status, comments, decidedAt: new Date().toISOString() } : s);
      let wfStatus: ApprovalStatus = "PENDING";
      if (steps.some((s) => s.status === "REJECTED")) wfStatus = "REJECTED";
      else if (steps.some((s) => s.status === "ESCALATED")) wfStatus = "ESCALATED";
      else if (steps.every((s) => s.status === "APPROVED")) wfStatus = "APPROVED";
      return { ...wf, steps, status: wfStatus };
    }));
    setDeciding(null);
  }

  const counts = {
    ALL: workflows.length,
    PENDING: workflows.filter((w) => w.status === "PENDING").length,
    APPROVED: workflows.filter((w) => w.status === "APPROVED").length,
    REJECTED: workflows.filter((w) => w.status === "REJECTED").length,
    ESCALATED: workflows.filter((w) => w.status === "ESCALATED").length,
  };

  const filtered = filter === "ALL" ? workflows : workflows.filter((w) => w.status === filter);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Approval Workflows
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Multi-step cross-functional sign-off for AI model deployment
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />New Workflow
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", count: counts.PENDING, icon: Clock, color: "text-amber-400" },
          { label: "Approved", count: counts.APPROVED, icon: CheckCircle2, color: "text-green-400" },
          { label: "Rejected", count: counts.REJECTED, icon: XCircle, color: "text-red-400" },
          { label: "Escalated", count: counts.ESCALATED, icon: AlertTriangle, color: "text-orange-400" },
        ].map(({ label, count, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-6 w-6 ${color}`} />
              <div>
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {(["ALL","PENDING","APPROVED","REJECTED","ESCALATED"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}>
            {f} {f === "ALL" ? `(${counts.ALL})` : `(${counts[f] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Workflow list */}
      {loading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading workflows…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <CheckSquare className="h-12 w-12 opacity-30" />
          <p className="text-sm">No approval workflows found. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((wf) => (
            <WorkflowCard key={wf.id} wf={wf}
              onStepDecide={(w, s) => setDeciding({ wf: w, step: s })} />
          ))}
        </div>
      )}

      {/* Modals */}
      {showNew && <NewWorkflowModal onClose={() => setShowNew(false)} onCreated={handleCreated} />}
      {deciding && (
        <DecideModal workflowId={deciding.wf.id} step={deciding.step}
          onClose={() => setDeciding(null)}
          onDone={(sid, st, co) => handleStepDone(deciding.wf.id, sid, st, co)} />
      )}
    </div>
  );
}
