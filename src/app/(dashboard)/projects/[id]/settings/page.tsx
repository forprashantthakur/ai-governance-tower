"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2, Play, CheckCircle2, XCircle, Webhook, Link2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { N8nWebhook, N8nTriggerEvent, ProjectAIModel, AIModel } from "@/types";

const EVENT_LABELS: Record<N8nTriggerEvent, string> = {
  PHASE_COMPLETE: "Phase Complete",
  MILESTONE_REACHED: "Milestone Reached",
  TASK_DONE: "Task Done",
  RISK_THRESHOLD: "Risk Threshold",
  EXPERIMENT_LOGGED: "Experiment Logged",
};

const EVENT_COLORS: Record<N8nTriggerEvent, string> = {
  PHASE_COMPLETE: "text-blue-400 bg-blue-400/10",
  MILESTONE_REACHED: "text-green-400 bg-green-400/10",
  TASK_DONE: "text-teal-400 bg-teal-400/10",
  RISK_THRESHOLD: "text-red-400 bg-red-400/10",
  EXPERIMENT_LOGGED: "text-purple-400 bg-purple-400/10",
};

export default function ProjectSettingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<"n8n" | "models" | "config">("n8n");
  const [webhooks, setWebhooks] = useState<N8nWebhook[]>([]);
  const [linkedModels, setLinkedModels] = useState<ProjectAIModel[]>([]);
  const [allModels, setAllModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, { status: string; loading: boolean }>>({});
  const [webhookForm, setWebhookForm] = useState({
    name: "", webhookUrl: "", triggerEvent: "PHASE_COMPLETE" as N8nTriggerEvent,
  });
  const [saving, setSaving] = useState(false);
  const getH = () => ({ Authorization: `Bearer ${localStorage.getItem("auth_token")}` });

  useEffect(() => {
    const loadAll = async () => {
      const [w, lm, am] = await Promise.all([
        fetch(`/api/projects/${params.id}/webhooks`, { headers: getH() }).then(r => r.json()),
        fetch(`/api/projects/${params.id}/models`, { headers: getH() }).then(r => r.json()),
        fetch("/api/models?limit=50", { headers: getH() }).then(r => r.json()),
      ]);
      setWebhooks(w.data ?? []);
      setLinkedModels(lm.data ?? []);
      setAllModels(am.data?.items ?? []);
      setLoading(false);
    };
    loadAll();
  }, [params.id]);

  async function addWebhook() {
    if (!webhookForm.name || !webhookForm.webhookUrl) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${params.id}/webhooks`, {
        method: "POST",
        headers: { ...getH(), "Content-Type": "application/json" },
        body: JSON.stringify(webhookForm),
      });
      const data = await res.json();
      if (data.data) { setWebhooks(w => [...w, data.data]); setShowWebhookForm(false); }
    } finally { setSaving(false); }
  }

  async function deleteWebhook(wid: string) {
    await fetch(`/api/projects/${params.id}/webhooks/${wid}`, { method: "DELETE", headers: getH() });
    setWebhooks(w => w.filter(x => x.id !== wid));
  }

  async function toggleWebhook(wid: string, isActive: boolean) {
    await fetch(`/api/projects/${params.id}/webhooks/${wid}`, {
      method: "PATCH",
      headers: { ...getH(), "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    setWebhooks(w => w.map(x => x.id === wid ? { ...x, isActive } : x));
  }

  async function testWebhook(wid: string) {
    setTestResult(r => ({ ...r, [wid]: { status: "", loading: true } }));
    const res = await fetch(`/api/projects/${params.id}/webhooks/${wid}/trigger`, {
      method: "POST", headers: getH(),
    });
    const data = await res.json();
    setTestResult(r => ({ ...r, [wid]: { status: data.data?.lastStatus ?? "error", loading: false } }));
  }

  async function linkModel(modelId: string) {
    const res = await fetch(`/api/projects/${params.id}/models`, {
      method: "POST",
      headers: { ...getH(), "Content-Type": "application/json" },
      body: JSON.stringify({ modelId, role: "output" }),
    });
    const data = await res.json();
    if (data.data) {
      const m = allModels.find(x => x.id === modelId);
      setLinkedModels(l => [...l, { ...data.data, model: m }]);
    }
  }

  async function unlinkModel(modelId: string) {
    await fetch(`/api/projects/${params.id}/models/${modelId}`, { method: "DELETE", headers: getH() });
    setLinkedModels(l => l.filter(x => x.modelId !== modelId));
  }

  const linkedIds = new Set(linkedModels.map(l => l.modelId));

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <h2 className="font-bold text-lg">Project Settings</h2>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: "n8n", label: "n8n Webhooks", icon: Webhook },
          { key: "models", label: "Linked AI Models", icon: Link2 },
          { key: "config", label: "Configuration", icon: Settings },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as "n8n" | "models" | "config")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* n8n Webhooks */}
      {tab === "n8n" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Connect n8n workflows to project events. Create a Webhook trigger node in n8n, copy the URL, and paste it below.
              </p>
            </div>
            <Button size="sm" className="gap-2 shrink-0" onClick={() => setShowWebhookForm(true)}>
              <Plus className="h-4 w-4" /> Add Webhook
            </Button>
          </div>

          {/* Setup guide */}
          <details className="bg-card border border-border rounded-xl">
            <summary className="px-4 py-3 text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
              n8n Setup Guide ▼
            </summary>
            <div className="px-4 pb-4 text-xs text-muted-foreground space-y-2 border-t border-border pt-3">
              <p>1. In n8n, add a <strong className="text-foreground">Webhook</strong> trigger node and set Method to POST.</p>
              <p>2. Copy the <strong className="text-foreground">Webhook URL</strong> from n8n.</p>
              <p>3. Paste it here and choose which event triggers it.</p>
              <p>4. The payload sent will include: <code className="bg-muted px-1 rounded">event, projectId, projectName, timestamp</code> plus context.</p>
              <p>5. Use <strong className="text-foreground">Test</strong> to verify the connection before going live.</p>
            </div>
          </details>

          {showWebhookForm && (
            <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold">New Webhook</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input placeholder="e.g. Slack Alert" value={webhookForm.name}
                    onChange={e => setWebhookForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Trigger Event</Label>
                  <select
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                    value={webhookForm.triggerEvent}
                    onChange={e => setWebhookForm(f => ({ ...f, triggerEvent: e.target.value as N8nTriggerEvent }))}
                  >
                    {Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">n8n Webhook URL</Label>
                <Input placeholder="https://your-n8n.com/webhook/..." value={webhookForm.webhookUrl}
                  onChange={e => setWebhookForm(f => ({ ...f, webhookUrl: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addWebhook} disabled={saving}>{saving ? "Saving…" : "Add Webhook"}</Button>
                <Button variant="outline" size="sm" onClick={() => setShowWebhookForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {webhooks.length === 0 && !showWebhookForm ? (
            <div className="text-center py-10 text-muted-foreground">
              <Webhook className="h-9 w-9 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No webhooks configured</p>
            </div>
          ) : (
            <div className="space-y-2">
              {webhooks.map(wh => {
                const tr = testResult[wh.id];
                return (
                  <div key={wh.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{wh.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_COLORS[wh.triggerEvent]}`}>
                            {EVENT_LABELS[wh.triggerEvent]}
                          </span>
                          {!wh.isActive && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400">Disabled</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{wh.webhookUrl}</p>
                        {wh.lastTriggeredAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last triggered: {new Date(wh.lastTriggeredAt).toLocaleString()}
                            {wh.lastStatus && (
                              <span className={`ml-2 font-medium ${wh.lastStatus === "success" ? "text-green-400" : "text-red-400"}`}>
                                ({wh.lastStatus})
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                          onClick={() => testWebhook(wh.id)} disabled={tr?.loading}>
                          {tr?.loading ? "…" : <><Play className="h-3 w-3" />Test</>}
                        </Button>
                        {tr && !tr.loading && (
                          tr.status === "success"
                            ? <CheckCircle2 className="h-4 w-4 text-green-400" />
                            : <XCircle className="h-4 w-4 text-red-400" />
                        )}
                        <Button variant="ghost" size="sm" className="h-7 text-xs"
                          onClick={() => toggleWebhook(wh.id, !wh.isActive)}>
                          {wh.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400"
                          onClick={() => deleteWebhook(wh.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Linked AI Models */}
      {tab === "models" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Link AI models from the registry to this project.</p>
          <div className="grid grid-cols-1 gap-2">
            {allModels.map(m => {
              const linked = linkedIds.has(m.id);
              return (
                <div key={m.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  linked ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                }`}>
                  <div>
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{m.type} · v{m.version}</span>
                  </div>
                  <Button
                    size="sm" variant={linked ? "outline" : "default"} className="h-7 text-xs"
                    onClick={() => linked ? unlinkModel(m.id) : linkModel(m.id)}
                  >
                    {linked ? "Unlink" : "Link"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Config */}
      {tab === "config" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Update project settings or archive the project.</p>
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Cancelling a project marks it as cancelled. It can be reactivated later.
            </p>
            <Button
              variant="outline" size="sm"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
              onClick={async () => {
                if (!confirm("Mark this project as cancelled?")) return;
                await fetch(`/api/projects/${params.id}`, {
                  method: "PATCH",
                  headers: { ...getH(), "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "CANCELLED" }),
                });
                router.push("/projects");
              }}
            >
              Cancel Project
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
