"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList, Plus, RefreshCw, Search, Filter, X, ChevronDown, Loader2,
  CheckCircle2, AlertOctagon, AlertTriangle, Gauge, Calendar, XCircle, Lightbulb,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useUIStore } from "@/store/ui.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type Column } from "@/components/shared/data-table";

// ── Types ─────────────────────────────────────────────────────────────────────

type TestMethod = "INQUIRY" | "OBSERVATION" | "INSPECTION" | "REPERFORMANCE";
type TestResult = "NOT_TESTED" | "EFFECTIVE" | "PARTIALLY_EFFECTIVE" | "INEFFECTIVE";

interface ControlTest {
  id: string;
  testRef: string;
  controlRef: string;
  controlTitle: string;
  framework: string;
  testObjective: string | null;
  testProcedure: string | null;
  method: TestMethod;
  sampleSize: number;
  samplesTested: number;
  exceptions: number;
  result: TestResult;
  testedBy: string | null;
  testedAt: string | null;
  evidence: string | null;
  conclusion: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FrameworkBucket {
  framework: string;
  total: number;
  effective: number;
  partiallyEffective: number;
  ineffective: number;
  notTested: number;
}

interface Stats {
  total: number;
  tested: number;
  effective: number;
  partiallyEffective: number;
  ineffective: number;
  notTested: number;
  effectivenessRate: number;
  byFramework: FrameworkBucket[];
}

interface ControlTestResponse {
  rows: ControlTest[];
  stats: Stats;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<TestMethod, string> = {
  INQUIRY: "Inquiry",
  OBSERVATION: "Observation",
  INSPECTION: "Inspection",
  REPERFORMANCE: "Reperformance",
};

const RESULT_LABELS: Record<TestResult, string> = {
  EFFECTIVE: "Effective",
  PARTIALLY_EFFECTIVE: "Partially Effective",
  INEFFECTIVE: "Ineffective",
  NOT_TESTED: "Not Tested",
};

const RESULT_BADGE: Record<TestResult, "success" | "warning" | "danger" | "secondary"> = {
  EFFECTIVE: "success",
  PARTIALLY_EFFECTIVE: "warning",
  INEFFECTIVE: "danger",
  NOT_TESTED: "secondary",
};

const FRAMEWORK_LABELS: Record<string, string> = {
  ISO42001: "ISO/IEC 42001",
  RBI_FREE_AI: "RBI FREE-AI Framework",
  DPDP: "DPDP Act 2023",
  RBI_MRM: "RBI Model Risk Management",
};

function frameworkLabel(f: string): string {
  return FRAMEWORK_LABELS[f] ?? f.replace(/_/g, " ");
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function toDateInput(d: string | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function selectClass() {
  return "w-full h-10 rounded-md border border-input bg-background px-3 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background";
}

// ── Record Modal (create + edit) ─────────────────────────────────────────────

interface FormState {
  testRef: string;
  controlRef: string;
  controlTitle: string;
  framework: string;
  testObjective: string;
  testProcedure: string;
  method: TestMethod;
  sampleSize: string;
  samplesTested: string;
  exceptions: string;
  result: TestResult;
  testedBy: string;
  testedAt: string;
  evidence: string;
  conclusion: string;
}

function emptyForm(): FormState {
  return {
    testRef: "",
    controlRef: "",
    controlTitle: "",
    framework: "ISO42001",
    testObjective: "",
    testProcedure: "",
    method: "INSPECTION",
    sampleSize: "0",
    samplesTested: "0",
    exceptions: "0",
    result: "NOT_TESTED",
    testedBy: "",
    testedAt: "",
    evidence: "",
    conclusion: "",
  };
}

function testToForm(t: ControlTest): FormState {
  return {
    testRef: t.testRef,
    controlRef: t.controlRef,
    controlTitle: t.controlTitle,
    framework: t.framework,
    testObjective: t.testObjective ?? "",
    testProcedure: t.testProcedure ?? "",
    method: t.method,
    sampleSize: String(t.sampleSize),
    samplesTested: String(t.samplesTested),
    exceptions: String(t.exceptions),
    result: t.result,
    testedBy: t.testedBy ?? "",
    testedAt: toDateInput(t.testedAt),
    evidence: t.evidence ?? "",
    conclusion: t.conclusion ?? "",
  };
}

function TestModal({
  test,
  frameworks,
  onClose,
  onSuccess,
  onDeleted,
}: {
  test: ControlTest | null;
  frameworks: string[];
  onClose: () => void;
  onSuccess: () => void;
  onDeleted: () => void;
}) {
  const api = useApi();
  const { addNotification } = useUIStore();
  const isEdit = !!test;
  const [form, setForm] = useState<FormState>(test ? testToForm(test) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const exceptionsCount = Number(form.exceptions) || 0;
  const showHint = exceptionsCount > 0 && form.result === "NOT_TESTED";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.testRef.trim() || !form.controlRef.trim() || !form.controlTitle.trim()) {
      setError("Test ref, control ref, and control title are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        testRef: form.testRef.trim(),
        controlRef: form.controlRef.trim(),
        controlTitle: form.controlTitle.trim(),
        framework: form.framework,
        testObjective: form.testObjective || undefined,
        testProcedure: form.testProcedure || undefined,
        method: form.method,
        sampleSize: Number(form.sampleSize) || 0,
        samplesTested: Number(form.samplesTested) || 0,
        exceptions: Number(form.exceptions) || 0,
        result: form.result,
        testedBy: form.testedBy || undefined,
        testedAt: form.testedAt ? new Date(form.testedAt).toISOString() : null,
        evidence: form.evidence || undefined,
        conclusion: form.conclusion || undefined,
      };
      if (isEdit && test) {
        await api.patch(`/control-testing/${test.id}`, payload);
        addNotification({ type: "success", title: "Control test updated", message: form.testRef });
      } else {
        await api.post("/control-testing", payload);
        addNotification({ type: "success", title: "Control test created", message: form.testRef });
      }
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save control test.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!test) return;
    if (!confirm(`Delete test "${test.testRef}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.del(`/control-testing/${test.id}`);
      addNotification({ type: "success", title: "Control test deleted", message: test.testRef });
      onDeleted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete control test.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">{isEdit ? "Edit Control Test" : "New Control Test"}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Test Ref <span className="text-red-400">*</span>
              </label>
              <Input placeholder="e.g. CT-2026-014" value={form.testRef} onChange={(e) => set("testRef", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Control Ref <span className="text-red-400">*</span>
              </label>
              <Input placeholder="e.g. A.8.28" value={form.controlRef} onChange={(e) => set("controlRef", e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Control Title <span className="text-red-400">*</span>
            </label>
            <Input placeholder="e.g. Secure coding for AI model pipelines" value={form.controlTitle} onChange={(e) => set("controlTitle", e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Framework</label>
              <div className="relative">
                <select value={form.framework} onChange={(e) => set("framework", e.target.value)} className={selectClass()}>
                  {frameworks.map((f) => (
                    <option key={f} value={f}>{frameworkLabel(f)}</option>
                  ))}
                  {!frameworks.includes(form.framework) && (
                    <option value={form.framework}>{frameworkLabel(form.framework)}</option>
                  )}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Test Method</label>
              <div className="relative">
                <select value={form.method} onChange={(e) => set("method", e.target.value as TestMethod)} className={selectClass()}>
                  <option value="INQUIRY">Inquiry</option>
                  <option value="OBSERVATION">Observation</option>
                  <option value="INSPECTION">Inspection</option>
                  <option value="REPERFORMANCE">Reperformance</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Test Objective</label>
            <Textarea rows={2} value={form.testObjective} onChange={(e) => set("testObjective", e.target.value)}
              placeholder="What is this test intended to verify?" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Test Procedure</label>
            <Textarea rows={2} value={form.testProcedure} onChange={(e) => set("testProcedure", e.target.value)}
              placeholder="Steps performed to test the control." />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Sample Size</label>
              <Input type="number" min={0} value={form.sampleSize} onChange={(e) => set("sampleSize", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Samples Tested</label>
              <Input type="number" min={0} value={form.samplesTested} onChange={(e) => set("samplesTested", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Exceptions</label>
              <Input type="number" min={0} value={form.exceptions} onChange={(e) => set("exceptions", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Result</label>
              <div className="relative">
                <select value={form.result} onChange={(e) => set("result", e.target.value as TestResult)} className={selectClass()}>
                  <option value="NOT_TESTED">Not Tested</option>
                  <option value="EFFECTIVE">Effective</option>
                  <option value="PARTIALLY_EFFECTIVE">Partially Effective</option>
                  <option value="INEFFECTIVE">Ineffective</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tested At</label>
              <Input type="date" value={form.testedAt} onChange={(e) => set("testedAt", e.target.value)} />
            </div>
          </div>

          {showHint && (
            <p className="flex items-start gap-1.5 text-xs text-yellow-400 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
              <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              This test recorded {exceptionsCount} exception{exceptionsCount !== 1 ? "s" : ""} but is still marked
              Not Tested. Tests with exceptions typically land as Partially Effective or Ineffective —
              consider updating the result.
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tested By</label>
            <Input placeholder="e.g. Internal Audit — S. Rao" value={form.testedBy} onChange={(e) => set("testedBy", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Evidence</label>
            <Textarea rows={2} value={form.evidence} onChange={(e) => set("evidence", e.target.value)}
              placeholder="Artefacts reviewed — logs, screenshots, tickets, sign-offs." />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Conclusion</label>
            <Textarea rows={2} value={form.conclusion} onChange={(e) => set("conclusion", e.target.value)}
              placeholder="Overall conclusion and any follow-up required." />
          </div>

          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            {isEdit && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting || saving}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
              </Button>
            )}
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving || deleting}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : isEdit ? "Save Changes" : "Create Test"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const DEFAULT_FRAMEWORKS = ["ISO42001", "RBI_FREE_AI", "DPDP", "RBI_MRM"];

export default function ControlTestingPage() {
  const api = useApi();
  const [data, setData] = useState<ControlTestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState("");
  const [resultFilter, setResultFilter] = useState<TestResult | "">("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<ControlTest | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(frameworkFilter && { framework: frameworkFilter }),
        ...(resultFilter && { result: resultFilter }),
      });
      const res = await api.get<ControlTestResponse>(`/control-testing?${params}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [frameworkFilter, resultFilter]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  function openCreate() {
    setEditingTest(null);
    setModalOpen(true);
  }

  function openEdit(t: ControlTest) {
    setEditingTest(t);
    setModalOpen(true);
  }

  const stats = data?.stats ?? {
    total: 0, tested: 0, effective: 0, partiallyEffective: 0, ineffective: 0,
    notTested: 0, effectivenessRate: 0, byFramework: [],
  };

  const knownFrameworks = Array.from(
    new Set([...DEFAULT_FRAMEWORKS, ...stats.byFramework.map((b) => b.framework)])
  );

  const displayRows = (data?.rows ?? []).filter((r) =>
    search
      ? r.testRef.toLowerCase().includes(search.toLowerCase()) ||
        r.controlRef.toLowerCase().includes(search.toLowerCase()) ||
        r.controlTitle.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const columns: Column<ControlTest>[] = [
    {
      key: "testRef",
      header: "Test",
      cell: (row) => (
        <button className="text-left hover:text-primary transition-colors" onClick={() => openEdit(row)}>
          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded border border-border">{row.testRef}</code>
        </button>
      ),
    },
    {
      key: "controlRef",
      header: "Control",
      cell: (row) => (
        <div>
          <code className="text-xs font-mono text-muted-foreground">{row.controlRef}</code>
          <p className="text-sm">{row.controlTitle}</p>
        </div>
      ),
    },
    {
      key: "method",
      header: "Method",
      cell: (row) => <Badge variant="outline" className="text-xs">{METHOD_LABELS[row.method]}</Badge>,
    },
    {
      key: "samplesTested",
      header: "Coverage",
      cell: (row) => {
        const pct = row.sampleSize > 0 ? Math.min(100, Math.round((row.samplesTested / row.sampleSize) * 100)) : 0;
        return (
          <div className="w-24">
            <p className="text-xs tabular-nums text-muted-foreground mb-1">{row.samplesTested} / {row.sampleSize}</p>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: "exceptions",
      header: "Exceptions",
      cell: (row) => (
        <span className={`text-sm tabular-nums font-medium ${row.exceptions > 0 ? "text-red-400" : "text-muted-foreground"}`}>
          {row.exceptions}
        </span>
      ),
    },
    {
      key: "result",
      header: "Result",
      cell: (row) => <Badge variant={RESULT_BADGE[row.result]}>{RESULT_LABELS[row.result]}</Badge>,
    },
    {
      key: "testedBy",
      header: "Tested By",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.testedBy || "—"}</span>,
    },
    {
      key: "testedAt",
      header: "Tested Date",
      cell: (row) => (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" /> {fmtDate(row.testedAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
        <ClipboardList className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-primary">Control Testing &amp; Validation</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Independent assurance over the governance program — sampling controls across
            ISO/IEC 42001, RBI FREE-AI, DPDP, and internal model risk frameworks, testing
            operating effectiveness, and recording exceptions.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Tests Executed</p>
              <p className="text-2xl font-bold">{stats.tested}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Effective</p>
              <p className="text-2xl font-bold">{stats.effective}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-yellow-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Partially Effective</p>
              <p className="text-2xl font-bold">{stats.partiallyEffective}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertOctagon className="h-8 w-8 text-red-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Ineffective</p>
              <p className="text-2xl font-bold">{stats.ineffective}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Effectiveness headline */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Control Effectiveness Rate</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.effective} of {stats.tested} tested controls effective
            </p>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <p className="text-4xl font-bold tabular-nums">{stats.effectivenessRate}%</p>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${stats.effectivenessRate >= 80 ? "bg-green-500" : stats.effectivenessRate >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${stats.effectivenessRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Framework cards */}
      {stats.byFramework.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.byFramework.map((b) => {
            const tested = b.total - b.notTested;
            const rate = tested > 0 ? Math.round((b.effective / tested) * 100) : 0;
            return (
              <Card
                key={b.framework}
                onClick={() => setFrameworkFilter(frameworkFilter === b.framework ? "" : b.framework)}
                className={`cursor-pointer transition-colors ${frameworkFilter === b.framework ? "border-primary/40 bg-primary/5" : ""}`}
              >
                <CardContent className="p-4">
                  <p className="text-xs font-semibold">{frameworkLabel(b.framework)}</p>
                  <p className="text-xs text-muted-foreground mb-2">{b.total} test{b.total !== 1 ? "s" : ""}</p>
                  <div className="flex items-baseline gap-1 mb-1.5">
                    <p className="text-xl font-bold tabular-nums">{rate}%</p>
                    <p className="text-xs text-muted-foreground">effective</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${rate >= 80 ? "bg-green-500" : rate >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Control Tests
              <Badge variant="outline" className="text-xs ml-1">{displayRows.length} test{displayRows.length !== 1 ? "s" : ""}</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="h-4 w-4" /> New Test
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search test ref, control ref, title…"
                className="pl-8 h-8 text-xs w-56"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={frameworkFilter}
                onChange={(e) => setFrameworkFilter(e.target.value)}
                className="appearance-none bg-background border border-border rounded-md pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All frameworks</option>
                {knownFrameworks.map((f) => (
                  <option key={f} value={f}>{frameworkLabel(f)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value as TestResult | "")}
                className="appearance-none bg-background border border-border rounded-md px-3 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All results</option>
                <option value="EFFECTIVE">Effective</option>
                <option value="PARTIALLY_EFFECTIVE">Partially Effective</option>
                <option value="INEFFECTIVE">Ineffective</option>
                <option value="NOT_TESTED">Not Tested</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            {(search || frameworkFilter || resultFilter) && (
              <button
                onClick={() => { setSearch(""); setFrameworkFilter(""); setResultFilter(""); }}
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
              <ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                {stats.total > 0 ? "No tests match your filters." : "No control tests recorded yet."}
              </p>
              {stats.total === 0 && (
                <Button size="sm" onClick={openCreate} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Create First Test
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={displayRows}
              loading={loading}
              emptyMessage="No control tests recorded yet."
            />
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {modalOpen && (
        <TestModal
          test={editingTest}
          frameworks={knownFrameworks}
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setModalOpen(false); fetchRows(); }}
          onDeleted={() => { setModalOpen(false); fetchRows(); }}
        />
      )}
    </div>
  );
}
