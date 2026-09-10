"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap, Plus, RefreshCw, Search, Filter, X, ChevronDown, Loader2,
  AlertTriangle, CheckCircle2, Clock, Calendar, Users, ExternalLink, Trash2,
  BookOpen, Award, ShieldAlert,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useUIStore } from "@/store/ui.store";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/shared/stat-card";

// ── Types ─────────────────────────────────────────────────────────────────────

type Audience = "BOARD" | "EXECUTIVE" | "RISK_COMPLIANCE" | "TECHNOLOGY" | "DATA_SCIENCE" | "BUSINESS_UNIT" | "ALL_STAFF";
type TStatus = "PLANNED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "danger" | "info" | "purple";

interface TrainingProgram {
  id: string;
  code: string;
  title: string;
  description: string | null;
  audience: Audience;
  status: TStatus;
  deliveryMode: string;
  durationHours: number;
  scheduledDate: string | null;
  completedDate: string | null;
  targetAttendees: number;
  actualAttendees: number;
  facilitator: string | null;
  materialsUrl: string | null;
  frameworkRefs: string[];
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  completed: number;
  scheduled: number;
  peopleTrained: number;
  completionRate: number;
}

interface TrainingResponse {
  rows: TrainingProgram[];
  stats: Stats;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AUDIENCE_ORDER: Audience[] = ["BOARD", "EXECUTIVE", "RISK_COMPLIANCE", "TECHNOLOGY", "DATA_SCIENCE", "BUSINESS_UNIT", "ALL_STAFF"];

const AUDIENCE_LABELS: Record<Audience, string> = {
  BOARD: "Board",
  EXECUTIVE: "Executive",
  RISK_COMPLIANCE: "Risk & Compliance",
  TECHNOLOGY: "Technology",
  DATA_SCIENCE: "Data Science",
  BUSINESS_UNIT: "Business Unit",
  ALL_STAFF: "All Staff",
};

const STATUS_CONFIG: Record<TStatus, { label: string; badge: BadgeVariant; icon: React.ReactNode }> = {
  PLANNED: { label: "Planned", badge: "secondary", icon: <Clock className="h-3 w-3" /> },
  SCHEDULED: { label: "Scheduled", badge: "info", icon: <Calendar className="h-3 w-3" /> },
  IN_PROGRESS: { label: "In Progress", badge: "warning", icon: <Loader2 className="h-3 w-3" /> },
  COMPLETED: { label: "Completed", badge: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
};

const STATUS_GROUPS: { title: string; statuses: TStatus[] }[] = [
  { title: "In Progress & Scheduled", statuses: ["IN_PROGRESS", "SCHEDULED"] },
  { title: "Planned", statuses: ["PLANNED"] },
  { title: "Completed", statuses: ["COMPLETED"] },
];

const DELIVERY_MODES: { value: string; label: string }[] = [
  { value: "INSTRUCTOR_LED", label: "Instructor-Led (Classroom)" },
  { value: "VIRTUAL_LIVE", label: "Virtual Live Session" },
  { value: "E_LEARNING", label: "Self-Paced E-Learning" },
  { value: "WORKSHOP", label: "Workshop / Simulation" },
  { value: "BLENDED", label: "Blended (Instructor + E-Learning)" },
];

const SELECT_CLS = "w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function toInputDate(d: string | null): string {
  if (!d) return "";
  return d.slice(0, 10);
}

function deliveryLabel(mode: string): string {
  return DELIVERY_MODES.find((m) => m.value === mode)?.label ?? mode.replace(/_/g, " ");
}

function attendanceRate(p: TrainingProgram): number {
  if (p.targetAttendees <= 0) return 0;
  return Math.round((p.actualAttendees / p.targetAttendees) * 100);
}

function ProgressBar({ pct, className, barClassName }: { pct: number; className?: string; barClassName?: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-muted overflow-hidden", className)}>
      <div className={cn("h-full rounded-full bg-primary transition-all", barClassName)} style={{ width: `${clamped}%` }} />
    </div>
  );
}

// ── Create / Edit Modal ───────────────────────────────────────────────────────

interface FormState {
  code: string;
  title: string;
  description: string;
  audience: Audience;
  status: TStatus;
  deliveryMode: string;
  durationHours: string;
  scheduledDate: string;
  completedDate: string;
  targetAttendees: string;
  actualAttendees: string;
  facilitator: string;
  materialsUrl: string;
  frameworkRefs: string;
}

function emptyForm(): FormState {
  return {
    code: "",
    title: "",
    description: "",
    audience: "ALL_STAFF",
    status: "PLANNED",
    deliveryMode: "INSTRUCTOR_LED",
    durationHours: "2",
    scheduledDate: "",
    completedDate: "",
    targetAttendees: "25",
    actualAttendees: "0",
    facilitator: "",
    materialsUrl: "",
    frameworkRefs: "",
  };
}

function toForm(p: TrainingProgram): FormState {
  return {
    code: p.code,
    title: p.title,
    description: p.description ?? "",
    audience: p.audience,
    status: p.status,
    deliveryMode: p.deliveryMode,
    durationHours: String(p.durationHours),
    scheduledDate: toInputDate(p.scheduledDate),
    completedDate: toInputDate(p.completedDate),
    targetAttendees: String(p.targetAttendees),
    actualAttendees: String(p.actualAttendees),
    facilitator: p.facilitator ?? "",
    materialsUrl: p.materialsUrl ?? "",
    frameworkRefs: p.frameworkRefs.join(", "),
  };
}

function TrainingModal({
  program,
  onClose,
  onSaved,
  onDeleted,
}: {
  program: TrainingProgram | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const api = useApi();
  const { addNotification } = useUIStore();
  const [form, setForm] = useState<FormState>(program ? toForm(program) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.title.trim()) {
      addNotification({ type: "warning", title: "Missing fields", message: "Programme code and title are required." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        audience: form.audience,
        status: form.status,
        deliveryMode: form.deliveryMode,
        durationHours: parseFloat(form.durationHours || "0") || 0,
        scheduledDate: form.scheduledDate ? new Date(form.scheduledDate).toISOString() : undefined,
        completedDate: form.completedDate ? new Date(form.completedDate).toISOString() : undefined,
        targetAttendees: parseInt(form.targetAttendees || "0", 10) || 0,
        actualAttendees: parseInt(form.actualAttendees || "0", 10) || 0,
        facilitator: form.facilitator.trim() || undefined,
        materialsUrl: form.materialsUrl.trim() || undefined,
        frameworkRefs: form.frameworkRefs.split(",").map((f) => f.trim()).filter(Boolean),
      };

      if (program) {
        await api.patch(`/training/${program.id}`, payload);
        addNotification({ type: "success", title: "Programme updated", message: `${form.code} was saved.` });
      } else {
        await api.post("/training", payload);
        addNotification({ type: "success", title: "Programme created", message: `${form.code} was added to the training plan.` });
      }
      onSaved();
    } catch {
      // toast already shown by useApi
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!program) return;
    if (!confirm(`Remove "${program.title}" from the training plan? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.del(`/training/${program.id}`);
      addNotification({ type: "success", title: "Programme removed", message: `${program.code} was deleted.` });
      onDeleted();
    } catch {
      // toast already shown
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 sticky top-0 bg-card z-10 border-b border-border">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            {program ? "Edit Training Programme" : "New Training Programme"}
          </CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Programme Code *</Label>
                <Input placeholder="e.g. TRN-2026-003" value={form.code} onChange={(e) => set("code", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Facilitator</Label>
                <Input placeholder="e.g. Model Risk & Compliance CoE" value={form.facilitator} onChange={(e) => set("facilitator", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="e.g. AI Governance Essentials for the Board" value={form.title} onChange={(e) => set("title", e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe learning objectives and coverage against ISO/IEC 42001 Clause 7.2/7.3, RBI expectations, or DPDP obligations…"
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Audience</Label>
                <select className={SELECT_CLS} value={form.audience} onChange={(e) => set("audience", e.target.value as Audience)}>
                  {AUDIENCE_ORDER.map((a) => (
                    <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select className={SELECT_CLS} value={form.status} onChange={(e) => set("status", e.target.value as TStatus)}>
                  {(Object.keys(STATUS_CONFIG) as TStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Delivery Mode</Label>
                <select className={SELECT_CLS} value={form.deliveryMode} onChange={(e) => set("deliveryMode", e.target.value)}>
                  {DELIVERY_MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Duration (hours)</Label>
                <Input type="number" min="0" step="0.5" value={form.durationHours} onChange={(e) => set("durationHours", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Scheduled Date</Label>
                <Input type="date" value={form.scheduledDate} onChange={(e) => set("scheduledDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Completed Date</Label>
                <Input type="date" value={form.completedDate} onChange={(e) => set("completedDate", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Target Attendees</Label>
                <Input type="number" min="0" step="1" value={form.targetAttendees} onChange={(e) => set("targetAttendees", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Actual Attendees</Label>
                <Input type="number" min="0" step="1" value={form.actualAttendees} onChange={(e) => set("actualAttendees", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Materials URL</Label>
              <Input placeholder="e.g. https://intranet.bank.example/training/ai-governance-essentials" value={form.materialsUrl} onChange={(e) => set("materialsUrl", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Framework References</Label>
              <Input
                placeholder="Comma-separated, e.g. ISO/IEC 42001 Cl. 7.2, RBI FREE-AI, DPDP Act 2023"
                value={form.frameworkRefs}
                onChange={(e) => set("frameworkRefs", e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2 border-t border-border">
              {program && (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting || saving} className="gap-1.5">
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : program ? "Save Changes" : "Create Programme"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Programme Row ─────────────────────────────────────────────────────────────

function ProgrammeRow({ p, onClick }: { p: TrainingProgram; onClick: () => void }) {
  const rate = attendanceRate(p);
  const dateLabel = p.status === "COMPLETED" ? "Completed" : "Scheduled";
  const dateValue = p.status === "COMPLETED" ? p.completedDate : p.scheduledDate;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-background border border-border rounded-lg p-4 hover:border-primary/40 hover:shadow-md transition-all"
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <code className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{p.code}</code>
            <Badge variant="purple" className="text-[10px] px-1.5 py-0">{AUDIENCE_LABELS[p.audience]}</Badge>
            <Badge variant={STATUS_CONFIG[p.status].badge} className="text-[10px] px-1.5 py-0 gap-1">
              {STATUS_CONFIG[p.status].icon}
              {STATUS_CONFIG[p.status].label}
            </Badge>
          </div>
          <p className="text-sm font-medium leading-snug">{p.title}</p>
          {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</p>}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {deliveryLabel(p.deliveryMode)}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.durationHours}h</span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {dateLabel}: {fmtDate(dateValue)}</span>
            {p.facilitator && <span>Facilitator: {p.facilitator}</span>}
            {p.materialsUrl && (
              <a
                href={p.materialsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Materials
              </a>
            )}
          </div>

          {p.frameworkRefs.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {p.frameworkRefs.map((f) => (
                <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">{f}</span>
              ))}
            </div>
          )}
        </div>

        <div className="w-full md:w-40 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {p.actualAttendees} / {p.targetAttendees}</span>
            <span className="font-semibold text-foreground">{rate}%</span>
          </div>
          <ProgressBar pct={rate} barClassName={p.status === "COMPLETED" ? "bg-green-500" : undefined} />
        </div>
      </div>
    </button>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onCreate, filtered = false }: { onCreate?: () => void; filtered?: boolean }) {
  return (
    <Card>
      <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-3">
        <GraduationCap className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{filtered ? "No programmes match these filters" : "No training programmes yet"}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {filtered
              ? "Try clearing a filter or search term."
              : "ISO/IEC 42001 Clause 7.2 (competence) and 7.3 (awareness) require documented evidence that staff — including the Board — were trained on AI governance. Add the first programme to start building that evidence trail."}
          </p>
        </div>
        {onCreate && !filtered && (
          <Button size="sm" onClick={onCreate} className="gap-1.5 mt-1">
            <Plus className="h-4 w-4" /> New Programme
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const api = useApi();

  const [data, setData] = useState<TrainingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAudience, setFilterAudience] = useState<Audience | "">("");
  const [filterStatus, setFilterStatus] = useState<TStatus | "">("");
  const [modalProgram, setModalProgram] = useState<TrainingProgram | null | "new">(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<TrainingResponse>("/training");
      setData(res);
    } catch {
      // toast surfaced by useApi
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rows = data?.rows ?? [];
  const stats = data?.stats ?? { total: 0, completed: 0, scheduled: 0, peopleTrained: 0, completionRate: 0 };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (filterAudience && p.audience !== filterAudience) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      if (q) {
        const hay = `${p.code} ${p.title} ${p.description ?? ""} ${p.facilitator ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, filterAudience, filterStatus]);

  const hasFilters = Boolean(search || filterAudience || filterStatus);

  // Audience coverage — computed from the full (unfiltered) dataset
  const coverage = useMemo(() => {
    return AUDIENCE_ORDER.map((audience) => {
      const forAudience = rows.filter((p) => p.audience === audience);
      const completed = forAudience.filter((p) => p.status === "COMPLETED").length;
      const total = forAudience.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { audience, total, completed, pct, gap: completed === 0 };
    });
  }, [rows]);

  function closeModal() { setModalProgram(null); }
  function handleSaved() { closeModal(); fetchData(); }
  function handleDeleted() { closeModal(); fetchData(); }

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
        <GraduationCap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-primary">Training & Enablement — ISO/IEC 42001 Clause 7.2 & 7.3</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evidence that the organisation built competence (Clause 7.2) and awareness (Clause 7.3) for AI
            governance — from Board-level oversight briefings to hands-on model-risk workshops for
            engineering teams. Auditors will ask for attendance records against this plan.
          </p>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Programmes" value={stats.total} icon={GraduationCap} variant="default" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} variant="success" />
        <StatCard title="People Trained" value={stats.peopleTrained} subtitle="Across completed programmes" icon={Users} variant="info" />
        <StatCard title="Avg. Attendance Rate" value={`${stats.completionRate}%`} icon={Award} variant="warning" />
      </div>

      {/* Audience coverage panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Audience Coverage
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Programme coverage by stakeholder group. A bank must be able to evidence Board-level AI awareness
            training specifically — any group with zero completed programmes is flagged as a coverage gap.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {coverage.map((c) => (
              <div key={c.audience} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium flex items-center gap-1.5">
                    {AUDIENCE_LABELS[c.audience]}
                    {c.gap && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                        <AlertTriangle className="h-2.5 w-2.5" /> Gap
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground">{c.completed} / {c.total} completed</span>
                </div>
                <ProgressBar pct={c.pct} barClassName={c.gap && c.total > 0 ? "bg-red-500" : undefined} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Training Programmes
              {filtered.length > 0 && <Badge variant="outline" className="text-xs ml-1">{filtered.length} shown</Badge>}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button size="sm" onClick={() => setModalProgram("new")} className="gap-1.5">
                <Plus className="h-4 w-4" /> New Programme
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search code, title, facilitator…"
                className="pl-8 h-8 text-xs w-56"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={filterAudience}
                onChange={(e) => setFilterAudience(e.target.value as Audience | "")}
                className="appearance-none bg-background border border-border rounded-md pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All audiences</option>
                {AUDIENCE_ORDER.map((a) => (
                  <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as TStatus | "")}
                className="appearance-none bg-background border border-border rounded-md px-3 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All statuses</option>
                {(Object.keys(STATUS_CONFIG) as TStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setFilterAudience(""); setFilterStatus(""); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded border border-border hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState onCreate={() => setModalProgram("new")} />
      ) : filtered.length === 0 ? (
        <EmptyState filtered />
      ) : (
        <div className="space-y-4">
          {STATUS_GROUPS.map((group) => {
            const groupRows = filtered.filter((p) => group.statuses.includes(p.status));
            if (groupRows.length === 0) return null;
            return (
              <Card key={group.title}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {group.title}
                    <Badge variant="outline" className="text-xs">{groupRows.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {groupRows.map((p) => (
                    <ProgrammeRow key={p.id} p={p} onClick={() => setModalProgram(p)} />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalProgram !== null && (
        <TrainingModal
          program={modalProgram === "new" ? null : modalProgram}
          onClose={closeModal}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
