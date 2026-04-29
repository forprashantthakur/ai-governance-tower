"use client";

import { useEffect, useState } from "react";
import {
  BrainCircuit,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Activity,
  CheckSquare,
  Siren,
  Target,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { useApi } from "@/hooks/use-api";
import { StatCard } from "@/components/shared/stat-card";
import { RiskBadge } from "@/components/shared/risk-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData, RiskLevel } from "@/types";

const RISK_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

const COMPLIANCE_COLORS: Record<string, string> = {
  PASS: "#10b981",
  FAIL: "#ef4444",
  PARTIAL: "#f59e0b",
  NOT_APPLICABLE: "#6b7280",
  PENDING_REVIEW: "#3b82f6",
};

// ── Governance Posture Score ──────────────────────────────────────────────────

interface PostureMetric {
  label: string;
  score: number;
  weight: number;
  color: string;
}

function GovernancePostureCard({
  complianceScore,
  pendingApprovals,
  openMisuse,
  criticalAlerts,
  totalModels,
}: {
  complianceScore: number;
  pendingApprovals: number;
  openMisuse: number;
  criticalAlerts: number;
  totalModels: number;
}) {
  // Each metric scored 0-100, weighted into an overall posture score
  const approvalScore = Math.max(0, 100 - pendingApprovals * 10);
  const misuseScore   = Math.max(0, 100 - openMisuse * 8);
  const alertScore    = Math.max(0, 100 - criticalAlerts * 15);

  const overallScore = Math.round(
    complianceScore * 0.40 +
    approvalScore   * 0.25 +
    misuseScore     * 0.20 +
    alertScore      * 0.15
  );

  const scoreColor =
    overallScore >= 80 ? "#10b981" :
    overallScore >= 60 ? "#f59e0b" :
    overallScore >= 40 ? "#f97316" :
    "#ef4444";

  const scoreLabel =
    overallScore >= 80 ? "Strong" :
    overallScore >= 60 ? "Moderate" :
    overallScore >= 40 ? "Weak" :
    "Critical";

  const radialData = [{ value: overallScore, fill: scoreColor }];

  const metrics: PostureMetric[] = [
    { label: "Compliance Controls", score: complianceScore, weight: 40, color: COMPLIANCE_COLORS.PASS },
    { label: "Approval Workflows",  score: approvalScore,  weight: 25, color: "#3b82f6" },
    { label: "Misuse Scenarios",    score: misuseScore,    weight: 20, color: "#a855f7" },
    { label: "Active Alerts",       score: alertScore,     weight: 15, color: "#f97316" },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Governance Posture Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Radial gauge */}
          <div className="relative shrink-0">
            <ResponsiveContainer width={120} height={120}>
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={radialData}
                startAngle={180}
                endAngle={-180}
              >
                <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "#1e293b" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: scoreColor }}>{overallScore}</span>
              <span className="text-[10px] font-medium" style={{ color: scoreColor }}>{scoreLabel}</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex-1 space-y-2">
            {metrics.map((m) => (
              <div key={m.label} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className="font-mono">{m.score}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${m.score}%`, background: m.color }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground pt-1">
              Weighted composite: 40% compliance · 25% approvals · 20% misuse · 15% alerts
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const api = useApi();
  const [data, setData] = useState<DashboardData | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [openMisuse, setOpenMisuse] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardData>("/dashboard"),
      api.get<{ id: string; status: string }[]>("/approvals").catch(() => []),
      api.get<{ id: string; isAddressed: boolean }[]>("/misuse-scenarios").catch(() => []),
    ])
      .then(([dashData, approvals, misuse]) => {
        setData(dashData);
        const apArr = Array.isArray(approvals) ? approvals : [];
        const msArr = Array.isArray(misuse)    ? misuse    : [];
        setPendingApprovals(apArr.filter((a) => a.status === "PENDING").length);
        setOpenMisuse(msArr.filter((m) => !m.isAddressed).length);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!data) return <div className="text-muted-foreground">Failed to load dashboard.</div>;

  const { kpis, riskDistribution, complianceSummary, usageTrend, topRiskyModels } = data;

  const riskPieData = Object.entries(riskDistribution).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* KPI Cards — Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total AI Models"
          value={kpis.totalModels}
          subtitle={`${kpis.activeModels} active`}
          icon={BrainCircuit}
          variant="info"
          href="/models"
        />
        <StatCard
          title="Avg Risk Score"
          value={`${kpis.avgRiskScore}/100`}
          subtitle="Composite risk index"
          icon={ShieldAlert}
          variant={kpis.avgRiskScore >= 65 ? "danger" : kpis.avgRiskScore >= 45 ? "warning" : "success"}
          href="/risk"
        />
        <StatCard
          title="Compliance Score"
          value={`${kpis.complianceScore}%`}
          subtitle="Controls passing"
          icon={CheckCircle2}
          variant={kpis.complianceScore >= 80 ? "success" : kpis.complianceScore >= 60 ? "warning" : "danger"}
          href="/risk"
        />
        <StatCard
          title="Active Alerts"
          value={kpis.activeAlerts}
          subtitle="Unresolved incidents"
          icon={AlertTriangle}
          variant={kpis.activeAlerts > 0 ? "warning" : "success"}
          href="/monitoring"
        />
      </div>

      {/* KPI Cards — Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="LLM Calls (30d)"
          value={kpis.promptCallsThisMonth.toLocaleString()}
          subtitle="Prompt executions this month"
          icon={Activity}
          variant="default"
          href="/monitoring"
        />
        <StatCard
          title="Pending Approvals"
          value={pendingApprovals}
          subtitle="Workflows awaiting decision"
          icon={CheckSquare}
          variant={pendingApprovals > 3 ? "warning" : pendingApprovals > 0 ? "default" : "success"}
          href="/approvals"
        />
        <StatCard
          title="Open Misuse Risks"
          value={openMisuse}
          subtitle="Unaddressed misuse scenarios"
          icon={Siren}
          variant={openMisuse > 5 ? "danger" : openMisuse > 2 ? "warning" : "success"}
          href="/risk"
        />
        <StatCard
          title="Frameworks Tracked"
          value={5}
          subtitle="DPDP · ISO 42001 · ISO 42001 · GDPR · SOC2"
          icon={CheckCircle2}
          variant="info"
          href="/compliance-map"
        />
      </div>

      {/* Governance Posture + Usage Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Usage Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">AI Usage Trend (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={usageTrend}>
                <defs>
                  <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#callsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {riskPieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={RISK_COLORS[entry.name] ?? "#6b7280"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
                />
                <Legend
                  formatter={(v) => (
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Governance Posture */}
      <GovernancePostureCard
        complianceScore={kpis.complianceScore}
        pendingApprovals={pendingApprovals}
        openMisuse={openMisuse}
        criticalAlerts={kpis.activeAlerts}
        totalModels={kpis.totalModels}
      />

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Compliance Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={complianceSummary} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="status"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  width={90}
                  tickFormatter={(v) => v.replace("_", " ")}
                />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {complianceSummary.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={COMPLIANCE_COLORS[entry.status] ?? "#6b7280"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Risky Models */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Risk Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topRiskyModels.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No risk assessments yet.
                </p>
              )}
              {topRiskyModels.map((item, idx) => (
                <div
                  key={item.model.id}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.model.name}</p>
                      <p className="text-xs text-muted-foreground">{item.model.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold tabular-nums">
                      {item.overallScore.toFixed(1)}
                    </span>
                    <RiskBadge level={item.riskLevel as RiskLevel} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-64 rounded-lg bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
      <div className="h-40 rounded-lg bg-muted" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-56 rounded-lg bg-muted" />
        <div className="h-56 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
