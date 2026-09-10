"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Landmark, ExternalLink, Info, ScrollText, Search, ChevronDown, ChevronRight,
  Loader2, Save, Sparkles, ShieldCheck, ListChecks, CheckCircle2, XCircle, Clock,
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
import {
  FREE_AI_CATALOG, FREE_AI_PILLARS, PILLAR_ORDER, FREE_AI_SOURCE,
  type FreeAiItemSeed, type FreeAiPillarKey,
} from "@/lib/frameworks/free-ai";

// ── Types ─────────────────────────────────────────────────────────────────────

type FreeAiItemType = "SUTRA" | "RECOMMENDATION";
type FreeAiStatus = "PASS" | "FAIL" | "PARTIAL" | "NOT_APPLICABLE" | "PENDING_REVIEW";

interface FreeAiItem {
  id: string;
  itemCode: string;
  itemType: FreeAiItemType;
  pillar: string;
  title: string;
  description: string;
  applicability: string | null;
  status: FreeAiStatus;
  ownerRole: string | null;
  evidence: string | null;
  gapNotes: string | null;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

type AddNotification = (n: { type: "success" | "error" | "warning" | "info"; title: string; message?: string }) => void;

// The DB has no column for the catalogue's actionOwner/timeline — those are
// joined in here on the client by matching itemCode against the catalogue.
const CATALOG_BY_CODE: Record<string, FreeAiItemSeed> = Object.fromEntries(
  FREE_AI_CATALOG.map((item) => [item.itemCode, item])
);

const STATUS_ORDER: FreeAiStatus[] = ["PASS", "PARTIAL", "PENDING_REVIEW", "FAIL", "NOT_APPLICABLE"];

const STATUS_META: Record<FreeAiStatus, { label: string; variant: "success" | "warning" | "danger" | "secondary" | "info" }> = {
  PASS:            { label: "Compliant",      variant: "success" },
  PARTIAL:         { label: "Partial",        variant: "warning" },
  PENDING_REVIEW:  { label: "Pending Review", variant: "info" },
  FAIL:            { label: "Gap",            variant: "danger" },
  NOT_APPLICABLE:  { label: "Not Applicable", variant: "secondary" },
};

const TIMELINE_META: Record<string, { label: string; variant: "warning" | "secondary" }> = {
  SHORT_TERM:  { label: "Short term",  variant: "warning" },
  MEDIUM_TERM: { label: "Medium term", variant: "secondary" },
};

// A recommendation is "Regulator-led" when its RBI Action column does not
// name Regulated Entities as an actor — the bank's compliance team has
// nothing to directly action, so the item is visually de-emphasised rather
// than hidden.
function isRegulatorLed(actionOwner: string): boolean {
  return !/\bREs?\b/.test(actionOwner) && !/Regulated Entities/i.test(actionOwner);
}

function toInputDate(d: string | null): string {
  return d ? d.slice(0, 10) : "";
}

function StatusBadge({ status }: { status: FreeAiStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function TimelineBadge({ timeline }: { timeline: string }) {
  const meta = TIMELINE_META[timeline];
  if (!meta) return null;
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function computeStats(items: FreeAiItem[]) {
  const total = items.length;
  const compliant = items.filter((i) => i.status === "PASS").length;
  const gaps = items.filter((i) => i.status === "FAIL").length;
  const shortTermOutstanding = items.filter(
    (i) => CATALOG_BY_CODE[i.itemCode]?.timeline === "SHORT_TERM" && i.status !== "PASS"
  ).length;
  return { total, compliant, gaps, shortTermOutstanding };
}

function matchesFilters(
  item: FreeAiItem,
  search: string,
  statusFilter: FreeAiStatus | "ALL",
  pillarFilter: FreeAiPillarKey | "ALL",
  shortTermOnly: boolean
): boolean {
  if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
  if (pillarFilter !== "ALL" && item.pillar !== pillarFilter) return false;
  if (shortTermOnly && CATALOG_BY_CODE[item.itemCode]?.timeline !== "SHORT_TERM") return false;
  const q = search.trim().toLowerCase();
  if (q && !`${item.itemCode} ${item.title}`.toLowerCase().includes(q)) return false;
  return true;
}

// ── Provenance banner ────────────────────────────────────────────────────────

function ProvenanceBanner() {
  return (
    <Card className="border-border bg-muted/30">
      <CardContent className="p-5 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <Landmark className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{FREE_AI_SOURCE.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {FREE_AI_SOURCE.publisher} &middot; Published {FREE_AI_SOURCE.publishedOn} &middot; Chair: {FREE_AI_SOURCE.chair}
            </p>
            <a
              href={FREE_AI_SOURCE.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5"
            >
              Read the full report <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5">
          <Info className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-200/90 leading-relaxed">{FREE_AI_SOURCE.statusNote}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Sutra card ────────────────────────────────────────────────────────────────

function SutraCard({
  item, api, addNotification, onSaved,
}: {
  item: FreeAiItem;
  api: ReturnType<typeof useApi>;
  addNotification: AddNotification;
  onSaved: (updated: FreeAiItem) => void;
}) {
  const [status, setStatus] = useState<FreeAiStatus>(item.status);
  const [saving, setSaving] = useState(false);

  useEffect(() => setStatus(item.status), [item.status]);

  async function handleChange(next: FreeAiStatus) {
    const prev = status;
    setStatus(next);
    setSaving(true);
    try {
      const updated = await api.patch<FreeAiItem>(`/free-ai/${item.id}`, { status: next });
      onSaved(updated);
      addNotification({ type: "success", title: "Sutra updated", message: `${item.itemCode} saved` });
    } catch {
      setStatus(prev);
    } finally {
      setSaving(false);
    }
  }

  const number = item.itemCode.replace("SUTRA-", "");

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
              {number}
            </span>
            <p className="text-sm font-semibold leading-snug">{item.title}</p>
          </div>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0 mt-1" />}
        </div>
        <p className="text-xs italic text-muted-foreground leading-relaxed">{item.description}</p>
        {item.applicability && (
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed border-t border-border/50 pt-2">
            {item.applicability}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 pt-1">
          <StatusBadge status={status} />
          <select
            value={status}
            onChange={(e) => handleChange(e.target.value as FreeAiStatus)}
            disabled={saving}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Recommendation row ───────────────────────────────────────────────────────

interface RecEditState {
  status: FreeAiStatus;
  ownerRole: string;
  evidence: string;
  gapNotes: string;
  targetDate: string;
  saving: boolean;
  saved: boolean;
  error: string;
}

function toEditState(item: FreeAiItem): RecEditState {
  return {
    status: item.status,
    ownerRole: item.ownerRole ?? "",
    evidence: item.evidence ?? "",
    gapNotes: item.gapNotes ?? "",
    targetDate: toInputDate(item.targetDate),
    saving: false,
    saved: false,
    error: "",
  };
}

function RecommendationRow({
  item, expanded, onToggle, onSaved, api, addNotification,
}: {
  item: FreeAiItem;
  expanded: boolean;
  onToggle: () => void;
  onSaved: (updated: FreeAiItem) => void;
  api: ReturnType<typeof useApi>;
  addNotification: AddNotification;
}) {
  const [edit, setEdit] = useState<RecEditState>(() => toEditState(item));
  const catalogEntry = CATALOG_BY_CODE[item.itemCode];

  useEffect(() => {
    if (expanded) setEdit(toEditState(item));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, item.id]);

  async function save() {
    setEdit((p) => ({ ...p, saving: true, saved: false, error: "" }));
    try {
      const updated = await api.patch<FreeAiItem>(`/free-ai/${item.id}`, {
        status: edit.status,
        ownerRole: edit.ownerRole || null,
        evidence: edit.evidence || null,
        gapNotes: edit.gapNotes || null,
        targetDate: edit.targetDate ? new Date(edit.targetDate).toISOString() : null,
      });
      setEdit((p) => ({ ...p, saving: false, saved: true }));
      addNotification({ type: "success", title: "Item updated", message: `${item.itemCode} saved` });
      onSaved(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setEdit((p) => ({ ...p, saving: false, error: msg }));
    }
  }

  const regulatorLed = catalogEntry ? isRegulatorLed(catalogEntry.actionOwner) : false;

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex flex-col gap-1.5 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="font-mono font-bold text-xs text-primary w-16 shrink-0">{item.itemCode}</span>
          <span className="text-sm font-medium flex-1 min-w-0 truncate">{item.title}</span>
          {regulatorLed && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border shrink-0">
              Regulator-led
            </Badge>
          )}
          {catalogEntry && catalogEntry.timeline !== "NOT_APPLICABLE" && (
            <TimelineBadge timeline={catalogEntry.timeline} />
          )}
          <StatusBadge status={item.status} />
        </div>
        <div className="pl-7 flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
          <p className="text-[11px] text-muted-foreground/80 truncate">
            Action: <span className="text-foreground/70">{catalogEntry?.actionOwner ?? "—"}</span>
            {" · "}Owner: {item.ownerRole ?? "Unassigned"}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-5 pt-1 space-y-4 bg-muted/10">
          {item.applicability && (
            <div className="rounded-lg bg-muted/30 border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Applicability Guidance
              </p>
              <p className="text-xs leading-relaxed text-foreground">{item.applicability}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <select
                value={edit.status}
                onChange={(e) => setEdit((p) => ({ ...p, status: e.target.value as FreeAiStatus, saved: false }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Owner Role</Label>
              <Input
                value={edit.ownerRole}
                onChange={(e) => setEdit((p) => ({ ...p, ownerRole: e.target.value, saved: false }))}
                placeholder="e.g. Head of Model Risk"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Evidence</Label>
            <Textarea
              rows={2}
              value={edit.evidence}
              onChange={(e) => setEdit((p) => ({ ...p, evidence: e.target.value, saved: false }))}
              placeholder="Where the evidence for this item lives..."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Gap Notes</Label>
            <Textarea
              rows={2}
              value={edit.gapNotes}
              onChange={(e) => setEdit((p) => ({ ...p, gapNotes: e.target.value, saved: false }))}
              placeholder="What's missing and the plan to close it..."
            />
          </div>

          <div className="space-y-1.5 max-w-xs">
            <Label className="text-xs">Target Date</Label>
            <Input
              type="date"
              value={edit.targetDate}
              onChange={(e) => setEdit((p) => ({ ...p, targetDate: e.target.value, saved: false }))}
            />
          </div>

          {edit.error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-1.5">{edit.error}</p>
          )}

          <div className="flex items-center justify-between">
            {edit.saved ? (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Saved
              </span>
            ) : <span />}
            <Button size="sm" onClick={save} disabled={edit.saving}>
              {edit.saving ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving…</>
              ) : (
                <><Save className="h-3.5 w-3.5 mr-1.5" /> Save</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pillar card (recommendations) ────────────────────────────────────────────

function PillarCard({
  pillarKey, description, all, shown, expandedId, setExpandedId, onSaved, api, addNotification,
}: {
  pillarKey: FreeAiPillarKey;
  description: string;
  all: FreeAiItem[];
  shown: FreeAiItem[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onSaved: (updated: FreeAiItem) => void;
  api: ReturnType<typeof useApi>;
  addNotification: AddNotification;
}) {
  const compliant = all.filter((i) => i.status === "PASS").length;
  const pct = all.length > 0 ? Math.round((compliant / all.length) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm">{pillarKey}</CardTitle>
          <span className="text-xs text-muted-foreground shrink-0">
            {compliant} of {all.length} compliant
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
          <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {shown.length === 0 ? (
          <p className="text-xs text-muted-foreground px-4 pb-4">No recommendations in this pillar match the current filters.</p>
        ) : (
          shown.map((item) => (
            <RecommendationRow
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onSaved={onSaved}
              api={api}
              addNotification={addNotification}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FreeAiPage() {
  const api = useApi();
  const { addNotification } = useUIStore();

  const [items, setItems] = useState<FreeAiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FreeAiStatus | "ALL">("ALL");
  const [pillarFilter, setPillarFilter] = useState<FreeAiPillarKey | "ALL">("ALL");
  const [shortTermOnly, setShortTermOnly] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<{ rows: FreeAiItem[] }>("/free-ai");
      setItems(data.rows ?? []);
    } catch {
      // error already surfaced by useApi
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function loadFramework() {
    setSeeding(true);
    try {
      await api.post("/free-ai/seed", {});
      addNotification({ type: "success", title: "FREE-AI framework loaded", message: "7 Sutras and 26 Recommendations installed" });
      await load();
    } catch {
      // error already surfaced by useApi
    } finally {
      setSeeding(false);
    }
  }

  function handleSaved(updated: FreeAiItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  const stats = useMemo(() => computeStats(items), [items]);

  const filtered = useMemo(
    () => items.filter((i) => matchesFilters(i, search, statusFilter, pillarFilter, shortTermOnly)),
    [items, search, statusFilter, pillarFilter, shortTermOnly]
  );

  const sutraItems = useMemo(
    () => items.filter((i) => i.itemType === "SUTRA").sort((a, b) => a.itemCode.localeCompare(b.itemCode, "en-US", { numeric: true })),
    [items]
  );
  const sutraShown = useMemo(
    () => filtered.filter((i) => i.itemType === "SUTRA").sort((a, b) => a.itemCode.localeCompare(b.itemCode, "en-US", { numeric: true })),
    [filtered]
  );

  const recItems = useMemo(() => items.filter((i) => i.itemType === "RECOMMENDATION"), [items]);
  const recFiltered = useMemo(() => filtered.filter((i) => i.itemType === "RECOMMENDATION"), [filtered]);

  const pillarGroups = useMemo(() => {
    return PILLAR_ORDER.filter((key) => key !== "Sutras").map((key) => {
      const meta = FREE_AI_PILLARS.find((p) => p.key === key)!;
      return {
        key,
        meta,
        all: recItems.filter((i) => i.pillar === key),
        shown: recFiltered.filter((i) => i.pillar === key),
      };
    }).filter((g) => g.all.length > 0);
  }, [recItems, recFiltered]);

  const mitigationGroups = pillarGroups.filter((g) => g.meta.group === "MITIGATION" && (pillarFilter === "ALL" || pillarFilter === g.key));
  const enablementGroups = pillarGroups.filter((g) => g.meta.group === "ENABLEMENT" && (pillarFilter === "ALL" || pillarFilter === g.key));
  const showSutraBand = (pillarFilter === "ALL" || pillarFilter === "Sutras") && sutraItems.length > 0;

  const compliantPct = stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          RBI FREE-AI Alignment
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Track the organization&apos;s alignment against the RBI&apos;s Framework for Responsible and Ethical
          Enablement of AI (FREE-AI) — the 7 guiding Sutras and 26 recommendations across the Innovation
          Enablement and Risk Mitigation frameworks.
        </p>
      </div>

      <ProvenanceBanner />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 flex flex-col items-center text-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <h2 className="text-base font-semibold">Load the FREE-AI reference catalogue</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              This installs the 7 Sutras and 26 Recommendations from the August 2025 RBI committee report so you
              can record a status, evidence and gap notes against each.
            </p>
            <Button onClick={loadFramework} disabled={seeding}>
              {seeding ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Load FREE-AI Framework</>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stat row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Items Tracked" value={stats.total} subtitle="7 Sutras + 26 Recommendations" icon={ListChecks} />
            <StatCard
              title="Compliant"
              value={stats.compliant}
              subtitle={`${compliantPct}% of tracked items`}
              icon={CheckCircle2}
              variant="success"
            />
            <StatCard title="Gaps" value={stats.gaps} subtitle="Marked Fail — needs remediation" icon={XCircle} variant="danger" />
            <StatCard
              title="Short-Term Items Outstanding"
              value={stats.shortTermOutstanding}
              subtitle="RBI tags recommendations Short term or Medium term only — there is no long-term tag."
              icon={Clock}
              variant="warning"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(["ALL", ...STATUS_ORDER] as (FreeAiStatus | "ALL")[]).map((s) => {
                const count = s === "ALL" ? items.length : items.filter((i) => i.status === s).length;
                const label = s === "ALL" ? "All" : STATUS_META[s].label;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
              <button
                onClick={() => setShortTermOnly((v) => !v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  shortTermOnly ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="h-3 w-3" /> Short-term only
              </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
              <div className="relative w-full md:w-72">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search item code or title..."
                  className="pl-9"
                />
              </div>
              <select
                value={pillarFilter}
                onChange={(e) => setPillarFilter(e.target.value as FreeAiPillarKey | "ALL")}
                className="w-full md:w-56 h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ALL">All Pillars</option>
                {PILLAR_ORDER.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
          </div>

          {/* The 7 Sutras */}
          {showSutraBand && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ScrollText className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  The 7 Sutras — Guiding Principles
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mb-3 max-w-3xl">
                {FREE_AI_PILLARS.find((p) => p.key === "Sutras")?.description}
              </p>
              {sutraShown.length === 0 ? (
                <p className="text-xs text-muted-foreground">No Sutras match the current filters.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {sutraShown.map((item) => (
                    <SutraCard key={item.id} item={item} api={api} addNotification={addNotification} onSaved={handleSaved} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Risk Mitigation Framework */}
          {mitigationGroups.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Risk Mitigation Framework
              </h2>
              {mitigationGroups.map((g) => (
                <PillarCard
                  key={g.key}
                  pillarKey={g.key}
                  description={g.meta.description}
                  all={g.all}
                  shown={g.shown}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  onSaved={handleSaved}
                  api={api}
                  addNotification={addNotification}
                />
              ))}
            </div>
          )}

          {/* Innovation Enablement Framework */}
          {enablementGroups.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Innovation Enablement Framework
              </h2>
              {enablementGroups.map((g) => (
                <PillarCard
                  key={g.key}
                  pillarKey={g.key}
                  description={g.meta.description}
                  all={g.all}
                  shown={g.shown}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  onSaved={handleSaved}
                  api={api}
                  addNotification={addNotification}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
