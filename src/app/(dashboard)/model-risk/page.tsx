"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShieldAlert, Plus, RefreshCw, Search, Filter, X, ChevronDown, Loader2,
  CheckCircle2, XCircle, Calendar, AlertTriangle, ClipboardCheck,
  CalendarClock, Link2,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useUIStore } from "@/store/ui.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";

// ── Types ─────────────────────────────────────────────────────────────────────

type ModelTier = "TIER_1" | "TIER_2" | "TIER_3";
type ValidationOutcome = "PASS" | "PASS_WITH_CONDITIONS" | "FAIL" | "PENDING";

interface AvailableModel {
  id: string;
  name: string;
  type: string;
}

interface LinkedModel {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface ModelRiskRecord {
  id: string;
  modelId: string | null;
  modelName: string;
  modelOwner: string | null;
  businessUnit: string | null;
  tier: ModelTier;
  materialityScore: number;
  purpose: string | null;
  lastValidatedAt: string | null;
  nextValidationDue: string | null;
  validationOutcome: ValidationOutcome;
  validatorName: string | null;
  independentReview: boolean;
  conceptualSoundness: string | null;
  backtestingResult: string | null;
  benchmarkResult: string | null;
  ongoingMonitoring: string | null;
  limitations: string | null;
  conditions: string | null;
  openFindings: number;
  createdAt: string;
  updatedAt: string;
  model: LinkedModel | null;
}

interface MonthBucket {
  key: string;
  label: string;
  count: number;
}

interface Stats {
  total: number;
  tier1: number;
  overdue: number;
  failed: number;
  passWithConditions: number;
  failedOrConditional: number;
  tier1MissingIndependentReview: number;
  byTier: Record<ModelTier, number>;
  byMonth: MonthBucket[];
}

interface ModelRiskResponse {
  rows: ModelRiskRecord[];
  availableModels: AvailableModel[];
  stats: Stats;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<ModelTier, string> = {
  TIER_1: "Tier 1 — High Materiality",
  TIER_2: "Tier 2 — Moderate Materiality",
  TIER_3: "Tier 3 — Low Materiality",
};

const TIER_BADGE: Record<ModelTier, "danger" | "warning" | "secondary"> = {
  TIER_1: "danger",
  TIER_2: "warning",
  TIER_3: "secondary",
};

const OUTCOME_LABELS: Record<ValidationOutcome, string> = {
  PASS: "Pass",
  PASS_WITH_CONDITIONS: "Pass with Conditions",
  FAIL: "Fail",
  PENDING: "Pending",
};

const OUTCOME_BADGE: Record<ValidationOutcome, "success" | "warning" | "danger" | "secondary"> = {
  PASS: "success",
  PASS_WITH_CONDITIONS: "warning",
  FAIL: "danger",
  PENDING: "secondary",
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function toDateInput(d: string | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function isOverdue(d: string | null): boolean {
  if (!d) return false;
  return new Date(d) < new Date();
}

function materialityColor(score: number): string {
  if (score >= 70) return "bg-red-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-green-500";
}

// ── Record Modal (create + edit, validation dossier) ────────────────────────

interface FormState {
  modelId: string;
  modelName: string;
  modelOwner: string;
  businessUnit: string;
  tier: ModelTier;
  materialityScore: string;
  purpose: string;
  lastValidatedAt: string;
  nextValidationDue: string;
  validationOutcome: ValidationOutcome;
  validatorName: string;
  independentReview: boolean;
  conceptualSoundness: string;
  backtestingResult: string;
  benchmarkResult: string;
  ongoingMonitoring: string;
  limitations: string;
  conditions: string;
  openFindings: string;
}

function emptyForm(): FormState {
  return {
    modelId: "",
    modelName: "",
    modelOwner: "",
    businessUnit: "",
    tier: "TIER_2",
    materialityScore: "0",
    purpose: "",
    lastValidatedAt: "",
    nextValidationDue: "",
    validationOutcome: "PENDING",
    validatorName: "",
    independentReview: false,
    conceptualSoundness: "",
    backtestingResult: "",
    benchmarkResult: "",
    ongoingMonitoring: "",
    limitations: "",
    conditions: "",
    openFindings: "0",
  };
}

function recordToForm(r: ModelRiskRecord): FormState {
  return {
    modelId: r.modelId ?? "",
    modelName: r.modelName,
    modelOwner: r.modelOwner ?? "",
    businessUnit: r.businessUnit ?? "",
    tier: r.tier,
    materialityScore: String(r.materialityScore),
    purpose: r.purpose ?? "",
    lastValidatedAt: toDateInput(r.lastValidatedAt),
    nextValidationDue: toDateInput(r.nextValidationDue),
    validationOutcome: r.validationOutcome,
    validatorName: r.validatorName ?? "",
    independentReview: r.independentReview,
    conceptualSoundness: r.conceptualSoundness ?? "",
    backtestingResult: r.backtestingResult ?? "",
    benchmarkResult: r.benchmarkResult ?? "",
    ongoingMonitoring: r.ongoingMonitoring ?? "",
    limitations: r.limitations ?? "",
    conditions: r.conditions ?? "",
    openFindings: String(r.openFindings),
  };
}

function selectClass() {
  return "w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background";
}

function RecordModal({
  record,
  availableModels,
  onClose,
  onSuccess,
  onDeleted,
}: {
  record: ModelRiskRecord | null;
  availableModels: AvailableModel[];
  onClose: () => void;
  onSuccess: () => void;
  onDeleted: () => void;
}) {
  const api = useApi();
  const { addNotification } = useUIStore();
  const isEdit = !!record;
  const [form, setForm] = useState<FormState>(record ? recordToForm(record) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.modelName.trim()) {
      setError("Model name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        modelId: form.modelId || null,
        modelName: form.modelName.trim(),
        modelOwner: form.modelOwner || undefined,
        businessUnit: form.businessUnit || undefined,
        tier: form.tier,
        materialityScore: Number(form.materialityScore) || 0,
        purpose: form.purpose || undefined,
        lastValidatedAt: form.lastValidatedAt ? new Date(form.lastValidatedAt).toISOString() : null,
        nextValidationDue: form.nextValidationDue ? new Date(form.nextValidationDue).toISOString() : null,
        validationOutcome: form.validationOutcome,
        validatorName: form.validatorName || undefined,
        independentReview: form.independentReview,
        conceptualSoundness: form.conceptualSoundness || undefined,
        backtestingResult: form.backtestingResult || undefined,
        benchmarkResult: form.benchmarkResult || undefined,
        ongoingMonitoring: form.ongoingMonitoring || undefined,
        limitations: form.limitations || undefined,
        conditions: form.conditions || undefined,
        openFindings: Number(form.openFindings) || 0,
      };
      if (isEdit && record) {
        await api.patch(`/model-risk/${record.id}`, payload);
        addNotification({ type: "success", title: "Validation record updated", message: form.modelName });
      } else {
        await api.post("/model-risk", payload);
        addNotification({ type: "success", title: "Model added to MRM", message: form.modelName });
      }
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save model risk record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!record) return;
    if (!confirm(`Remove "${record.modelName}" from Model Risk Management? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.del(`/model-risk/${record.id}`);
      addNotification({ type: "success", title: "Record removed", message: record.modelName });
      onDeleted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete record.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">
              {isEdit ? "Model Validation Dossier" : "Add Model to MRM"}
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-6">
          {/* Section: Model Identification */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Model Identification &amp; Tiering
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Model Name <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Retail Credit Scoring Model v3"
                  value={form.modelName}
                  onChange={(e) => set("modelName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Link2 className="h-3 w-3" /> Linked Inventory Model (optional)
                </label>
                <div className="relative">
                  <select
                    value={form.modelId}
                    onChange={(e) => set("modelId", e.target.value)}
                    className={selectClass() + " appearance-none pr-8"}
                  >
                    <option value="">— Not linked to inventory —</option>
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Model Owner</label>
                <Input value={form.modelOwner} onChange={(e) => set("modelOwner", e.target.value)} placeholder="e.g. Head of Retail Analytics" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Business Unit</label>
                <Input value={form.businessUnit} onChange={(e) => set("businessUnit", e.target.value)} placeholder="e.g. Retail Banking" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tier</label>
                <div className="relative">
                  <select
                    value={form.tier}
                    onChange={(e) => set("tier", e.target.value as ModelTier)}
                    className={selectClass() + " appearance-none pr-8"}
                  >
                    <option value="TIER_1">Tier 1 — High Materiality</option>
                    <option value="TIER_2">Tier 2 — Moderate Materiality</option>
                    <option value="TIER_3">Tier 3 — Low Materiality</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Materiality Score (0–100)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.materialityScore}
                  onChange={(e) => set("materialityScore", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Purpose / Use Case</label>
                <Textarea
                  rows={2}
                  value={form.purpose}
                  onChange={(e) => set("purpose", e.target.value)}
                  placeholder="What business decision does this model drive?"
                />
              </div>
            </div>
          </section>

          {/* Section: Validation Schedule & Outcome */}
          <section className="space-y-3 pt-2 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Validation Schedule &amp; Outcome
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Last Validated</label>
                <Input type="date" value={form.lastValidatedAt} onChange={(e) => set("lastValidatedAt", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Next Validation Due</label>
                <Input type="date" value={form.nextValidationDue} onChange={(e) => set("nextValidationDue", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Validation Outcome</label>
                <div className="relative">
                  <select
                    value={form.validationOutcome}
                    onChange={(e) => set("validationOutcome", e.target.value as ValidationOutcome)}
                    className={selectClass() + " appearance-none pr-8"}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PASS">Pass</option>
                    <option value="PASS_WITH_CONDITIONS">Pass with Conditions</option>
                    <option value="FAIL">Fail</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Validator Name</label>
                <Input value={form.validatorName} onChange={(e) => set("validatorName", e.target.value)} placeholder="e.g. Independent Model Validation Unit" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Open Findings</label>
                <Input type="number" min={0} value={form.openFindings} onChange={(e) => set("openFindings", e.target.value)} />
              </div>
              <div className="space-y-1.5 flex items-end">
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground h-10 px-3 rounded-md border border-input bg-background w-full cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.independentReview}
                    onChange={(e) => set("independentReview", e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  Independently reviewed
                </label>
              </div>
            </div>
            {form.tier === "TIER_1" && !form.independentReview && (
              <p className="flex items-start gap-1.5 text-xs text-yellow-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Tier 1 (high materiality) models under RBI's model risk framework require independent
                validation outside the model development team.
              </p>
            )}
          </section>

          {/* Section: Validation Dossier */}
          <section className="space-y-3 pt-2 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Validation Dossier
            </h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Conceptual Soundness Review</label>
              <Textarea rows={2} value={form.conceptualSoundness} onChange={(e) => set("conceptualSoundness", e.target.value)}
                placeholder="Assessment of theoretical basis, assumptions, and design choices." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Backtesting Result</label>
                <Textarea rows={2} value={form.backtestingResult} onChange={(e) => set("backtestingResult", e.target.value)}
                  placeholder="Out-of-time / out-of-sample performance vs. expectations." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Benchmark Result</label>
                <Textarea rows={2} value={form.benchmarkResult} onChange={(e) => set("benchmarkResult", e.target.value)}
                  placeholder="Performance against a challenger model or industry benchmark." />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Ongoing Monitoring Plan</label>
              <Textarea rows={2} value={form.ongoingMonitoring} onChange={(e) => set("ongoingMonitoring", e.target.value)}
                placeholder="Drift, stability, and performance metrics tracked post-deployment, and their thresholds." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Limitations</label>
                <Textarea rows={2} value={form.limitations} onChange={(e) => set("limitations", e.target.value)}
                  placeholder="Known weaknesses, edge cases, or population segments where the model underperforms." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Conditions</label>
                <Textarea rows={2} value={form.conditions} onChange={(e) => set("conditions", e.target.value)}
                  placeholder="Conditions attached to a conditional pass, and their remediation owner/date." />
              </div>
            </div>
          </section>

          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            {isEdit && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting || saving}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
              </Button>
            )}
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving || deleting}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : isEdit ? "Save Changes" : "Add Model"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ModelRiskPage() {
  const api = useApi();
  const [data, setData] = useState<ModelRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<ModelTier | "">("");
  const [outcomeFilter, setOutcomeFilter] = useState<ValidationOutcome | "">("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ModelRiskRecord | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(tierFilter && { tier: tierFilter }),
        ...(outcomeFilter && { outcome: outcomeFilter }),
        ...(overdueOnly && { overdue: "true" }),
      });
      const res = await api.get<ModelRiskResponse>(`/model-risk?${params}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [tierFilter, outcomeFilter, overdueOnly]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  function openCreate() {
    setEditingRecord(null);
    setModalOpen(true);
  }

  function openEdit(r: ModelRiskRecord) {
    setEditingRecord(r);
    setModalOpen(true);
  }

  const stats = data?.stats ?? {
    total: 0, tier1: 0, overdue: 0, failed: 0, passWithConditions: 0,
    failedOrConditional: 0, tier1MissingIndependentReview: 0,
    byTier: { TIER_1: 0, TIER_2: 0, TIER_3: 0 },
    byMonth: [],
  };

  const displayRows = (data?.rows ?? []).filter((r) =>
    search ? r.modelName.toLowerCase().includes(search.toLowerCase()) : true
  );

  const maxMonthCount = Math.max(1, ...stats.byMonth.map((m) => m.count));

  const columns: Column<ModelRiskRecord>[] = [
    {
      key: "modelName",
      header: "Model",
      cell: (row) => (
        <button
          className="text-left hover:text-primary transition-colors"
          onClick={() => openEdit(row)}
        >
          <p className="text-sm font-medium">{row.modelName}</p>
          {row.model && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Link2 className="h-3 w-3" /> {row.model.name}
            </p>
          )}
        </button>
      ),
    },
    {
      key: "businessUnit",
      header: "Business Unit",
      cell: (row) => <span className="text-sm text-muted-foreground">{row.businessUnit || "—"}</span>,
    },
    {
      key: "tier",
      header: "Tier",
      cell: (row) => <Badge variant={TIER_BADGE[row.tier]}>{row.tier.replace("_", " ")}</Badge>,
    },
    {
      key: "materialityScore",
      header: "Materiality",
      cell: (row) => (
        <div className="w-28">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs tabular-nums text-muted-foreground">{row.materialityScore}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${materialityColor(row.materialityScore)}`}
              style={{ width: `${row.materialityScore}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "lastValidatedAt",
      header: "Last Validated",
      cell: (row) => <span className="text-xs text-muted-foreground">{fmtDate(row.lastValidatedAt)}</span>,
    },
    {
      key: "nextValidationDue",
      header: "Next Due",
      cell: (row) => {
        const overdue = isOverdue(row.nextValidationDue);
        return (
          <span className={`text-xs flex items-center gap-1 ${overdue ? "text-red-400 font-medium" : "text-muted-foreground"}`}>
            <Calendar className="h-3 w-3" /> {fmtDate(row.nextValidationDue)}
          </span>
        );
      },
    },
    {
      key: "validationOutcome",
      header: "Outcome",
      cell: (row) => <Badge variant={OUTCOME_BADGE[row.validationOutcome]}>{OUTCOME_LABELS[row.validationOutcome]}</Badge>,
    },
    {
      key: "independentReview",
      header: "Indep. Review",
      cell: (row) =>
        row.independentReview ? (
          <CheckCircle2 className="h-4 w-4 text-green-400" />
        ) : (
          <XCircle className="h-4 w-4 text-red-400" />
        ),
    },
    {
      key: "openFindings",
      header: "Open Findings",
      cell: (row) => (
        <span className={`text-sm tabular-nums font-medium ${row.openFindings > 0 ? "text-orange-400" : "text-muted-foreground"}`}>
          {row.openFindings}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
        <ShieldAlert className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-primary">Model Risk Management</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every AI/ML model tiered by materiality and independently validated on a
            tier-driven cycle, per RBI's model risk management expectations. Tier 1 models
            require independent review outside the development team.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Models Under MRM" value={stats.total} icon={ClipboardCheck} />
        <StatCard title="Tier 1 (High Materiality)" value={stats.tier1} icon={AlertTriangle} variant={stats.tier1 > 0 ? "danger" : "default"} />
        <StatCard title="Overdue Revalidation" value={stats.overdue} icon={CalendarClock} variant={stats.overdue > 0 ? "danger" : "success"} />
        <StatCard title="Failed / Conditional Validations" value={stats.failedOrConditional} icon={XCircle} variant={stats.failedOrConditional > 0 ? "warning" : "success"} />
      </div>

      {/* Validation calendar strip */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Validation Calendar — Next 6 Months
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {stats.byMonth.map((m) => (
              <div key={m.key} className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-2">{m.label}</p>
                <p className={`text-xl font-bold tabular-nums ${m.count > 0 ? "text-foreground" : "text-muted-foreground"}`}>{m.count}</p>
                <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(m.count / maxMonthCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Model Risk Register
              <Badge variant="outline" className="text-xs ml-1">{displayRows.length} model{displayRows.length !== 1 ? "s" : ""}</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Model to MRM
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search model name…"
                className="pl-8 h-8 text-xs w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value as ModelTier | "")}
                className="appearance-none bg-background border border-border rounded-md pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All tiers</option>
                <option value="TIER_1">Tier 1</option>
                <option value="TIER_2">Tier 2</option>
                <option value="TIER_3">Tier 3</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value as ValidationOutcome | "")}
                className="appearance-none bg-background border border-border rounded-md px-3 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All outcomes</option>
                <option value="PASS">Pass</option>
                <option value="PASS_WITH_CONDITIONS">Pass with Conditions</option>
                <option value="FAIL">Fail</option>
                <option value="PENDING">Pending</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            <button
              onClick={() => setOverdueOnly((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                overdueOnly
                  ? "border-red-500/40 bg-red-500/10 text-red-400"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <CalendarClock className="h-3.5 w-3.5" /> Overdue only
            </button>

            {(search || tierFilter || outcomeFilter || overdueOnly) && (
              <button
                onClick={() => { setSearch(""); setTierFilter(""); setOutcomeFilter(""); setOverdueOnly(false); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded border border-border hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {displayRows.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShieldAlert className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                {stats.total > 0 ? "No models match your filters." : "No models under MRM yet."}
              </p>
              {stats.total === 0 && (
                <Button size="sm" onClick={openCreate} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add Model to MRM
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={displayRows}
              loading={loading}
              emptyMessage="No models under MRM yet."
            />
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {modalOpen && (
        <RecordModal
          record={editingRecord}
          availableModels={data?.availableModels ?? []}
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setModalOpen(false); fetchRows(); }}
          onDeleted={() => { setModalOpen(false); fetchRows(); }}
        />
      )}
    </div>
  );
}
