"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Scale, CheckCircle2, XCircle, AlertCircle, Circle, ExternalLink,
  ChevronRight, X, Loader2, Plus, Save, Pencil,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useUIStore } from "@/store/ui.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// ── Types ─────────────────────────────────────────────────────────────────────

type ControlStatus = "PASS" | "FAIL" | "PARTIAL" | "PENDING_REVIEW" | "NOT_APPLICABLE" | "UNKNOWN";

interface ComplianceControl {
  id: string;
  controlId: string;
  controlName: string;
  framework: string;
  status: ControlStatus;
  evidence?: string;
  notes?: string;
  modelId: string;
  model?: { id: string; name: string; type: string };
}

interface ModelOption {
  id: string;
  name: string;
  type: string;
}

interface MappingRow {
  area: string;
  iso42001: { clause: string; title: string };
  dpdp?: { section: string; title: string };
  euAiAct?: { article: string; title: string };
  iso42005?: { clause: string; title: string };
  controlIds: string[];
  riskTier: "HIGH" | "MEDIUM" | "LOW";
}

// ── Control metadata (name + framework for each controlId) ────────────────────

const CONTROL_META: Record<string, { name: string; framework: string }> = {
  "DPDP-6.1":      { name: "Consent Management",            framework: "DPDP" },
  "DPDP-7.2":      { name: "Data Minimisation",             framework: "DPDP" },
  "DPDP-8.1":      { name: "Data Subject Rights",           framework: "DPDP" },
  "DPDP-9.1":      { name: "Data Localisation",             framework: "DPDP" },
  "ISO42001-5.2":  { name: "AI Policy Statement",           framework: "ISO42001" },
  "ISO42001-6.1":  { name: "AI Risk Assessment Process",    framework: "ISO42001" },
  "ISO42001-7.1":  { name: "Human Oversight of AI",         framework: "ISO42001" },
  "ISO42001-8.2":  { name: "Bias Testing & Fairness",       framework: "ISO42001" },
  "ISO42001-9.1":  { name: "AI Performance Monitoring",     framework: "ISO42001" },
  "ISO42001-10.1": { name: "Incident Response for AI",      framework: "ISO42001" },
  "EUAIA-9.1":     { name: "High-Risk AI Documentation",    framework: "EU_AI_ACT" },
  "EUAIA-13.1":    { name: "Transparency & Explainability", framework: "EU_AI_ACT" },
  "RBI-ML-3.1":    { name: "Model Validation & Testing",    framework: "RBI" },
  "RBI-ML-4.2":    { name: "Credit Decision Explainability",framework: "RBI" },
  "RBI-ML-5.1":    { name: "Algorithmic Accountability",    framework: "RBI" },
  "RBI-ML-6.1":    { name: "Consumer Protection Safeguards",framework: "RBI" },
};

// ── Static mapping matrix ─────────────────────────────────────────────────────

const MAPPING: MappingRow[] = [
  {
    area: "AI System Inventory & Classification",
    iso42001: { clause: "6.1.2", title: "AI risk identification" },
    dpdp: { section: "Sec 4", title: "Lawful processing of personal data" },
    euAiAct: { article: "Art 6–7", title: "Classification of high-risk AI systems" },
    controlIds: ["ISO42001-6.1", "ISO42001-5.2"],
    riskTier: "HIGH",
  },
  {
    area: "Risk Assessment & Management",
    iso42001: { clause: "6.1.3", title: "AI risk treatment" },
    dpdp: { section: "Sec 8", title: "Obligations of data fiduciary" },
    euAiAct: { article: "Art 9", title: "Risk management system" },
    iso42005: { clause: "Sec. 5.3", title: "Description of AI system" },
    controlIds: ["ISO42001-6.1", "EUAIA-9.1"],
    riskTier: "HIGH",
  },
  {
    area: "Data Governance & Privacy",
    iso42001: { clause: "8.4", title: "Data for AI systems" },
    dpdp: { section: "Sec 8–9", title: "Data quality & purpose limitation" },
    euAiAct: { article: "Art 10", title: "Data and data governance" },
    controlIds: ["DPDP-7.2", "DPDP-9.1"],
    riskTier: "HIGH",
  },
  {
    area: "Transparency & Explainability",
    iso42001: { clause: "8.6", title: "System behaviour — transparency" },
    dpdp: { section: "Sec 11", title: "Right to information" },
    euAiAct: { article: "Art 13", title: "Transparency and provision of information" },
    iso42005: { clause: "Sec. 5.8.d", title: "Transparency dimension" },
    controlIds: ["EUAIA-13.1", "RBI-ML-4.2"],
    riskTier: "HIGH",
  },
  {
    area: "Human Oversight",
    iso42001: { clause: "8.5", title: "AI system life cycle" },
    euAiAct: { article: "Art 14", title: "Human oversight" },
    iso42005: { clause: "Sec. 5.8.h", title: "Human agency dimension" },
    controlIds: ["ISO42001-7.1"],
    riskTier: "HIGH",
  },
  {
    area: "Accuracy, Reliability & Robustness",
    iso42001: { clause: "8.7", title: "Documented information for AI systems" },
    euAiAct: { article: "Art 15", title: "Accuracy, robustness and cybersecurity" },
    iso42005: { clause: "Sec. 5.8.e", title: "Reliability dimension" },
    controlIds: ["ISO42001-9.1", "RBI-ML-3.1"],
    riskTier: "MEDIUM",
  },
  {
    area: "Bias & Fairness",
    iso42001: { clause: "6.1.4", title: "AI impact assessment" },
    dpdp: { section: "Sec 5", title: "Notice and consent" },
    euAiAct: { article: "Art 10.3", title: "Training data bias requirements" },
    iso42005: { clause: "Sec. 5.8.c", title: "Fairness dimension" },
    controlIds: ["ISO42001-8.2"],
    riskTier: "HIGH",
  },
  {
    area: "Data Subject Rights",
    iso42001: { clause: "8.4.3", title: "Data quality for AI" },
    dpdp: { section: "Sec 12–13", title: "Rights of data principal" },
    euAiAct: { article: "Art 13.2", title: "Right to explanation" },
    controlIds: ["DPDP-8.1"],
    riskTier: "HIGH",
  },
  {
    area: "Incident Reporting & Monitoring",
    iso42001: { clause: "9.1", title: "Monitoring & measurement" },
    euAiAct: { article: "Art 26", title: "Post-market monitoring" },
    iso42005: { clause: "Sec. 5.8.f", title: "Safety dimension" },
    controlIds: ["ISO42001-9.1", "ISO42001-10.1"],
    riskTier: "MEDIUM",
  },
  {
    area: "AI System Documentation",
    iso42001: { clause: "7.5", title: "Documented information" },
    euAiAct: { article: "Art 11", title: "Technical documentation" },
    controlIds: ["ISO42001-5.2", "EUAIA-9.1"],
    riskTier: "LOW",
  },
  {
    area: "Supplier & Third-Party AI",
    iso42001: { clause: "8.4.1", title: "Third-party AI systems" },
    dpdp: { section: "Sec 8.3", title: "Processor obligations" },
    euAiAct: { article: "Art 25", title: "Obligations of providers placing AI systems" },
    controlIds: ["DPDP-9.1", "RBI-ML-5.1"],
    riskTier: "MEDIUM",
  },
  {
    area: "Consent & Lawful Basis",
    iso42001: { clause: "8.4.2", title: "Personal data in AI" },
    dpdp: { section: "Sec 6–7", title: "Consent and deemed consent" },
    euAiAct: { article: "Art 10.5", title: "Data minimisation" },
    controlIds: ["DPDP-6.1", "DPDP-7.2"],
    riskTier: "HIGH",
  },
  {
    area: "Conformity Assessment & Audit",
    iso42001: { clause: "9.2", title: "Internal audit" },
    euAiAct: { article: "Art 43", title: "Conformity assessment" },
    controlIds: ["ISO42001-9.1", "RBI-ML-5.1"],
    riskTier: "MEDIUM",
  },
  {
    area: "Foreseeable Misuse Prevention",
    iso42001: { clause: "6.1.2.b", title: "Unintended use scenarios" },
    euAiAct: { article: "Art 9.2.b", title: "Reasonably foreseeable misuse" },
    iso42005: { clause: "Sec. 5.3.5", title: "Foreseeable misuse scenarios" },
    controlIds: ["ISO42001-6.1", "ISO42001-10.1"],
    riskTier: "HIGH",
  },
];

// ── Shared helpers ────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ControlStatus | "UNKNOWN" }) {
  if (status === "PASS")           return <CheckCircle2 className="h-4 w-4 text-green-400" />;
  if (status === "FAIL")           return <XCircle className="h-4 w-4 text-red-400" />;
  if (status === "PARTIAL")        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
  if (status === "PENDING_REVIEW") return <AlertCircle className="h-4 w-4 text-blue-400" />;
  return <Circle className="h-4 w-4 text-muted-foreground/40" />;
}

function StatusBadge({ status }: { status: ControlStatus | "UNKNOWN" }) {
  const cls: Record<string, string> = {
    PASS:           "bg-green-500/15 text-green-400 border-green-500/30",
    FAIL:           "bg-red-500/15 text-red-400 border-red-500/30",
    PARTIAL:        "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    PENDING_REVIEW: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    NOT_APPLICABLE: "bg-muted text-muted-foreground border-border",
    UNKNOWN:        "bg-muted/40 text-muted-foreground border-border",
  };
  const label: Record<string, string> = {
    PASS: "Pass", FAIL: "Fail", PARTIAL: "Partial",
    PENDING_REVIEW: "Pending Review", NOT_APPLICABLE: "N/A", UNKNOWN: "—",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium whitespace-nowrap ${cls[status] ?? cls.UNKNOWN}`}>
      <StatusIcon status={status} />
      {label[status] ?? status}
    </span>
  );
}

function RiskTierBadge({ tier }: { tier: "HIGH" | "MEDIUM" | "LOW" }) {
  const cls = {
    HIGH:   "text-red-400 bg-red-500/10 border-red-500/20",
    MEDIUM: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    LOW:    "text-green-400 bg-green-500/10 border-green-500/20",
  };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cls[tier]}`}>{tier}</span>;
}

function CoveragePill({ label, covered, total, color }: {
  label: string; covered: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{covered}/{total}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] text-muted-foreground">{pct}% coverage</span>
    </div>
  );
}

// ── Update Control Drawer ─────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ControlStatus; label: string }[] = [
  { value: "PASS",           label: "✅  Pass — fully compliant" },
  { value: "PARTIAL",        label: "⚠️  Partial — in progress" },
  { value: "FAIL",           label: "❌  Fail — gap identified" },
  { value: "PENDING_REVIEW", label: "🔵  Pending Review" },
  { value: "NOT_APPLICABLE", label: "—   Not Applicable" },
];

interface UpdateDrawerProps {
  row: MappingRow;
  allControls: ComplianceControl[];
  models: ModelOption[];
  onClose: () => void;
  onSaved: () => void;
}

function UpdateDrawer({ row, allControls, models, onClose, onSaved }: UpdateDrawerProps) {
  const api = useApi();
  const { addNotification } = useUIStore();

  // Controls already in DB for this row
  const matched = allControls.filter((c) => row.controlIds.includes(c.controlId));

  // Per-control edit state (keyed by DB `id`)
  const [edits, setEdits] = useState<Record<string, {
    status: ControlStatus; notes: string; evidence: string; saving: boolean; saved: boolean;
  }>>(() =>
    Object.fromEntries(
      matched.map((c) => [c.id, {
        status: c.status,
        notes: c.notes ?? "",
        evidence: c.evidence ?? "",
        saving: false,
        saved: false,
      }])
    )
  );

  // "Add new assessment" form
  const [showAdd, setShowAdd] = useState(matched.length === 0);
  const [newForm, setNewForm] = useState({
    modelId: models[0]?.id ?? "",
    controlId: row.controlIds[0] ?? "",
    status: "" as ControlStatus | "",
    notes: "",
    evidence: "",
  });
  const [adding, setAdding] = useState(false);

  function setEdit(id: string, patch: Partial<typeof edits[string]>) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function saveControl(ctrl: ComplianceControl) {
    const e = edits[ctrl.id];
    if (!e) return;
    const meta = CONTROL_META[ctrl.controlId];
    setEdit(ctrl.id, { saving: true, saved: false });
    try {
      await api.post("/compliance", {
        modelId: ctrl.modelId,
        framework: meta?.framework ?? ctrl.framework,
        controlId: ctrl.controlId,
        controlName: meta?.name ?? ctrl.controlName,
        status: e.status,
        notes: e.notes || undefined,
        evidence: e.evidence || undefined,
      });
      setEdit(ctrl.id, { saving: false, saved: true });
      addNotification({ type: "success", title: "Control updated", message: `${ctrl.controlId} → ${e.status}` });
      onSaved();
    } catch {
      setEdit(ctrl.id, { saving: false });
    }
  }

  async function addNewControl() {
    if (!newForm.modelId || !newForm.controlId || !newForm.status) return;
    const meta = CONTROL_META[newForm.controlId];
    setAdding(true);
    try {
      await api.post("/compliance", {
        modelId: newForm.modelId,
        framework: meta?.framework ?? "ISO42001",
        controlId: newForm.controlId,
        controlName: meta?.name ?? newForm.controlId,
        status: newForm.status,
        notes: newForm.notes || undefined,
        evidence: newForm.evidence || undefined,
      });
      addNotification({ type: "success", title: "Assessment recorded", message: `${newForm.controlId} added` });
      setShowAdd(false);
      setNewForm({ modelId: models[0]?.id ?? "", controlId: row.controlIds[0] ?? "", status: "", notes: "", evidence: "" });
      onSaved();
    } catch {
      // error shown by useApi
    } finally {
      setAdding(false);
    }
  }

  const frameworkColor: Record<string, string> = {
    ISO42001: "text-blue-400", DPDP: "text-teal-400", EU_AI_ACT: "text-purple-400", RBI: "text-orange-400",
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-xl bg-card border-l border-border h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border z-10 p-5 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <RiskTierBadge tier={row.riskTier} />
                <span className="text-[10px] text-muted-foreground">Risk Area</span>
              </div>
              <h2 className="font-semibold text-base leading-tight">{row.area}</h2>
              <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-muted-foreground">
                <span className="font-mono text-blue-400">ISO 42001 §{row.iso42001.clause}</span>
                {row.dpdp    && <span className="font-mono text-teal-400">{row.dpdp.section}</span>}
                {row.euAiAct && <span className="font-mono text-purple-400">{row.euAiAct.article}</span>}
                {row.iso42005 && <span className="font-mono text-cyan-400">{row.iso42005.clause}</span>}
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6 flex-1">

          {/* Existing control assessments */}
          {matched.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Existing Assessments ({matched.length})
              </h3>

              {matched.map((ctrl) => {
                const e = edits[ctrl.id];
                const meta = CONTROL_META[ctrl.controlId];
                const fwColor = frameworkColor[meta?.framework ?? "ISO42001"] ?? "text-muted-foreground";
                if (!e) return null;
                return (
                  <div key={ctrl.id} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    {/* Control header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-xs font-mono font-semibold ${fwColor}`}>{ctrl.controlId}</p>
                        <p className="text-sm font-medium mt-0.5">{meta?.name ?? ctrl.controlName}</p>
                        {ctrl.model && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            📦 {ctrl.model.name}
                            <span className="ml-1 opacity-60">({ctrl.model.type})</span>
                          </p>
                        )}
                      </div>
                      <StatusBadge status={ctrl.status} />
                    </div>

                    {/* Status picker */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Update Status</Label>
                      <select
                        value={e.status}
                        onChange={(ev) => setEdit(ctrl.id, { status: ev.target.value as ControlStatus, saved: false })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Evidence */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Evidence / Actions Taken</Label>
                      <textarea
                        rows={2}
                        value={e.evidence}
                        onChange={(ev) => setEdit(ctrl.id, { evidence: ev.target.value, saved: false })}
                        placeholder="e.g. Incident response playbook v1.0 approved by CISO on 25-Apr-2026"
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Internal Notes</Label>
                      <textarea
                        rows={2}
                        value={e.notes}
                        onChange={(ev) => setEdit(ctrl.id, { notes: ev.target.value, saved: false })}
                        placeholder="Optional — reviewer notes, remediation owner, next steps..."
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>

                    {/* Save */}
                    <div className="flex items-center justify-between pt-1">
                      {e.saved && (
                        <span className="text-xs text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                        </span>
                      )}
                      <div className="ml-auto">
                        <Button
                          size="sm"
                          onClick={() => saveControl(ctrl)}
                          disabled={e.saving || e.saved}
                        >
                          {e.saving ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving…</>
                          ) : (
                            <><Save className="h-3.5 w-3.5 mr-1.5" /> Save Changes</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Divider */}
          {matched.length > 0 && (
            <div className="border-t border-border" />
          )}

          {/* Add new assessment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {matched.length === 0 ? "Record First Assessment" : "Add Assessment for Another Model"}
              </h3>
              {matched.length > 0 && !showAdd && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              )}
            </div>

            {showAdd && (
              <div className="rounded-xl border border-border border-dashed bg-muted/10 p-4 space-y-3">

                {/* Model picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs">AI Model *</Label>
                  {models.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No models in registry</p>
                  ) : (
                    <select
                      value={newForm.modelId}
                      onChange={(e) => setNewForm((p) => ({ ...p, modelId: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Control picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Control *</Label>
                  <select
                    value={newForm.controlId}
                    onChange={(e) => setNewForm((p) => ({ ...p, controlId: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {row.controlIds.map((cid) => {
                      const meta = CONTROL_META[cid];
                      return (
                        <option key={cid} value={cid}>
                          {cid} — {meta?.name ?? cid}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Status picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Compliance Status *</Label>
                  <select
                    value={newForm.status}
                    onChange={(e) => setNewForm((p) => ({ ...p, status: e.target.value as ControlStatus }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">— Select status —</option>
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Evidence */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Evidence / Actions Taken</Label>
                  <textarea
                    rows={2}
                    value={newForm.evidence}
                    onChange={(e) => setNewForm((p) => ({ ...p, evidence: e.target.value }))}
                    placeholder="Describe what was done to achieve this status..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Internal Notes</Label>
                  <textarea
                    rows={2}
                    value={newForm.notes}
                    onChange={(e) => setNewForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Remediation owner, next review date..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  {matched.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
                  )}
                  <Button
                    size="sm"
                    onClick={addNewControl}
                    disabled={adding || !newForm.modelId || !newForm.controlId || !newForm.status}
                    className="flex-1"
                  >
                    {adding ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Recording…</>
                    ) : (
                      <><Plus className="h-3.5 w-3.5 mr-1.5" /> Record Assessment</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Help text */}
          <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">What changes the status?</p>
            <p>Update status to <span className="text-green-400 font-medium">PASS</span> once you have documented evidence of compliance — upload the evidence file on the AI Inventory → model page.</p>
            <p>Use <span className="text-yellow-400 font-medium">Partial</span> while remediation is in progress. <span className="text-red-400 font-medium">Fail</span> means the gap is identified but not yet addressed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ComplianceMapPage() {
  const api = useApi();
  const [controls, setControls] = useState<ComplianceControl[]>([]);
  const [models, setModels]     = useState<ModelOption[]>([]);
  const [filter, setFilter]     = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [loading, setLoading]   = useState(true);
  const [selectedRow, setSelectedRow] = useState<MappingRow | null>(null);

  const fetchControls = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      api.get<{ controls: ComplianceControl[] }>("/compliance?framework=DPDP"),
      api.get<{ controls: ComplianceControl[] }>("/compliance?framework=ISO42001"),
      api.get<{ controls: ComplianceControl[] }>("/compliance?framework=EU_AI_ACT"),
      api.get<{ controls: ComplianceControl[] }>("/compliance?framework=RBI"),
    ]);
    setControls([
      ...(a.controls ?? []),
      ...(b.controls ?? []),
      ...(c.controls ?? []),
      ...(d.controls ?? []),
    ]);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchControls(),
      api.get<{ models: ModelOption[] }>("/models?limit=100").then((d) => setModels(d.models ?? [])),
    ]).finally(() => setLoading(false));
  }, []);

  const filteredRows = MAPPING.filter((r) => filter === "ALL" || r.riskTier === filter);

  const highRows = MAPPING.filter((r) => r.riskTier === "HIGH").length;
  const medRows  = MAPPING.filter((r) => r.riskTier === "MEDIUM").length;
  const lowRows  = MAPPING.filter((r) => r.riskTier === "LOW").length;

  const rowStatus = (row: MappingRow): ControlStatus | "UNKNOWN" => {
    if (controls.length === 0) return "UNKNOWN";
    const matching = controls.filter((c) => row.controlIds.includes(c.controlId));
    if (matching.length === 0) return "UNKNOWN";
    if (matching.some((c) => c.status === "FAIL")) return "FAIL";
    if (matching.every((c) => c.status === "PASS")) return "PASS";
    if (matching.some((c) => c.status === "PENDING_REVIEW")) return "PENDING_REVIEW";
    return "PARTIAL";
  };

  const byStatus = MAPPING.reduce((acc, row) => {
    const s = rowStatus(row);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Cross-Regulation Compliance Map
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          ISO 42001 · DPDP Act 2023 · EU AI Act 2024 · ISO 42005 — click any row to update status
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Framework Coverage</p>
            <CoveragePill label="ISO 42001"      covered={controls.filter((c) => c.controlId.startsWith("ISO42001") && c.status === "PASS").length} total={controls.filter((c) => c.controlId.startsWith("ISO42001")).length} color="#3b82f6" />
            <CoveragePill label="DPDP Act"       covered={controls.filter((c) => c.controlId.startsWith("DPDP") && c.status === "PASS").length}     total={controls.filter((c) => c.controlId.startsWith("DPDP")).length}     color="#10b981" />
            <CoveragePill label="All Frameworks" covered={controls.filter((c) => c.status === "PASS").length} total={controls.length} color="#8b5cf6" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Areas by Status</p>
            <div className="space-y-2">
              {([
                ["PASS",    "text-green-400",  "Pass"],
                ["PARTIAL", "text-yellow-400", "Partial"],
                ["FAIL",    "text-red-400",    "Fail"],
                ["UNKNOWN", "text-muted-foreground", "Not assessed"],
              ] as [string, string, string][]).map(([s, color, lbl]) => (
                <div key={s} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{lbl}</span>
                  <span className={`font-bold ${color}`}>{byStatus[s] ?? 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Areas by Risk Tier</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs"><span className="text-red-400 font-medium">High Risk</span><span className="font-bold">{highRows}</span></div>
              <div className="flex justify-between text-xs"><span className="text-yellow-400 font-medium">Medium Risk</span><span className="font-bold">{medRows}</span></div>
              <div className="flex justify-between text-xs"><span className="text-green-400 font-medium">Low Risk</span><span className="font-bold">{lowRows}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "ALL" ? `All Areas (${MAPPING.length})` : `${f} (${MAPPING.filter((r) => r.riskTier === f).length})`}
          </button>
        ))}
      </div>

      {/* Matrix table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Requirement Cross-Reference Matrix
            <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
              <Pencil className="h-3 w-3" /> Click any row to update status
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider min-w-[180px]">Governance Area</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider min-w-[140px]">ISO 42001</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider min-w-[140px]">DPDP Act 2023</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider min-w-[140px]">EU AI Act 2024</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider min-w-[140px]">ISO 42005</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Risk</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, i) => {
                    const status = rowStatus(row);
                    const isSelected = selectedRow?.area === row.area;
                    return (
                      <tr
                        key={row.area}
                        onClick={() => setSelectedRow(row)}
                        className={`border-b border-border/50 cursor-pointer transition-colors group
                          ${i % 2 === 0 ? "" : "bg-muted/20"}
                          ${isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "hover:bg-muted/40"}
                        `}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-foreground">{row.area}</p>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-blue-400">{row.iso42001.clause}</p>
                          <p className="text-muted-foreground mt-0.5 text-[11px]">{row.iso42001.title}</p>
                        </td>
                        <td className="px-4 py-3">
                          {row.dpdp ? (
                            <>
                              <p className="font-mono text-teal-400">{row.dpdp.section}</p>
                              <p className="text-muted-foreground mt-0.5 text-[11px]">{row.dpdp.title}</p>
                            </>
                          ) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {row.euAiAct ? (
                            <>
                              <p className="font-mono text-purple-400">{row.euAiAct.article}</p>
                              <p className="text-muted-foreground mt-0.5 text-[11px]">{row.euAiAct.title}</p>
                            </>
                          ) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {row.iso42005 ? (
                            <>
                              <p className="font-mono text-cyan-400">{row.iso42005.clause}</p>
                              <p className="text-muted-foreground mt-0.5 text-[11px]">{row.iso42005.title}</p>
                            </>
                          ) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <RiskTierBadge tier={row.riskTier} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Regulatory notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "ISO 42001:2023", color: "text-primary", desc: "International standard for AI Management Systems (AIMS). Covers risk, lifecycle, data quality, transparency and organisational controls.", link: "https://www.iso.org/standard/81230.html" },
          { label: "DPDP Act 2023 (India)", color: "text-teal-400", desc: "India's Digital Personal Data Protection Act. Applies to AI systems that process personal data of Indian citizens. Enforced by Data Protection Board.", link: "https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf" },
          { label: "EU AI Act 2024", color: "text-purple-400", desc: "EU Regulation on Artificial Intelligence. Risk-based classification (minimal, limited, high-risk, prohibited). Applies to AI placed on EU market.", link: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689" },
        ].map((r) => (
          <Card key={r.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-semibold ${r.color}`}>{r.label}</p>
                <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Update drawer */}
      {selectedRow && (
        <UpdateDrawer
          row={selectedRow}
          allControls={controls}
          models={models}
          onClose={() => setSelectedRow(null)}
          onSaved={() => fetchControls()}
        />
      )}
    </div>
  );
}
