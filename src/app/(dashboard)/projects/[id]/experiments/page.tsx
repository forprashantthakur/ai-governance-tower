"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, FlaskConical, TrendingUp, Check, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { Experiment } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  running: "text-blue-400 bg-blue-400/10",
  completed: "text-green-400 bg-green-400/10",
  failed: "text-red-400 bg-red-400/10",
  archived: "text-slate-400 bg-slate-400/10",
};

export default function ExperimentsPage() {
  const params = useParams<{ id: string }>();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selected, setSelected] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const getH = () => ({ Authorization: `Bearer ${localStorage.getItem("auth_token")}` });

  useEffect(() => {
    fetch(`/api/projects/${params.id}/experiments`, { headers: getH() })
      .then((r) => r.json())
      .then((d) => {
        setExperiments(d.data ?? []);
        setLoading(false);
      });
  }, [params.id]);

  async function createExperiment() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${params.id}/experiments`, {
        method: "POST",
        headers: { ...getH(), "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.data) {
        setExperiments((e) => [data.data, ...e]);
        setShowCreate(false);
        setForm({ name: "", description: "", notes: "" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function logRun(expId: string) {
    const accuracy = parseFloat(prompt("Accuracy (0-1):") ?? "0");
    const loss = parseFloat(prompt("Loss:") ?? "0");
    await fetch(`/api/projects/${params.id}/experiments/${expId}/runs`, {
      method: "POST",
      headers: { ...getH(), "Content-Type": "application/json" },
      body: JSON.stringify({ metrics: { accuracy, loss }, status: "completed" }),
    });
    // Refresh
    fetch(`/api/projects/${params.id}/experiments`, { headers: getH() })
      .then((r) => r.json())
      .then((d) => setExperiments(d.data ?? []));
  }

  // Build run chart data from selected experiment
  const chartData = selected?.runs?.map((r) => ({
    run: `Run ${r.runNumber}`,
    accuracy: (r.metrics as Record<string, number>)?.accuracy,
    loss: (r.metrics as Record<string, number>)?.loss,
    f1: (r.metrics as Record<string, number>)?.f1,
  })) ?? [];

  return (
    <div className="p-6 h-full flex gap-6">
      {/* Left: Experiment list */}
      <div className="w-72 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Experiments</h2>
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" /> New
          </Button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="bg-card border border-border rounded-xl p-3 space-y-2">
            <Input placeholder="Experiment name" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-7 text-xs" />
            <Input placeholder="Description" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="h-7 text-xs" />
            <div className="flex gap-1">
              <Button size="sm" className="h-6 text-xs" onClick={createExperiment} disabled={saving}>
                Create
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : experiments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No experiments yet</p>
          </div>
        ) : (
          <div className="space-y-1.5 overflow-y-auto flex-1">
            {experiments.map((exp) => (
              <div
                key={exp.id}
                onClick={() => setSelected(exp)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selected?.id === exp.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{exp.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[exp.status] ?? ""}`}>
                    {exp.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{exp.runs?.length ?? 0} runs</span>
                </div>
                {exp.metrics && Object.keys(exp.metrics).length > 0 && (
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {Object.entries(exp.metrics).slice(0, 3).map(([k, v]) => (
                      <span key={k} className="text-xs text-muted-foreground">
                        {k}: <span className="text-foreground font-medium">{typeof v === "number" ? v.toFixed(3) : v}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Detail panel */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">Select an experiment to view details</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">{selected.name}</h3>
                {selected.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => logRun(selected.id)}
              >
                <Plus className="h-3.5 w-3.5" /> Log Run
              </Button>
            </div>

            {/* Metrics chart */}
            {chartData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h4 className="text-sm font-semibold mb-4">Metrics across runs</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="run" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} domain={[0, 1]} />
                    <Tooltip
                      contentStyle={{ background: "#0d1b2a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="loss" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                    {chartData.some((d) => d.f1 !== undefined) && (
                      <Line type="monotone" dataKey="f1" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Hyperparams */}
            {selected.hyperparams && Object.keys(selected.hyperparams).length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h4 className="text-sm font-semibold mb-3">Hyperparameters</h4>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(selected.hyperparams).map(([k, v]) => (
                    <div key={k} className="bg-muted rounded-lg p-2">
                      <div className="text-xs text-muted-foreground">{k}</div>
                      <div className="text-sm font-medium">{String(v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Runs table */}
            {(selected.runs?.length ?? 0) > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h4 className="text-sm font-semibold mb-3">Run History</h4>
                <div className="space-y-2">
                  {selected.runs!.map((run) => (
                    <div key={run.id} className="flex items-center gap-4 text-xs p-2 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground w-12">Run {run.runNumber}</span>
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                        run.status === "completed" ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
                      }`}>{run.status}</span>
                      {run.metrics && Object.entries(run.metrics as Record<string, number>).map(([k, v]) => (
                        <span key={k} className="text-muted-foreground">
                          {k}: <span className="text-foreground">{typeof v === "number" ? v.toFixed(4) : v}</span>
                        </span>
                      ))}
                      {run.duration && <span className="text-muted-foreground ml-auto">{run.duration}s</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
