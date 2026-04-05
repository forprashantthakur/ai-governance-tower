"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity, AlertTriangle, Clock, Zap } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { SeverityBadge } from "@/components/shared/risk-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/data-table";
import type { Alert, PromptLog, AlertSeverity } from "@/types";
import { formatDate, truncate } from "@/lib/utils";

interface MonitoringData {
  summary: {
    totalCalls: number;
    flaggedCount: number;
    flaggedRate: string;
    avgLatencyMs: number;
    avgToxicity: string;
    avgAccuracy: string;
    avgBias: string;
    avgInputTokens: number;
    avgOutputTokens: number;
  };
  dailyVolume: { date: string; calls: number }[];
  recentFlagged: PromptLog[];
  activeAlerts: Alert[];
}

export default function MonitoringPage() {
  const api = useApi();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<MonitoringData>("/monitoring?days=14")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const flaggedColumns: Column<PromptLog>[] = [
    {
      key: "createdAt",
      header: "Time",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: "model",
      header: "Model",
      cell: (row) => <span className="text-sm">{row.model?.name ?? "—"}</span>,
    },
    {
      key: "prompt",
      header: "Prompt",
      cell: (row) => <span className="text-xs">{truncate(row.prompt, 60)}</span>,
    },
    {
      key: "flagReason",
      header: "Flag Reason",
      cell: (row) => (
        <span className="text-xs text-orange-400">{row.flagReason ?? "Flagged"}</span>
      ),
    },
    {
      key: "latencyMs",
      header: "Latency",
      cell: (row) => (
        <span className="text-xs">{row.latencyMs ? `${row.latencyMs}ms` : "—"}</span>
      ),
    },
  ];

  if (loading) return <MonitoringSkeleton />;

  const s = data?.summary;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Activity} label="Total Calls (14d)" value={s?.totalCalls.toLocaleString() ?? "—"} />
        <MetricCard icon={AlertTriangle} label="Flagged Rate" value={`${s?.flaggedRate ?? 0}%`} variant="warning" />
        <MetricCard icon={Clock} label="Avg Latency" value={`${s?.avgLatencyMs ?? 0}ms`} />
        <MetricCard icon={Zap} label="Avg Tokens/Call" value={String(((s?.avgInputTokens ?? 0) + (s?.avgOutputTokens ?? 0)).toFixed(0))} />
      </div>

      {/* Quality Metrics */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Avg Toxicity Score", value: s?.avgToxicity ?? "0", color: "text-red-400" },
          { label: "Avg Accuracy Score", value: s?.avgAccuracy ?? "0", color: "text-green-400" },
          { label: "Avg Bias Score", value: s?.avgBias ?? "0", color: "text-yellow-400" },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${m.color.replace("text", "bg")}`}
                  style={{ width: `${parseFloat(m.value) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Call Volume Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">LLM Call Volume (14 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data?.dailyVolume ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
              />
              <Line
                type="monotone"
                dataKey="calls"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {data?.activeAlerts && data.activeAlerts.length > 0 && (
        <Card className="border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-orange-400">
              <AlertTriangle className="h-4 w-4" /> Active Alerts ({data.activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted"
              >
                <div>
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                </div>
                <SeverityBadge severity={alert.severity as AlertSeverity} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Flagged Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Flagged Interactions</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={flaggedColumns}
            data={data?.recentFlagged ?? []}
            emptyMessage="No flagged interactions. Your models are behaving well."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  variant,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  variant?: "warning";
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-7 w-7 shrink-0 ${variant === "warning" ? "text-orange-400" : "text-primary"}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MonitoringSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-lg bg-muted" />)}
      </div>
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  );
}
