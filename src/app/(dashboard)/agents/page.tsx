"use client";

import { useEffect, useState } from "react";
import { Bot, Plus, AlertTriangle, Zap, X, ChevronRight } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/risk-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Agent, PromptLog } from "@/types";
import { formatDate, truncate } from "@/lib/utils";
import { RegisterAgentModal } from "@/components/agents/register-agent-modal";

// ── Prompt Log Detail Drawer ──────────────────────────────────────────────────

function LogDetailDrawer({ log, onClose }: { log: PromptLog; onClose: () => void }) {
  const score = (val?: number) =>
    val == null ? "—" : `${(val * 100).toFixed(0)}%`;

  const scoreColor = (val?: number) => {
    if (val == null) return "text-muted-foreground";
    if (val > 0.7) return "text-red-400";
    if (val > 0.4) return "text-amber-400";
    return "text-green-400";
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div className="relative z-10 w-full max-w-2xl bg-card border-l border-border h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-base">Prompt Log Detail</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(log.createdAt)}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">

          {/* Safety status */}
          <div className="flex items-center gap-2">
            {log.flagged ? (
              <Badge variant="danger" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> Flagged
              </Badge>
            ) : (
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
                ✓ Clean
              </span>
            )}
            {log.isHallucination && (
              <Badge className="text-xs bg-purple-500/15 text-purple-400 border-purple-500/30">Hallucination</Badge>
            )}
            {log.isPolicyViolation && (
              <Badge variant="danger" className="text-xs">Policy Violation</Badge>
            )}
            {log.flagReason && (
              <span className="text-xs text-muted-foreground">— {log.flagReason}</span>
            )}
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Latency", value: log.latencyMs ? `${log.latencyMs}ms` : "—", color: "text-foreground" },
              { label: "Input Tokens", value: log.inputTokens?.toLocaleString() ?? "—", color: "text-foreground" },
              { label: "Output Tokens", value: log.outputTokens?.toLocaleString() ?? "—", color: "text-foreground" },
            ].map((m) => (
              <div key={m.label} className="bg-muted/40 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
                <div className={`text-lg font-bold tabular-nums ${m.color}`}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Safety scores */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Safety Scores</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Toxicity", value: log.toxicityScore },
                { label: "Bias", value: log.biasScore },
                { label: "Accuracy", value: log.accuracyScore },
              ].map((s) => (
                <div key={s.label} className="bg-muted/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                  <div className={`text-lg font-bold ${s.label === "Accuracy" ? (s.value != null && s.value > 0.6 ? "text-green-400" : "text-muted-foreground") : scoreColor(s.value)}`}>
                    {score(s.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tools used */}
          {log.toolsUsed.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tools Used</h3>
              <div className="flex flex-wrap gap-1.5">
                {log.toolsUsed.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* System Prompt */}
          {log.systemPrompt && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">System Prompt</h3>
              <pre className="text-xs bg-muted/40 rounded-lg p-3 whitespace-pre-wrap font-mono text-muted-foreground leading-relaxed border border-border">
                {log.systemPrompt}
              </pre>
            </div>
          )}

          {/* Prompt */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Prompt</h3>
            <pre className="text-xs bg-muted/40 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed border border-border">
              {log.prompt}
            </pre>
          </div>

          {/* Response */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Response</h3>
            {log.response ? (
              <pre className="text-xs bg-muted/40 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed border border-border max-h-64 overflow-y-auto">
                {log.response}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground italic">No response recorded</p>
            )}
          </div>

          {/* Meta */}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
            <p>Log ID: <span className="font-mono">{log.id}</span></p>
            {log.sessionId && <p>Session: <span className="font-mono">{log.sessionId}</span></p>}
            <p>Environment: <span className="capitalize">{log.environment}</span></p>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const api = useApi();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [logs, setLogs] = useState<PromptLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<PromptLog | null>(null);

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
        `/agents/${agent.id}/logs?limit=50`
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
      cell: (row) => {
        const name = row.model?.name ?? row.externalModel ?? null;
        const isExternal = !row.model && !!row.externalModel;
        return name ? (
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{name}</span>
            {isExternal && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                LLM
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
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
        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: "prompt",
      header: "Prompt",
      cell: (row) => (
        <button
          className="text-xs font-mono text-left hover:text-primary transition-colors group flex items-center gap-1 w-full"
          onClick={() => setSelectedLog(row)}
          title="Click to view full prompt"
        >
          <span className="truncate">{truncate(row.prompt, 80)}</span>
          <ChevronRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
        </button>
      ),
    },
    {
      key: "toolsUsed",
      header: "Tools Used",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.toolsUsed.length === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            row.toolsUsed.map((t) => (
              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
            ))
          )}
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
              <span className="text-xs font-normal text-muted-foreground ml-2">
                Click any row to view full prompt &amp; response
              </span>
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

      {/* Log Detail Drawer */}
      {selectedLog && (
        <LogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
