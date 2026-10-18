"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList, Plus, RefreshCw, X, ChevronDown, ChevronRight, Loader2,
  Target, ArrowRight, Trash2, Pencil, Save, Gauge, Calendar, User,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useUIStore } from "@/store/ui.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/shared/stat-card";

// ── Types ─────────────────────────────────────────────────────────────────────

type GapSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type GapAssessmentStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "SIGNED_OFF";

interface GapFinding {
  id: string;
  assessmentId: string;
  requirementRef: string;
  requirementTitle: string;
  currentState: string | null;
  desiredState: string | null;
  gapDescription: string | null;
  severity: GapSeverity;
  maturityCurrent: number;
  maturityTarget: number;
  recommendation: string | null;
  ownerRole: string | null;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GapAssessmentListItem {
  id: string;
  name: string;
  framework: string;
  scope: string | null;
  assessorName: string | null;
  status: GapAssessmentStatus;
  overallScore: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  _count: { findings: number };
}

interface GapAssessmentDetail {
  id: string;
  name: string;
  framework: string;
  scope: string | null;
  assessorName: string | null;
  status: GapAssessmentStatus;
  overallScore: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  findings: GapFinding[];
}

interface ListResponse {
  assessments: GapAssessmentListItem[];
  stats: {
    total: number;
    draft: number;
    inProgress: number;
    completed: number;
    signedOff: number;
    avgScore: number;
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FRAMEWORKS = [
  "ISO/IEC 42001:2023 — AI Management System",
  "RBI FREE-AI Framework",
  "RBI Guidance on Model Risk Management",
  "DPDP Act 2023",
];

const STATUS_LABEL: Record<GapAssessmentStatus, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  SIGNED_OFF: "Signed Off",
};

const STATUS_VARIANT: Record<GapAssessmentStatus, "secondary" | "warning" | "info" | "success"> = {
  DRAFT: "secondary",
  IN_PROGRESS: "warning",
  COMPLETED: "info",
  SIGNED_OFF: "success",
};

const SEVERITY_LABEL: Record<GapSeverity, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const SEVERITY_VARIANT: Record<GapSeverity, "danger" | "warning" | "info" | "secondary"> = {
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "secondary",
};

const SEVERITY_ORDER: GapSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function scoreColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

// ── Maturity dot scale ───────────────────────────────────────────────────────

function DotScale({ value, max = 5, colorClass }: { value: number; max?: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${i < value ? colorClass : "bg-muted border border-border"}`}
        />
      ))}
    </div>
  );
}

function MaturityVisual({ current, target }: { current: number; target: number }) {
  return (
    <div className="flex items-center gap-2">
      <DotScale value={current} colorClass="bg-blue-400" />
      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
      <DotScale value={target} colorClass="bg-green-400" />
    </div>
  );
}

// ── New Assessment Modal ─────────────────────────────────────────────────────

function NewAssessmentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (a: GapAssessmentListItem) => void;
}) {
  const { post } = useApi();
  const { addNotification } = useUIStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    framework: FRAMEWORKS[0],
    scope: "",
    assessorName: "",
  });

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.framework) {
      addNotification({ type: "warning", title: "Missing fields", message: "Name and framework are required." });
      return;
    }
    setSaving(true);
    try {
      const created = await post<GapAssessmentListItem>("/gap-assessment", {
        name: form.name.trim(),
        framework: form.framework,
        scope: form.scope.trim() || undefined,
        assessorName: form.assessorName.trim() || undefined,
      });
      addNotification({ type: "success", title: "Assessment created", message: created.name });
      onCreated(created);
    } catch {
      // toast already shown by useApi
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> New Gap Assessment
          </CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label>Assessment Name *</Label>
              <Input
                placeholder="e.g. AI Governance Readiness — Retail Lending"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Framework *</Label>
              <select
                value={form.framework}
                onChange={(e) => set("framework", e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {FRAMEWORKS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Scope</Label>
              <Textarea
                placeholder="e.g. All production AI/ML models used in credit underwriting and collections"
                value={form.scope}
                onChange={(e) => set("scope", e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assessor Name</Label>
              <Input
                placeholder="e.g. Internal Audit — AI Risk"
                value={form.assessorName}
                onChange={(e) => set("assessorName", e.target.value)}
              />
            </div>
          </CardContent>
          <div className="flex gap-3 px-6 pb-6">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create Assessment"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Add Finding Modal ────────────────────────────────────────────────────────

function AddFindingModal({
  assessmentId,
  onClose,
  onCreated,
}: {
  assessmentId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { post } = useApi();
  const { addNotification } = useUIStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    requirementRef: "",
    requirementTitle: "",
    severity: "MEDIUM" as GapSeverity,
    maturityCurrent: "0",
    maturityTarget: "3",
    ownerRole: "",
    targetDate: "",
    gapDescription: "",
  });

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.requirementRef.trim() || !form.requirementTitle.trim()) {
      addNotification({ type: "warning", title: "Missing fields", message: "Requirement ref and title are required." });
      return;
    }
    setSaving(true);
    try {
      await post(`/gap-assessment/${assessmentId}/findings`, {
        requirementRef: form.requirementRef.trim(),
        requirementTitle: form.requirementTitle.trim(),
        severity: form.severity,
        maturityCurrent: Number(form.maturityCurrent),
        maturityTarget: Number(form.maturityTarget),
        ownerRole: form.ownerRole.trim() || undefined,
        targetDate: form.targetDate ? new Date(form.targetDate).toISOString() : undefined,
        gapDescription: form.gapDescription.trim() || undefined,
      });
      addNotification({ type: "success", title: "Finding added", message: form.requirementRef });
      onCreated();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Add Finding
          </CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Requirement Ref *</Label>
                <Input
                  placeholder="e.g. ISO42001-6.1"
                  className="font-mono"
                  value={form.requirementRef}
                  onChange={(e) => set("requirementRef", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Severity</Label>
                <select
                  value={form.severity}
                  onChange={(e) => set("severity", e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {SEVERITY_ORDER.map((s) => (
                    <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Requirement Title *</Label>
              <Input
                placeholder="e.g. Establish an AI risk management process"
                value={form.requirementTitle}
                onChange={(e) => set("requirementTitle", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Current Maturity (0–5)</Label>
                <select
                  value={form.maturityCurrent}
                  onChange={(e) => set("maturityCurrent", e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Target Maturity (0–5)</Label>
                <select
                  value={form.maturityTarget}
                  onChange={(e) => set("maturityTarget", e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Owner Role</Label>
                <Input
                  placeholder="e.g. Model Risk Management"
                  value={form.ownerRole}
                  onChange={(e) => set("ownerRole", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Target Date</Label>
                <Input type="date" value={form.targetDate} onChange={(e) => set("targetDate", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Gap Description</Label>
              <Textarea
                placeholder="Describe the difference between current and desired state…"
                value={form.gapDescription}
                onChange={(e) => set("gapDescription", e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
          <div className="flex gap-3 px-6 pb-6">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</> : "Add Finding"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Finding Edit Panel (inline, shown when expanded) ────────────────────────

function FindingEditPanel({
  assessmentId,
  finding,
  onSaved,
  onDeleted,
}: {
  assessmentId: string;
  finding: GapFinding;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { patch, del } = useApi();
  const { addNotification } = useUIStore();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    currentState: finding.currentState ?? "",
    desiredState: finding.desiredState ?? "",
    gapDescription: finding.gapDescription ?? "",
    recommendation: finding.recommendation ?? "",
    severity: finding.severity,
    maturityCurrent: String(finding.maturityCurrent),
    maturityTarget: String(finding.maturityTarget),
    ownerRole: finding.ownerRole ?? "",
    targetDate: finding.targetDate ? finding.targetDate.slice(0, 10) : "",
  });

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      await patch(`/gap-assessment/${assessmentId}/findings/${finding.id}`, {
        currentState: form.currentState.trim() || null,
        desiredState: form.desiredState.trim() || null,
        gapDescription: form.gapDescription.trim() || null,
        recommendation: form.recommendation.trim() || null,
        severity: form.severity,
        maturityCurrent: Number(form.maturityCurrent),
        maturityTarget: Number(form.maturityTarget),
        ownerRole: form.ownerRole.trim() || null,
        targetDate: form.targetDate ? new Date(form.targetDate).toISOString() : null,
      });
      addNotification({ type: "success", title: "Finding updated", message: finding.requirementRef });
      onSaved();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete finding ${finding.requirementRef}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await del(`/gap-assessment/${assessmentId}/findings/${finding.id}`);
      addNotification({ type: "success", title: "Finding deleted", message: finding.requirementRef });
      onDeleted();
    } catch {
      // toast already shown
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="border-t border-border bg-muted/20 p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Current State</Label>
          <Textarea value={form.currentState} onChange={(e) => set("currentState", e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Desired State</Label>
          <Textarea value={form.desiredState} onChange={(e) => set("desiredState", e.target.value)} rows={2} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Gap Description</Label>
          <Textarea value={form.gapDescription} onChange={(e) => set("gapDescription", e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Recommendation</Label>
          <Textarea value={form.recommendation} onChange={(e) => set("recommendation", e.target.value)} rows={2} />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Severity</Label>
          <select
            value={form.severity}
            onChange={(e) => set("severity", e.target.value as GapSeverity)}
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
          >
            {SEVERITY_ORDER.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Current</Label>
          <select
            value={form.maturityCurrent}
            onChange={(e) => set("maturityCurrent", e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
          >
            {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Target</Label>
          <select
            value={form.maturityTarget}
            onChange={(e) => set("maturityTarget", e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
          >
            {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Owner Role</Label>
          <Input className="h-9 text-xs" value={form.ownerRole} onChange={(e) => set("ownerRole", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Target Date</Label>
          <Input className="h-9 text-xs" type="date" value={form.targetDate} onChange={(e) => set("targetDate", e.target.value)} />
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <Button variant="outline" size="sm" className="gap-1.5 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={remove} disabled={deleting}>
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
        </Button>
        <Button size="sm" className="gap-1.5" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GapAssessmentPage() {
  const { get, patch } = useApi();
  const { addNotification } = useUIStore();

  const [list, setList] = useState<ListResponse | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GapAssessmentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [showAddFinding, setShowAddFinding] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await get<ListResponse>("/gap-assessment");
      setList(res);
    } finally {
      setLoadingList(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await get<GapAssessmentDetail>(`/gap-assessment/${id}`);
      setDetail(res);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
    else setDetail(null);
  }, [selectedId, fetchDetail]);

  function refreshAfterFindingChange() {
    fetchList();
    if (selectedId) fetchDetail(selectedId);
  }

  async function changeStatus(status: GapAssessmentStatus) {
    if (!detail || status === detail.status) return;
    setChangingStatus(true);
    try {
      await patch(`/gap-assessment/${detail.id}`, { status });
      addNotification({ type: "success", title: "Status updated", message: STATUS_LABEL[status] });
      refreshAfterFindingChange();
    } catch {
      // toast already shown
    } finally {
      setChangingStatus(false);
    }
  }

  const assessments = list?.assessments ?? [];
  const stats = list?.stats ?? { total: 0, draft: 0, inProgress: 0, completed: 0, signedOff: 0, avgScore: 0 };

  const sortedFindings = [...(detail?.findings ?? [])].sort((a, b) => {
    const sev = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    if (sev !== 0) return sev;
    return a.requirementRef.localeCompare(b.requirementRef);
  });

  const heatCounts: Record<GapSeverity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  sortedFindings.forEach((f) => { heatCounts[f.severity] += 1; });

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
        <ClipboardList className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-primary">Gap Assessment — Readiness Register</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Independent readiness assessment against ISO/IEC 42001, the RBI FREE-AI Framework, RBI model
            risk management guidance and the DPDP Act 2023. Each finding scores current vs. target maturity
            on a 0–5 scale.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Assessments" value={stats.total} icon={ClipboardList} />
        <StatCard title="Draft" value={stats.draft} icon={Pencil} variant="default" />
        <StatCard title="In Progress" value={stats.inProgress} icon={Gauge} variant="warning" />
        <StatCard title="Completed / Signed Off" value={stats.completed + stats.signedOff} icon={Target} variant="info" />
        <StatCard title="Avg. Readiness" value={`${stats.avgScore}%`} icon={Gauge} variant={stats.avgScore >= 70 ? "success" : stats.avgScore >= 40 ? "warning" : "danger"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        {/* Left: assessment list */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Assessments
              </CardTitle>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={fetchList} disabled={loadingList}>
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? "animate-spin" : ""}`} />
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => setShowNewAssessment(true)}>
                  <Plus className="h-3.5 w-3.5" /> New
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingList ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : assessments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground opacity-40" />
                <p className="text-xs text-muted-foreground">No assessments yet.</p>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowNewAssessment(true)}>
                  <Plus className="h-3.5 w-3.5" /> Create the first one
                </Button>
              </div>
            ) : (
              assessments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setSelectedId(a.id); setExpandedId(null); }}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedId === a.id ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold line-clamp-2">{a.name}</p>
                    <Badge variant={STATUS_VARIANT[a.status]} className="shrink-0 text-[10px]">
                      {STATUS_LABEL[a.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-1.5">
                    <Badge variant="outline" className="text-[10px]">{a.framework}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {a._count.findings} finding{a._count.findings !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Readiness</span>
                      <span>{a.overallScore}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${scoreColor(a.overallScore)}`} style={{ width: `${a.overallScore}%` }} />
                    </div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: selected assessment detail */}
        {!selectedId || !detail ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-24 text-center">
              {loadingDetail ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Target className="h-10 w-10 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Select an assessment from the list, or create a new one, to review its findings and readiness score.
                  </p>
                  <Button size="sm" className="gap-1.5" onClick={() => setShowNewAssessment(true)}>
                    <Plus className="h-3.5 w-3.5" /> New Assessment
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Detail header */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold">{detail.name}</h2>
                      <Badge variant={STATUS_VARIANT[detail.status]}>{STATUS_LABEL[detail.status]}</Badge>
                      <select
                        value={detail.status}
                        disabled={changingStatus}
                        onChange={(e) => changeStatus(e.target.value as GapAssessmentStatus)}
                        className="h-7 rounded-md border border-input bg-background px-2 text-[11px] disabled:opacity-50"
                      >
                        {(Object.keys(STATUS_LABEL) as GapAssessmentStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {detail.framework}
                      {detail.assessorName && <> · Assessor: {detail.assessorName}</>}
                    </p>
                    {detail.scope && <p className="text-xs text-muted-foreground mt-1">{detail.scope}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold">{detail.overallScore}%</p>
                    <p className="text-[10px] text-muted-foreground">Readiness Score</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${scoreColor(detail.overallScore)}`} style={{ width: `${detail.overallScore}%` }} />
                </div>
              </CardContent>
            </Card>

            {/* Heat strip */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Findings by Severity</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {SEVERITY_ORDER.map((s) => (
                    <div key={s} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <span className="text-xs">{SEVERITY_LABEL[s]}</span>
                      <Badge variant={SEVERITY_VARIANT[s]}>{heatCounts[s]}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Findings */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" /> Findings
                  <Badge variant="outline" className="text-xs">{sortedFindings.length}</Badge>
                </CardTitle>
                <Button size="sm" className="gap-1.5" onClick={() => setShowAddFinding(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add Finding
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingDetail ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : sortedFindings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                    <Target className="h-8 w-8 text-muted-foreground opacity-40" />
                    <p className="text-xs text-muted-foreground">No findings recorded yet for this assessment.</p>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAddFinding(true)}>
                      <Plus className="h-3.5 w-3.5" /> Add the first finding
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border border-border overflow-hidden">
                    {/* Header row */}
                    <div className="hidden md:grid grid-cols-[100px_1fr_90px_150px_120px_100px_24px] gap-2 px-3 py-2 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      <span>Ref</span>
                      <span>Requirement</span>
                      <span>Severity</span>
                      <span>Current → Target</span>
                      <span>Owner</span>
                      <span>Target Date</span>
                      <span />
                    </div>
                    {sortedFindings.map((f) => {
                      const expanded = expandedId === f.id;
                      return (
                        <div key={f.id} className="border-t border-border first:border-t-0">
                          <button
                            onClick={() => setExpandedId(expanded ? null : f.id)}
                            className="w-full grid grid-cols-2 md:grid-cols-[100px_1fr_90px_150px_120px_100px_24px] gap-2 px-3 py-2.5 items-center text-left hover:bg-muted/20 transition-colors"
                          >
                            <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border w-fit">
                              {f.requirementRef}
                            </code>
                            <span className="text-xs font-medium col-span-2 md:col-span-1 line-clamp-1">{f.requirementTitle}</span>
                            <Badge variant={SEVERITY_VARIANT[f.severity]} className="w-fit text-[10px]">{SEVERITY_LABEL[f.severity]}</Badge>
                            <MaturityVisual current={f.maturityCurrent} target={f.maturityTarget} />
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3 shrink-0" /> {f.ownerRole ?? "—"}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3 shrink-0" /> {fmtDate(f.targetDate)}
                            </span>
                            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                          </button>
                          {expanded && (
                            <FindingEditPanel
                              assessmentId={detail.id}
                              finding={f}
                              onSaved={refreshAfterFindingChange}
                              onDeleted={() => { setExpandedId(null); refreshAfterFindingChange(); }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewAssessment && (
        <NewAssessmentModal
          onClose={() => setShowNewAssessment(false)}
          onCreated={(a) => {
            setShowNewAssessment(false);
            fetchList();
            setSelectedId(a.id);
          }}
        />
      )}
      {showAddFinding && detail && (
        <AddFindingModal
          assessmentId={detail.id}
          onClose={() => setShowAddFinding(false)}
          onCreated={() => { setShowAddFinding(false); refreshAfterFindingChange(); }}
        />
      )}
    </div>
  );
}
