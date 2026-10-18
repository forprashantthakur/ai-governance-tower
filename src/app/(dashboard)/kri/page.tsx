"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Brain, CheckCircle2,
  Database, Loader2, Pencil, Plus, RefreshCw, Server, Settings2, ShieldAlert,
  Sparkles, TrendingDown, Trash2, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

type KriDomainKey = "TECHNOLOGY" | "CYBER" | "AI" | "DATA";
type KriStatusKey = "GREEN" | "AMBER" | "RED";
type KriTrendKey = "IMPROVING" | "STABLE" | "DETERIORATING";
type KriDirectionKey = "LOWER_IS_BETTER" | "HIGHER_IS_BETTER";
type KriFrequencyKey = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY";

interface KriReadingRow {
  id: string;
  kriDefinitionId: string;
  periodLabel: string;
  value: number;
  status: KriStatusKey;
  trend: KriTrendKey;
  commentary: string | null;
  recordedAt: string;
}

interface KriDefinitionRow {
  id: string;
  organizationId: string;
  kriCode: string;
  name: string;
  domain: KriDomainKey;
  description: string | null;
  formula: string | null;
  unit: string;
  frequency: KriFrequencyKey;
  direction: KriDirectionKey;
  greenThreshold: number;
  amberThreshold: number;
  redThreshold: number;
  ownerRole: string | null;
  reportedTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  readings: KriReadingRow[];
}

interface DomainStat {
  red: number;
  amber: number;
  green: number;
  total: number;
}

interface KriStats {
  total: number;
  red: number;
  amber: number;
  green: number;
  noData: number;
  deteriorating: number;
  byDomain: Record<KriDomainKey, DomainStat>;
}

interface KriResponse {
  definitions: KriDefinitionRow[];
  stats: KriStats;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DOMAIN_ORDER: KriDomainKey[] = ["AI", "CYBER", "DATA", "TECHNOLOGY"];

const DOMAIN_CONFIG: Record<KriDomainKey, { label: string; icon: LucideIcon; description: string }> = {
  AI: {
    label: "AI Risk",
    icon: Brain,
    description: "Model validation, human oversight, drift and shadow AI",
  },
  CYBER: {
    label: "Cyber Risk",
    icon: ShieldAlert,
    description: "Adversarial testing, prompt-injection attempts, AI supply-chain CVEs",
  },
  DATA: {
    label: "Data Risk",
    icon: Database,
    description: "Training data provenance, DPDP consent basis, data-principal rights",
  },
  TECHNOLOGY: {
    label: "Technology Risk",
    icon: Server,
    description: "Platform availability, change failure, vendor concentration, continuity",
  },
};

const STATUS_TEXT: Record<KriStatusKey, string> = {
  GREEN: "text-green-400",
  AMBER: "text-yellow-400",
  RED: "text-red-400",
};

const STATUS_BADGE_VARIANT: Record<KriStatusKey, "success" | "warning" | "danger"> = {
  GREEN: "success",
  AMBER: "warning",
  RED: "danger",
};

const STATUS_DOT: Record<KriStatusKey, string> = {
  GREEN: "bg-green-500",
  AMBER: "bg-yellow-500",
  RED: "bg-red-500",
};

// ── Small visual primitives ──────────────────────────────────────────────────

function TrendIndicator({ trend }: { trend: KriTrendKey }) {
  if (trend === "IMPROVING") {
    return (
      <span className="inline-flex items-center gap-1 text-green-400 text-[11px] font-medium">
        <ArrowUp className="h-3 w-3" /> Improving
      </span>
    );
  }
  if (trend === "DETERIORATING") {
    return (
      <span className="inline-flex items-center gap-1 text-red-400 text-[11px] font-medium">
        <ArrowDown className="h-3 w-3" /> Deteriorating
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px] font-medium">
      <ArrowRight className="h-3 w-3" /> Stable
    </span>
  );
}

function Sparkline({ readings, status }: { readings: KriReadingRow[]; status: KriStatusKey }) {
  const last6 = readings.slice(-6);

  if (last6.length === 0) {
    return <div className="text-[10px] text-muted-foreground italic w-[90px] text-center">No data</div>;
  }

  const w = 120;
  const h = 32;
  const pad = 3;

  if (last6.length === 1) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className={`w-[90px] h-6 ${STATUS_TEXT[status]}`}>
        <circle cx={w / 2} cy={h / 2} r={3} fill="currentColor" />
      </svg>
    );
  }

  const values = last6.map((r) => r.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (last6.length - 1);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const [lastX, lastY] = points[points.length - 1].split(",").map(Number);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-[90px] h-6 ${STATUS_TEXT[status]}`}>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill="currentColor" />
    </svg>
  );
}

function computeThresholdBar(direction: KriDirectionKey, green: number, amber: number, red: number, value: number) {
  const lowerBetter = direction === "LOWER_IS_BETTER";
  const highestRef = Math.max(green, amber, red, value, 1);
  const domainMax = highestRef * 1.15;
  const toPct = (n: number) => {
    if (domainMax <= 0) return 0;
    const clamped = Math.min(Math.max(n, 0), domainMax);
    return (clamped / domainMax) * 100;
  };
  return {
    lowerBetter,
    greenBoundaryPct: toPct(green),
    amberBoundaryPct: toPct(amber),
    markerPct: toPct(value),
  };
}

function ThresholdBar({ def, value }: { def: KriDefinitionRow; value: number }) {
  const { lowerBetter, greenBoundaryPct, amberBoundaryPct, markerPct } = computeThresholdBar(
    def.direction,
    def.greenThreshold,
    def.amberThreshold,
    def.redThreshold,
    value
  );

  const zones = lowerBetter
    ? [
        { color: "bg-green-500/40", from: 0, to: greenBoundaryPct },
        { color: "bg-yellow-500/40", from: greenBoundaryPct, to: amberBoundaryPct },
        { color: "bg-red-500/40", from: amberBoundaryPct, to: 100 },
      ]
    : [
        { color: "bg-red-500/40", from: 0, to: amberBoundaryPct },
        { color: "bg-yellow-500/40", from: amberBoundaryPct, to: greenBoundaryPct },
        { color: "bg-green-500/40", from: greenBoundaryPct, to: 100 },
      ];

  return (
    <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
      {zones.map((z, i) => (
        <div
          key={i}
          className={`absolute top-0 h-full ${z.color}`}
          style={{ left: `${z.from}%`, width: `${Math.max(0, z.to - z.from)}%` }}
        />
      ))}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-foreground border-2 border-background shadow"
        style={{ left: `${markerPct}%` }}
      />
    </div>
  );
}

function MiniRagBar({ stat }: { stat: DomainStat }) {
  if (stat.total === 0) {
    return <div className="text-[10px] text-muted-foreground">No KRIs</div>;
  }
  const greenPct = (stat.green / stat.total) * 100;
  const amberPct = (stat.amber / stat.total) * 100;
  const redPct = (stat.red / stat.total) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-2 w-28 rounded-full overflow-hidden bg-muted">
        <div className="bg-green-500" style={{ width: `${greenPct}%` }} />
        <div className="bg-yellow-500" style={{ width: `${amberPct}%` }} />
        <div className="bg-red-500" style={{ width: `${redPct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums">
        {stat.green.toLocaleString("en-US")}G / {stat.amber.toLocaleString("en-US")}A / {stat.red.toLocaleString("en-US")}R
      </span>
    </div>
  );
}

// ── KRI row ───────────────────────────────────────────────────────────────────

function KriRow({
  def,
  manage,
  deleting,
  onOpen,
  onEdit,
  onDelete,
}: {
  def: KriDefinitionRow;
  manage: boolean;
  deleting: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const readings = def.readings;
  const latest = readings[readings.length - 1];
  const hasData = !!latest;
  const status: KriStatusKey = latest?.status ?? "GREEN";

  return (
    <div
      onClick={onOpen}
      className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 cursor-pointer transition-colors"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">
            {def.kriCode}
          </code>
          <span className="text-sm font-semibold truncate">{def.name}</span>
          {hasData && (
            <Badge variant={STATUS_BADGE_VARIANT[status]} className="text-[10px]">
              {status}
            </Badge>
          )}
          {!def.isActive && (
            <Badge variant="outline" className="text-[10px]">
              Inactive
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Owner: {def.ownerRole ?? "—"} · Reported to: {def.reportedTo ?? "—"}
        </p>
      </div>

      <div className="text-left min-w-[100px]">
        {hasData ? (
          <>
            <p className={`text-xl font-bold tabular-nums ${STATUS_TEXT[status]}`}>
              {latest.value.toLocaleString("en-US")}
              <span className="text-xs font-medium ml-0.5">{def.unit}</span>
            </p>
            <TrendIndicator trend={latest.trend} />
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic">No data</p>
        )}
      </div>

      <div className="flex items-center justify-center">
        <Sparkline readings={readings} status={status} />
      </div>

      <div className="min-w-[150px] space-y-1">
        {hasData ? (
          <>
            <ThresholdBar def={def} value={latest.value} />
            <div className="flex justify-between text-[9px] text-muted-foreground">
              {def.direction === "LOWER_IS_BETTER" ? (
                <>
                  <span>Green ≤ {def.greenThreshold.toLocaleString("en-US")}</span>
                  <span>Red &gt; {def.amberThreshold.toLocaleString("en-US")}</span>
                </>
              ) : (
                <>
                  <span>Red &lt; {def.amberThreshold.toLocaleString("en-US")}</span>
                  <span>Green ≥ {def.greenThreshold.toLocaleString("en-US")}</span>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="h-2 w-full rounded-full bg-muted" />
        )}

        {manage && (
          <div className="flex gap-3 justify-end pt-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onEdit}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── KRI detail + record-reading modal ───────────────────────────────────────

function KriDetailModal({
  def,
  onClose,
  onChanged,
}: {
  def: KriDefinitionRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const api = useApi();
  const { addNotification } = useUIStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ periodLabel: "", value: "", commentary: "" });

  const readingsDesc = [...def.readings].sort((a, b) => b.periodLabel.localeCompare(a.periodLabel));

  async function submitReading(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.periodLabel)) {
      addNotification({ type: "error", title: "Invalid period", message: "Use YYYY-MM format, e.g. 2026-09." });
      return;
    }
    if (form.value === "" || Number.isNaN(Number(form.value))) {
      addNotification({ type: "error", title: "Invalid value", message: "Enter a numeric reading value." });
      return;
    }
    setSaving(true);
    try {
      await api.post(`/kri/${def.id}/readings`, {
        periodLabel: form.periodLabel,
        value: Number(form.value),
        commentary: form.commentary || undefined,
      });
      addNotification({ type: "success", title: "Reading recorded", message: `${def.kriCode} — ${form.periodLabel}` });
      setForm({ periodLabel: "", value: "", commentary: "" });
      onChanged();
    } catch {
      // useApi already surfaces a toast on failure
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border">
                  {def.kriCode}
                </code>
                <Badge variant="outline" className="text-[10px]">
                  {DOMAIN_CONFIG[def.domain].label}
                </Badge>
              </div>
              <CardTitle className="text-base mt-1">{def.name}</CardTitle>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-4">
          {def.description && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{def.description}</p>
            </div>
          )}

          {def.formula && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Formula</p>
              <p className="text-sm font-mono bg-muted/50 rounded px-2 py-1.5 border border-border">{def.formula}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Thresholds ({def.direction === "LOWER_IS_BETTER" ? "lower is better" : "higher is better"})
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded border border-green-500/30 bg-green-500/10 px-2 py-1.5 text-center">
                <p className="text-[10px] text-muted-foreground">Green</p>
                <p className="text-sm font-bold text-green-400">
                  {def.direction === "LOWER_IS_BETTER" ? "≤" : "≥"} {def.greenThreshold.toLocaleString("en-US")}
                  {def.unit}
                </p>
              </div>
              <div className="rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-1.5 text-center">
                <p className="text-[10px] text-muted-foreground">Amber</p>
                <p className="text-sm font-bold text-yellow-400">
                  {def.direction === "LOWER_IS_BETTER" ? "≤" : "≥"} {def.amberThreshold.toLocaleString("en-US")}
                  {def.unit}
                </p>
              </div>
              <div className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-center">
                <p className="text-[10px] text-muted-foreground">Red</p>
                <p className="text-sm font-bold text-red-400">
                  {def.direction === "LOWER_IS_BETTER" ? ">" : "<"} {def.redThreshold.toLocaleString("en-US")}
                  {def.unit}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Owner:</span> {def.ownerRole ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Reported to:</span> {def.reportedTo ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Frequency:</span> {def.frequency}
            </div>
            <div>
              <span className="text-muted-foreground">Unit:</span> {def.unit}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Reading history</p>
            {readingsDesc.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No readings recorded yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {readingsDesc.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border border-border bg-muted/20"
                  >
                    <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[r.status]}`} />
                    <span className="font-mono w-16 shrink-0">{r.periodLabel}</span>
                    <span className={`font-semibold w-20 shrink-0 ${STATUS_TEXT[r.status]}`}>
                      {r.value.toLocaleString("en-US")}
                      {def.unit}
                    </span>
                    <span className="shrink-0">
                      <TrendIndicator trend={r.trend} />
                    </span>
                    {r.commentary && <span className="text-muted-foreground truncate">{r.commentary}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={submitReading} className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground">Record a new reading</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Period (YYYY-MM)</Label>
                <Input
                  placeholder="2026-09"
                  value={form.periodLabel}
                  onChange={(e) => setForm((p) => ({ ...p, periodLabel: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Value ({def.unit})</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={form.value}
                  onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Commentary (optional)</Label>
              <Textarea
                rows={2}
                placeholder="Context for this reading…"
                value={form.commentary}
                onChange={(e) => setForm((p) => ({ ...p, commentary: e.target.value }))}
              />
            </div>
            <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Record reading
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ── KRI definition create/edit modal ────────────────────────────────────────

interface DefinitionFormState {
  kriCode: string;
  name: string;
  domain: KriDomainKey;
  description: string;
  formula: string;
  unit: string;
  frequency: KriFrequencyKey;
  direction: KriDirectionKey;
  greenThreshold: string;
  amberThreshold: string;
  redThreshold: string;
  ownerRole: string;
  reportedTo: string;
}

function KriDefinitionFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: KriDefinitionRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const api = useApi();
  const { addNotification } = useUIStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DefinitionFormState>({
    kriCode: initial?.kriCode ?? "",
    name: initial?.name ?? "",
    domain: initial?.domain ?? "AI",
    description: initial?.description ?? "",
    formula: initial?.formula ?? "",
    unit: initial?.unit ?? "%",
    frequency: initial?.frequency ?? "MONTHLY",
    direction: initial?.direction ?? "LOWER_IS_BETTER",
    greenThreshold: initial ? String(initial.greenThreshold) : "",
    amberThreshold: initial ? String(initial.amberThreshold) : "",
    redThreshold: initial ? String(initial.redThreshold) : "",
    ownerRole: initial?.ownerRole ?? "",
    reportedTo: initial?.reportedTo ?? "",
  });

  function set<K extends keyof DefinitionFormState>(key: K, value: DefinitionFormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.kriCode.trim() || !form.name.trim()) {
      addNotification({ type: "error", title: "Missing fields", message: "KRI code and name are required." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kriCode: form.kriCode.trim(),
        name: form.name.trim(),
        domain: form.domain,
        description: form.description.trim() || undefined,
        formula: form.formula.trim() || undefined,
        unit: form.unit.trim() || "%",
        frequency: form.frequency,
        direction: form.direction,
        greenThreshold: Number(form.greenThreshold) || 0,
        amberThreshold: Number(form.amberThreshold) || 0,
        redThreshold: Number(form.redThreshold) || 0,
        ownerRole: form.ownerRole.trim() || undefined,
        reportedTo: form.reportedTo.trim() || undefined,
      };
      if (initial) {
        await api.patch(`/kri/${initial.id}`, payload);
        addNotification({ type: "success", title: "KRI updated", message: form.name });
      } else {
        await api.post("/kri", payload);
        addNotification({ type: "success", title: "KRI created", message: form.name });
      }
      onSaved();
    } catch {
      // useApi already surfaces a toast on failure
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-base">{initial ? "Edit KRI" : "Add KRI"}</CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">KRI Code</Label>
                <Input value={form.kriCode} onChange={(e) => set("kriCode", e.target.value)} placeholder="AI-KRI-07" required />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Domain</Label>
                <select
                  value={form.domain}
                  onChange={(e) => set("domain", e.target.value as KriDomainKey)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {DOMAIN_ORDER.map((d) => (
                    <option key={d} value={d}>
                      {DOMAIN_CONFIG[d].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Name</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Formula</Label>
              <Input
                value={form.formula}
                onChange={(e) => set("formula", e.target.value)}
                placeholder="(Numerator ÷ Denominator) × 100"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Unit</Label>
                <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="%, count, score" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Frequency</Label>
                <select
                  value={form.frequency}
                  onChange={(e) => set("frequency", e.target.value as KriFrequencyKey)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Direction</Label>
                <select
                  value={form.direction}
                  onChange={(e) => set("direction", e.target.value as KriDirectionKey)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="LOWER_IS_BETTER">Lower is better</option>
                  <option value="HIGHER_IS_BETTER">Higher is better</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-green-400">Green threshold</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.greenThreshold}
                  onChange={(e) => set("greenThreshold", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-yellow-400">Amber threshold</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.amberThreshold}
                  onChange={(e) => set("amberThreshold", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-red-400">Red threshold</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.redThreshold}
                  onChange={(e) => set("redThreshold", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Owner role</Label>
                <Input
                  value={form.ownerRole}
                  onChange={(e) => set("ownerRole", e.target.value)}
                  placeholder="Chief Information Security Officer"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Reported to</Label>
                <Input
                  value={form.reportedTo}
                  onChange={(e) => set("reportedTo", e.target.value)}
                  placeholder="Board Risk Committee"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gap-2" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : initial ? (
                  "Save changes"
                ) : (
                  "Create KRI"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function KriDashboardPage() {
  const api = useApi();
  const { addNotification } = useUIStore();

  const [data, setData] = useState<KriResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [manage, setManage] = useState(false);
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<KriDefinitionRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<KriResponse>("/kri");
      setData(res);
    } catch {
      // useApi already surfaces a toast on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function loadStandardSet() {
    setSeeding(true);
    try {
      await api.post("/kri/seed", {});
      addNotification({
        type: "success",
        title: "Standard KRI set installed",
        message: "17 KRIs across AI, cyber, data and technology risk, with six months of history.",
      });
      await load();
    } catch {
      // useApi already surfaces a toast on failure
    } finally {
      setSeeding(false);
    }
  }

  async function deleteDefinition(id: string) {
    if (!confirm("Delete this KRI and all its reading history? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await api.del(`/kri/${id}`);
      addNotification({ type: "success", title: "KRI deleted" });
      await load();
    } catch {
      // useApi already surfaces a toast on failure
    } finally {
      setDeletingId(null);
    }
  }

  const definitions = data?.definitions ?? [];
  const filtered = search
    ? definitions.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.kriCode.toLowerCase().includes(search.toLowerCase())
      )
    : definitions;

  const byDomain = (domain: KriDomainKey) => filtered.filter((d) => d.domain === domain);

  const stats = data?.stats;
  const detailDef = definitions.find((d) => d.id === detailId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Integrated Risk KRI Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI, Cyber, Data and Technology risk indicators reported together — a single integrated
          pack for the Board Risk Committee, not a separate AI appendix.
        </p>
      </div>

      {definitions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center text-center gap-3">
            <Activity className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-base font-semibold">No KRIs configured yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Install the standard catalogue to populate the Board Risk Committee pack with 17
                KRIs spanning AI, cyber, data and technology risk, complete with six months of
                reading history so the dashboard is immediately usable.
              </p>
            </div>
            <Button onClick={loadStandardSet} disabled={seeding} className="gap-2 mt-1">
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Load Standard KRI Set
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* RAG summary band */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Red"
              value={(stats?.red ?? 0).toLocaleString("en-US")}
              subtitle="Breaching threshold"
              icon={AlertTriangle}
              variant="danger"
            />
            <StatCard
              title="Amber"
              value={(stats?.amber ?? 0).toLocaleString("en-US")}
              subtitle="Approaching threshold"
              icon={AlertTriangle}
              variant="warning"
            />
            <StatCard
              title="Green"
              value={(stats?.green ?? 0).toLocaleString("en-US")}
              subtitle="Within tolerance"
              icon={CheckCircle2}
              variant="success"
            />
            <StatCard
              title="Deteriorating"
              value={(stats?.deteriorating ?? 0).toLocaleString("en-US")}
              subtitle="Trending worse period on period"
              icon={TrendingDown}
              variant="info"
            />
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <Input
              placeholder="Search KRI code or name…"
              className="w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button
                variant={manage ? "default" : "outline"}
                size="sm"
                onClick={() => setManage((m) => !m)}
                className="gap-1.5"
              >
                <Settings2 className="h-4 w-4" /> {manage ? "Manage: On" : "Manage"}
              </Button>
              {manage && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditTarget(null);
                    setShowForm(true);
                  }}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add KRI
                </Button>
              )}
            </div>
          </div>

          {/* Domain sections */}
          <div className="space-y-5">
            {DOMAIN_ORDER.map((domain) => {
              const items = byDomain(domain);
              const cfg = DOMAIN_CONFIG[domain];
              const domainStat = stats?.byDomain[domain];
              const Icon = cfg.icon;
              return (
                <Card key={domain}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {cfg.label}
                            <Badge variant="outline" className="text-[10px]">
                              {items.length}
                            </Badge>
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">{cfg.description}</p>
                        </div>
                      </div>
                      {domainStat && <MiniRagBar stat={domainStat} />}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">
                        No KRIs match the current search in this domain.
                      </p>
                    ) : (
                      items.map((def) => (
                        <KriRow
                          key={def.id}
                          def={def}
                          manage={manage}
                          deleting={deletingId === def.id}
                          onOpen={() => setDetailId(def.id)}
                          onEdit={() => {
                            setEditTarget(def);
                            setShowForm(true);
                          }}
                          onDelete={() => deleteDefinition(def.id)}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {detailDef && <KriDetailModal def={detailDef} onClose={() => setDetailId(null)} onChanged={load} />}

      {showForm && (
        <KriDefinitionFormModal
          initial={editTarget}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}
