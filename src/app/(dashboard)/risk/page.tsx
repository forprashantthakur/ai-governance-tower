"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, CheckSquare, ChevronDown, ChevronUp, Paperclip, AlertTriangle, Grid3x3 } from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
} from "recharts";
import { useApi } from "@/hooks/use-api";
import { RiskBadge, ComplianceBadge } from "@/components/shared/risk-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { AssessModelModal } from "@/components/risk/assess-model-modal";
import { EvidenceUpload } from "@/components/shared/evidence-upload";
import type { ComplianceControl, RiskLevel, ComplianceStatus } from "@/types";
import { formatDateShort } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ComplianceResponse {
  controls: ComplianceControl[];
  summary: Record<string, number>;
  total: number;
}

interface RiskModel {
  overallScore: number;
  riskLevel: RiskLevel;
  dataSensitivityScore: number;
  modelComplexityScore: number;
  explainabilityScore: number;
  humanOversightScore: number;
  regulatoryExposureScore: number;
  model: { id: string; name: string; type: string; status: string };
}

interface MisuseScenario {
  id: string;
  modelId: string;
  title: string;
  description: string;
  likelihood: number;
  severity: number;
  harmCategory: string;
  affectedGroups: string[];
  mitigations?: string;
  isAddressed: boolean;
  model?: { id: string; name: string };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

const FRAMEWORKS = ["DPDP", "ISO42001", "ISO42005", "GDPR", "SOC2"];

const HARM_LABELS: Record<string, string> = {
  DISCRIMINATION: "Discrimination",
  PRIVACY_VIOLATION: "Privacy Violation",
  FINANCIAL_HARM: "Financial Harm",
  PHYSICAL_HARM: "Physical Harm",
  REPUTATIONAL_HARM: "Reputational Harm",
  AUTONOMY_VIOLATION: "Autonomy Violation",
  SOCIETAL_HARM: "Societal Harm",
  SECURITY_HARM: "Security Harm",
  OTHER: "Other",
};

// ── Risk Matrix helpers ───────────────────────────────────────────────────────

function riskScore(severity: number, likelihood: number) {
  return severity * likelihood;
}

function matrixZoneColor(severity: number, likelihood: number): string {
  const score = riskScore(severity, likelihood);
  if (score >= 15) return "bg-red-900/40 border-red-700/40";
  if (score >= 9)  return "bg-orange-900/40 border-orange-700/40";
  if (score >= 5)  return "bg-yellow-900/40 border-yellow-700/40";
  return "bg-green-900/30 border-green-700/30";
}

function matrixZoneLabel(severity: number, likelihood: number): { label: string; color: string } {
  const score = riskScore(severity, likelihood);
  if (score >= 15) return { label: "CRITICAL", color: "text-red-400" };
  if (score >= 9)  return { label: "HIGH",     color: "text-orange-400" };
  if (score >= 5)  return { label: "MEDIUM",   color: "text-yellow-400" };
  return { label: "LOW", color: "text-green-400" };
}

// ── 5×5 Risk Matrix Component ─────────────────────────────────────────────────

function RiskMatrix({ scenarios }: { scenarios: MisuseScenario[] }) {
  const [selected, setSelected] = useState<MisuseScenario[] | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ s: number; l: number } | null>(null);

  const scenariosAt = (s: number, l: number) =>
    scenarios.filter((sc) => sc.severity === s && sc.likelihood === l);

  const handleCell = (s: number, l: number) => {
    const list = scenariosAt(s, l);
    if (list.length === 0) return;
    setSelectedCell({ s, l });
    setSelected(list);
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-700/60 inline-block" /> Low (1–4)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-700/60 inline-block" /> Medium (5–8)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-700/60 inline-block" /> High (9–14)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-700/60 inline-block" /> Critical (15–25)</span>
      </div>

      {/* Matrix grid */}
      <div className="flex gap-2">
        {/* Y-axis label */}
        <div className="flex flex-col items-center justify-center w-7 shrink-0">
          <span className="text-[10px] text-muted-foreground rotate-[-90deg] whitespace-nowrap tracking-wider uppercase">Likelihood →</span>
        </div>

        <div className="flex-1 space-y-1">
          {/* Y-axis: likelihood 5 (top) to 1 (bottom) */}
          {[5, 4, 3, 2, 1].map((likelihood) => (
            <div key={likelihood} className="flex gap-1 items-center">
              <span className="w-4 text-[10px] text-muted-foreground text-right shrink-0">{likelihood}</span>
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4, 5].map((severity) => {
                  const items = scenariosAt(severity, likelihood);
                  const zone = matrixZoneColor(severity, likelihood);
                  const isSelected = selectedCell?.s === severity && selectedCell?.l === likelihood;
                  return (
                    <button
                      key={severity}
                      onClick={() => handleCell(severity, likelihood)}
                      className={`flex-1 aspect-square min-h-[52px] rounded border flex flex-col items-center justify-center transition-all
                        ${zone}
                        ${items.length > 0 ? "cursor-pointer hover:brightness-125 hover:scale-105" : "cursor-default"}
                        ${isSelected ? "ring-2 ring-primary" : ""}
                      `}
                    >
                      {items.length > 0 && (
                        <>
                          <span className="text-sm font-bold">{items.length}</span>
                          <span className="text-[9px] text-muted-foreground">scenario{items.length > 1 ? "s" : ""}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* X-axis labels */}
          <div className="flex gap-1 items-center">
            <span className="w-4 shrink-0" />
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex-1 text-center text-[10px] text-muted-foreground">{s}</div>
            ))}
          </div>
          <div className="text-center text-[10px] text-muted-foreground tracking-wider uppercase mt-1">
            Severity →
          </div>
        </div>
      </div>

      {/* Selected cell detail */}
      {selected && selectedCell && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">
                Severity {selectedCell.s} × Likelihood {selectedCell.l}
                {" "}
                <span className={`text-xs font-mono ml-2 ${matrixZoneLabel(selectedCell.s, selectedCell.l).color}`}>
                  {matrixZoneLabel(selectedCell.s, selectedCell.l).label}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{selected.length} scenario{selected.length > 1 ? "s" : ""} in this cell</p>
            </div>
            <button onClick={() => { setSelected(null); setSelectedCell(null); }}
              className="text-xs text-muted-foreground hover:text-foreground">✕ Close</button>
          </div>
          <div className="space-y-2">
            {selected.map((sc) => (
              <div key={sc.id} className="bg-background border border-border rounded p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{sc.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${sc.isAddressed ? "border-green-500/40 text-green-400 bg-green-500/10" : "border-orange-500/40 text-orange-400 bg-orange-500/10"}`}>
                    {sc.isAddressed ? "Addressed" : "Open"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{sc.description}</p>
                {sc.model && (
                  <p className="text-xs text-muted-foreground">
                    Model: <span className="text-foreground">{sc.model.name}</span>
                  </p>
                )}
                <p className="text-xs">
                  <span className="text-muted-foreground">Category: </span>
                  <span className="font-medium">{HARM_LABELS[sc.harmCategory] ?? sc.harmCategory}</span>
                </p>
                {sc.mitigations && (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">Mitigation: </span>{sc.mitigations}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {scenarios.length === 0 && (
        <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
          No misuse scenarios registered yet. Add scenarios in ISO 42005 assessments.
        </div>
      )}
    </div>
  );
}

// ── Risk Radar Chart ──────────────────────────────────────────────────────────

function RiskRadar({ model }: { model: RiskModel }) {
  const data = [
    { subject: "Data Sensitivity", value: model.dataSensitivityScore },
    { subject: "Model Complexity", value: model.modelComplexityScore },
    { subject: "Explainability",   value: 100 - model.explainabilityScore }, // invert — low explainability = high risk
    { subject: "Human Oversight",  value: 100 - model.humanOversightScore },
    { subject: "Regulatory",       value: model.regulatoryExposureScore },
  ];
  return (
    <ResponsiveContainer width="100%" height={180}>
      <RadarChart data={data}>
        <PolarGrid stroke="#1e293b" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 10 }} />
        <Radar name="Risk" dataKey="value" stroke={RISK_COLORS[model.riskLevel]} fill={RISK_COLORS[model.riskLevel]} fillOpacity={0.25} />
        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RiskPage() {
  const api = useApi();
  const [compliance, setCompliance] = useState<ComplianceResponse | null>(null);
  const [riskModels, setRiskModels] = useState<RiskModel[]>([]);
  const [misuseScenarios, setMisuseScenarios] = useState<MisuseScenario[]>([]);
  const [framework, setFramework] = useState("DPDP");
  const [loading, setLoading] = useState(true);
  const [showAssessModal, setShowAssessModal] = useState(false);
  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const [selectedRadarModel, setSelectedRadarModel] = useState<RiskModel | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<ComplianceResponse>(`/compliance?framework=${framework}`),
      api.get<{ models: (RiskModel["model"] & { riskAssessments: Omit<RiskModel, "model">[] })[] }>("/models?limit=100").then((r) =>
        r.models.flatMap((m) =>
          m.riskAssessments.slice(0, 1).map((ra) => ({
            ...ra,
            model: { id: m.id, name: m.name, type: m.type, status: m.status },
          }))
        )
      ),
      api.get<MisuseScenario[]>("/misuse-scenarios").catch(() => []),
    ])
      .then(([c, rm, ms]) => {
        setCompliance(c);
        const models = rm as RiskModel[];
        setRiskModels(models);
        setSelectedRadarModel(models.find((m) => m.riskLevel === "CRITICAL" || m.riskLevel === "HIGH") ?? models[0] ?? null);
        setMisuseScenarios(Array.isArray(ms) ? ms : []);
      })
      .finally(() => setLoading(false));
  }, [framework]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const complianceColumns: Column<ComplianceControl>[] = [
    {
      key: "controlId",
      header: "Control ID",
      cell: (row) => (
        <button
          className="font-mono text-xs text-primary hover:underline"
          onClick={() => setExpandedControl(expandedControl === row.id ? null : row.id)}
        >
          {row.controlId}
        </button>
      ),
    },
    {
      key: "controlName",
      header: "Control Name",
      cell: (row) => (
        <div>
          <button
            className="text-sm font-medium hover:text-primary text-left"
            onClick={() => setExpandedControl(expandedControl === row.id ? null : row.id)}
          >
            {row.controlName}
          </button>
          {row.description && (
            <p className="text-xs text-muted-foreground truncate max-w-xs">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "model",
      header: "Model",
      cell: (row) => <span className="text-sm">{row.model?.name ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <ComplianceBadge status={row.status as ComplianceStatus} />,
    },
    {
      key: "reviewedAt",
      header: "Last Review",
      cell: (row) =>
        row.reviewedAt ? (
          <span className="text-xs text-muted-foreground">{formatDateShort(row.reviewedAt)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Pending</span>
        ),
    },
    {
      key: "id",
      header: "Evidence",
      cell: (row) => (
        <button
          onClick={() => setExpandedControl(expandedControl === row.id ? null : row.id)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          title="Expand to upload evidence files"
        >
          <Paperclip className="h-3 w-3" />
          {expandedControl === row.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      ),
    },
  ];

  // Misuse scenario summary
  const openScenarios = misuseScenarios.filter((s) => !s.isAddressed).length;
  const criticalScenarios = misuseScenarios.filter((s) => s.severity * s.likelihood >= 15).length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {["PASS", "FAIL", "PARTIAL", "PENDING_REVIEW"].map((status) => (
          <Card key={status}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">
                {status.replace("_", " ")}
              </p>
              <p className="text-2xl font-bold">
                {compliance?.summary[status] ?? 0}
              </p>
              <ComplianceBadge status={status as ComplianceStatus} className="mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 5×5 Risk Matrix + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Matrix */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              Misuse Scenario Risk Matrix
              <span className="text-xs font-normal text-muted-foreground ml-1">ISO 42005 · Sec. 5.3.5</span>
            </CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {openScenarios > 0 && (
                <span className="flex items-center gap-1 text-orange-400">
                  <AlertTriangle className="h-3 w-3" />
                  {openScenarios} open
                </span>
              )}
              {criticalScenarios > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  {criticalScenarios} critical
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <RiskMatrix scenarios={misuseScenarios} />
          </CardContent>
        </Card>

        {/* Radar + High Risk Models */}
        <div className="space-y-4">
          {/* Risk Radar */}
          {selectedRadarModel && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Risk Dimension Radar</CardTitle>
                  <RiskBadge level={selectedRadarModel.riskLevel} />
                </div>
                <select
                  className="text-xs bg-muted border border-border rounded px-2 py-1 w-full mt-1"
                  value={selectedRadarModel.model.id}
                  onChange={(e) => {
                    const m = riskModels.find((r) => r.model.id === e.target.value);
                    if (m) setSelectedRadarModel(m);
                  }}
                >
                  {riskModels.map((r) => (
                    <option key={r.model.id} value={r.model.id}>{r.model.name}</option>
                  ))}
                </select>
              </CardHeader>
              <CardContent className="pt-0">
                <RiskRadar model={selectedRadarModel} />
              </CardContent>
            </Card>
          )}

          {/* Top risks list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">High-Risk Models</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {riskModels
                .filter((r) => r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL")
                .slice(0, 5)
                .map((r) => (
                  <button
                    key={r.model.id}
                    className="w-full flex items-center justify-between gap-2 hover:bg-muted/50 rounded p-1 transition-colors"
                    onClick={() => setSelectedRadarModel(r)}
                  >
                    <div className="min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{r.model.name}</p>
                      <p className="text-xs text-muted-foreground">{r.model.type}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-mono">{r.overallScore.toFixed(0)}</span>
                      <RiskBadge level={r.riskLevel} />
                    </div>
                  </button>
                ))}
              {riskModels.filter((r) => r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No high-risk models.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Compliance Controls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Compliance Controls
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              {FRAMEWORKS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFramework(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    framework === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => setShowAssessModal(true)}>
              Run Assessment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={complianceColumns}
            data={compliance?.controls ?? []}
            loading={loading}
            emptyMessage={`No ${framework} controls mapped yet.`}
          />
          {/* Expanded evidence panel */}
          {expandedControl && (() => {
            const ctrl = compliance?.controls.find((c) => c.id === expandedControl);
            if (!ctrl) return null;
            return (
              <div className="border-t border-border bg-muted/20 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {ctrl.controlId} — {ctrl.controlName}
                  </p>
                  <button onClick={() => setExpandedControl(null)} className="text-xs text-muted-foreground hover:text-foreground">
                    Close ↑
                  </button>
                </div>
                {ctrl.evidence && (
                  <div className="text-xs text-muted-foreground bg-background border border-border rounded p-3">
                    <span className="font-medium text-foreground">Evidence note: </span>{ctrl.evidence}
                  </div>
                )}
                {ctrl.notes && (
                  <div className="text-xs text-muted-foreground bg-background border border-border rounded p-3">
                    <span className="font-medium text-foreground">Notes: </span>{ctrl.notes}
                  </div>
                )}
                <EvidenceUpload
                  controlId={ctrl.id}
                  section={ctrl.controlId}
                  label="Upload Evidence Documents"
                />
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {showAssessModal && (
        <AssessModelModal
          onClose={() => setShowAssessModal(false)}
          onSuccess={() => { setShowAssessModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}
