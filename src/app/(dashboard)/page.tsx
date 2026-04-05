"use client";

import { useEffect, useState } from "react";
import {
  BrainCircuit,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Activity,
  TrendingUp,
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
} from "recharts";
import { useApi } from "@/hooks/use-api";
import { StatCard } from "@/components/shared/stat-card";
import { RiskBadge } from "@/components/shared/risk-badge";
import { StatusBadge } from "@/components/shared/risk-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData, RiskLevel } from "@/types";
import { formatDate } from "@/lib/utils";

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

export default function DashboardPage() {
  const api = useApi();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!data) return <div className="text-muted-foreground">Failed to load dashboard.</div>;

  const { kpis, riskDistribution, complianceSummary, usageTrend, topRiskyModels } = data;

  const riskPieData = Object.entries(riskDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          title="Total AI Models"
          value={kpis.totalModels}
          subtitle={`${kpis.activeModels} active`}
          icon={BrainCircuit}
          variant="info"
        />
        <StatCard
          title="Avg Risk Score"
          value={`${kpis.avgRiskScore}/100`}
          subtitle="Composite risk index"
          icon={ShieldAlert}
          variant={kpis.avgRiskScore >= 65 ? "danger" : kpis.avgRiskScore >= 45 ? "warning" : "success"}
        />
        <StatCard
          title="Compliance Score"
          value={`${kpis.complianceScore}%`}
          subtitle="Controls passing"
          icon={CheckCircle2}
          variant={kpis.complianceScore >= 80 ? "success" : kpis.complianceScore >= 60 ? "warning" : "danger"}
        />
        <StatCard
          title="Active Alerts"
          value={kpis.activeAlerts}
          subtitle="Unresolved incidents"
          icon={AlertTriangle}
          variant={kpis.activeAlerts > 0 ? "warning" : "success"}
        />
        <StatCard
          title="LLM Calls (30d)"
          value={kpis.promptCallsThisMonth.toLocaleString()}
          subtitle="Prompt executions this month"
          icon={Activity}
          variant="default"
        />
        <StatCard
          title="Compliance Trend"
          value={`${kpis.complianceScore}%`}
          subtitle="DPDP + ISO 42001"
          icon={TrendingUp}
          variant="info"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Usage Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">AI Usage Trend (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
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
            <ResponsiveContainer width="100%" height={240}>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-72 rounded-lg bg-muted" />
        <div className="h-72 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
