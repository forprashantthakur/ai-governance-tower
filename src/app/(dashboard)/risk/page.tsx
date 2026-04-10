"use client";

import { useEffect, useState } from "react";
import { Shield, CheckSquare, ChevronDown, ChevronUp, Paperclip } from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Cell,
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

interface ComplianceResponse {
  controls: ComplianceControl[];
  summary: Record<string, number>;
  total: number;
}

interface RiskModel {
  overallScore: number;
  riskLevel: RiskLevel;
  model: { id: string; name: string; type: string; status: string };
}

const RISK_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

const FRAMEWORKS = ["DPDP", "ISO42001", "ISO42005", "GDPR", "SOC2"];

export default function RiskPage() {
  const api = useApi();
  const [compliance, setCompliance] = useState<ComplianceResponse | null>(null);
  const [riskModels, setRiskModels] = useState<RiskModel[]>([]);
  const [framework, setFramework] = useState("DPDP");
  const [loading, setLoading] = useState(true);
  const [showAssessModal, setShowAssessModal] = useState(false);
  const [expandedControl, setExpandedControl] = useState<string | null>(null);

  useEffect(() => {
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
    ])
      .then(([c, rm]) => {
        setCompliance(c);
        setRiskModels(rm as RiskModel[]);
      })
      .finally(() => setLoading(false));
  }, [framework]);

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

  const heatmapData = riskModels.map((rm, i) => ({
    x: (i % 5) * 20 + 10,
    y: rm.overallScore,
    z: 10,
    name: rm.model.name,
    level: rm.riskLevel,
    score: rm.overallScore,
  }));

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

      {/* Risk Heatmap + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Risk Heatmap
            </CardTitle>
            <Button size="sm" onClick={() => setShowAssessModal(true)}>
              Run Assessment
            </Button>
          </CardHeader>
          <CardContent>
            {heatmapData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart>
                  <CartesianGridHidden />
                  <XAxis dataKey="x" hide />
                  <YAxis dataKey="y" domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} label={{ value: "Risk Score", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 11 }} />
                  <ZAxis dataKey="z" range={[60, 200]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="p-2 text-xs">
                          <p className="font-bold">{d.name}</p>
                          <p>Score: {d.score.toFixed(1)}</p>
                          <p>Level: {d.level}</p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={heatmapData}>
                    {heatmapData.map((d, i) => (
                      <Cell key={i} fill={RISK_COLORS[d.level] ?? "#6b7280"} fillOpacity={0.8} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No risk data. Run an assessment to populate the heatmap.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top risks list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">High Risk Models</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {riskModels
              .filter((r) => r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL")
              .slice(0, 6)
              .map((r) => (
                <div key={r.model.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.model.name}</p>
                    <p className="text-xs text-muted-foreground">{r.model.type}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-mono">{r.overallScore.toFixed(1)}</span>
                    <RiskBadge level={r.riskLevel} />
                  </div>
                </div>
              ))}
            {riskModels.filter((r) => r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL").length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No high-risk models.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compliance Controls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Compliance Controls
          </CardTitle>
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
          onSuccess={() => { setShowAssessModal(false); }}
        />
      )}
    </div>
  );
}

// Placeholder to avoid import error
function CartesianGridHidden() {
  return null;
}
