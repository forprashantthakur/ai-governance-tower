"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { AuditLog, AuditAction } from "@/types";
import { formatDate } from "@/lib/utils";

interface AuditResponse {
  logs: AuditLog[];
  pagination: { page: number; pages: number; total: number; limit: number };
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-500/15 text-green-400 border-green-500/30",
  UPDATE: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
  LOGIN: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  LOGOUT: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  EXPORT: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  APPROVE: "bg-green-500/15 text-green-400 border-green-500/30",
  REJECT: "bg-red-500/15 text-red-400 border-red-500/30",
  READ: "bg-muted text-muted-foreground border-border",
  ESCALATE: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

export default function AuditPage() {
  const api = useApi();
  const [response, setResponse] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState("");
  const [filterResource, setFilterResource] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        ...(filterAction && { action: filterAction }),
        ...(filterResource && { resource: filterResource }),
      });
      const data = await api.get<AuditResponse>(`/audit?${params}`);
      setResponse(data);
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterResource]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  function exportCSV() {
    if (!response?.logs) return;
    const rows = [
      ["Time", "User", "Action", "Resource", "Resource ID", "IP"].join(","),
      ...response.logs.map((l) =>
        [
          formatDate(l.createdAt),
          l.user?.name ?? "System",
          l.action,
          l.resource,
          l.resourceId ?? "",
          l.ipAddress ?? "",
        ]
          .map((v) => `"${v}"`)
          .join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const columns: Column<AuditLog>[] = [
    {
      key: "createdAt",
      header: "Timestamp",
      cell: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "user",
      header: "User",
      cell: (row) => (
        <div>
          <p className="text-sm font-medium">{row.user?.name ?? "System"}</p>
          <p className="text-xs text-muted-foreground">{row.user?.role ?? ""}</p>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      cell: (row) => (
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
            ACTION_COLORS[row.action] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {row.action}
        </span>
      ),
    },
    {
      key: "resource",
      header: "Resource",
      cell: (row) => (
        <div>
          <p className="text-sm">{row.resource}</p>
          {row.resourceId && (
            <p className="text-xs text-muted-foreground font-mono">
              {row.resourceId.slice(0, 8)}...
            </p>
          )}
        </div>
      ),
    },
    {
      key: "ipAddress",
      header: "IP Address",
      cell: (row) => (
        <span className="text-xs text-muted-foreground font-mono">
          {row.ipAddress ?? "—"}
        </span>
      ),
    },
  ];

  const ACTIONS: AuditAction[] = [
    "CREATE", "READ", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "EXPORT",
  ];

  const RESOURCES = ["AIModel", "RiskAssessment", "ComplianceControl", "User", "Agent"];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none"
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          >
            <option value="">All Actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none"
            value={filterResource}
            onChange={(e) => { setFilterResource(e.target.value); setPage(1); }}
          >
            <option value="">All Resources</option>
            {RESOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {response && (
        <p className="text-sm text-muted-foreground">
          {response.pagination.total.toLocaleString()} audit records
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={response?.logs ?? []}
            loading={loading}
            emptyMessage="No audit logs found."
            pagination={response ? { ...response.pagination, onPageChange: setPage } : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
