"use client";

import { useEffect, useState } from "react";
import { Bot, Plus, AlertTriangle, Zap } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/risk-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Agent, PromptLog } from "@/types";
import { formatDate, truncate } from "@/lib/utils";
import { RegisterAgentModal } from "@/components/agents/register-agent-modal";

export default function AgentsPage() {
  const api = useApi();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [logs, setLogs] = useState<PromptLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    api
      .get<Agent[]>("/agents")
      .then(setAgents)
      .finally(() => setLoading(false));
  }, []);

  async function fetchLogs(agent: Agent) {
    setSelectedAgent(agent);
    setLogsLoading(true);
    try {
      const data = await api.get<{ logs: PromptLog[] }>(
        `/agents/${agent.id}/logs?limit=20`
      );
      setLogs(data.logs);
    } finally {
      setLogsLoading(false);
    }
  }

  const agentColumns: Column<Agent>[] = [
    {
      key: "name",
      header: "Agent Name",
      cell: (row) => (
        <div>
          <button
            className="font-medium hover:text-primary transition-colors"
            onClick={() => fetchLogs(row)}
          >
            {row.name}
          </button>
          <p className="text-xs text-muted-foreground">{row.version}</p>
        </div>
      ),
    },
    {
      key: "model",
      header: "Base Model",
      cell: (row) => (
        <span className="text-sm">{row.model?.name ?? "—"}</span>
      ),
    },
    {
      key: "tools",
      header: "Tools",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.tools.length === 0 ? (
            <span className="text-xs text-muted-foreground">None</span>
          ) : (
            row.tools.slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
            ))
          )}
          {row.tools.length > 3 && (
            <span className="text-xs text-muted-foreground">+{row.tools.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "_count",
      header: "Prompt Logs",
      cell: (row) => (
        <span className="text-sm tabular-nums">
          {row._count?.promptLogs.toLocaleString() ?? 0}
        </span>
      ),
    },
  ];

  const logColumns: Column<PromptLog>[] = [
    {
      key: "createdAt",
      header: "Time",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: "prompt",
      header: "Prompt",
      cell: (row) => (
        <span className="text-xs font-mono">{truncate(row.prompt, 80)}</span>
      ),
    },
    {
      key: "toolsUsed",
      header: "Tools Used",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.toolsUsed.map((t) => (
            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: "latencyMs",
      header: "Latency",
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {row.latencyMs ? `${row.latencyMs}ms` : "—"}
        </span>
      ),
    },
    {
      key: "flagged",
      header: "Flags",
      cell: (row) => (
        <div className="flex gap-1">
          {row.flagged && (
            <Badge variant="danger" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" /> Flagged
            </Badge>
          )}
          {row.isHallucination && (
            <Badge className="text-xs bg-purple-500/15 text-purple-400 border-purple-500/30">
              Hallucination
            </Badge>
          )}
          {row.isPolicyViolation && (
            <Badge variant="danger" className="text-xs">Policy</Badge>
          )}
          {!row.flagged && !row.isHallucination && !row.isPolicyViolation && (
            <span className="text-xs text-muted-foreground">Clean</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Agents", value: agents.length, icon: Bot },
          { label: "Running", value: agents.filter((a) => a.status === "RUNNING").length, icon: Zap },
          { label: "Suspended", value: agents.filter((a) => a.status === "SUSPENDED").length, icon: AlertTriangle },
          { label: "Error State", value: agents.filter((a) => a.status === "ERROR").length, icon: AlertTriangle },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agents Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" /> Agent Registry
          </CardTitle>
          <Button size="sm" onClick={() => setShowRegisterModal(true)}>
            <Plus className="h-4 w-4" /> Register Agent
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={agentColumns}
            data={agents}
            loading={loading}
            emptyMessage="No agents registered. Register your first AI agent."
          />
        </CardContent>
      </Card>

      {/* Register Agent Modal */}
      {showRegisterModal && (
        <RegisterAgentModal
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            setShowRegisterModal(false);
            api.get<Agent[]>("/agents").then(setAgents);
          }}
        />
      )}

      {/* Prompt Logs for selected agent */}
      {selectedAgent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Prompt Logs — {selectedAgent.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={logColumns}
              data={logs}
              loading={logsLoading}
              emptyMessage="No prompt logs for this agent."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
