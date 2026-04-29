"use client";

import { useState } from "react";
import {
  Workflow, Loader2, Download, Copy, Check, ChevronDown, ChevronUp,
  Play, Zap, Clock, Globe, Database, Mail, MessageSquare, Bot,
  GitBranch, Filter, Code2, ArrowRight, Info, Sparkles, ExternalLink,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUIStore } from "@/store/ui.store";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  parameters: Record<string, unknown>;
  credentials_needed?: string[];
}

interface WorkflowResult {
  workflow_name: string;
  description: string;
  category: string;
  estimated_run_time: string;
  nodes: WorkflowNode[];
  connections: { from: string; to: string }[];
  credentials_required: string[];
  setup_steps: string[];
  test_instructions: string;
  n8n_export: object;
}

// ── Node type → visual config ─────────────────────────────────────────────────
const NODE_STYLES: Record<string, { bg: string; border: string; text: string; icon: typeof Play }> = {
  trigger:       { bg: "bg-orange-500/10", border: "border-orange-500/40", text: "text-orange-400", icon: Play },
  ai:            { bg: "bg-purple-500/10", border: "border-purple-500/40", text: "text-purple-400", icon: Bot },
  logic:         { bg: "bg-blue-500/10",   border: "border-blue-500/40",   text: "text-blue-400",   icon: GitBranch },
  data:          { bg: "bg-cyan-500/10",   border: "border-cyan-500/40",   text: "text-cyan-400",   icon: Code2 },
  database:      { bg: "bg-green-500/10",  border: "border-green-500/40",  text: "text-green-400",  icon: Database },
  communication: { bg: "bg-pink-500/10",   border: "border-pink-500/40",   text: "text-pink-400",   icon: Mail },
  http:          { bg: "bg-yellow-500/10", border: "border-yellow-500/40", text: "text-yellow-400", icon: Globe },
  utility:       { bg: "bg-slate-500/10",  border: "border-slate-500/40",  text: "text-slate-400",  icon: Zap },
};

function getNodeCategory(type: string): string {
  if (type.includes("Trigger") || type.includes("manualTrigger") || type.includes("webhook") || type.includes("scheduleTrigger")) return "trigger";
  if (type.includes("langchain") || type.includes("openAi") || type.includes("Anthropic")) return "ai";
  if (type.includes("if") || type.includes("switch") || type.includes("merge") || type.includes("filter") || type.includes("split")) return "logic";
  if (type.includes("set") || type.includes("code") || type.includes("itemLists")) return "data";
  if (type.includes("postgres") || type.includes("mySql") || type.includes("mongo") || type.includes("redis")) return "database";
  if (type.includes("email") || type.includes("slack") || type.includes("teams") || type.includes("twilio")) return "communication";
  if (type.includes("httpRequest")) return "http";
  return "utility";
}

// ── Visual canvas node ─────────────────────────────────────────────────────────
function NodeCard({ node, isLast }: { node: WorkflowNode; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const cat = node.category || getNodeCategory(node.type);
  const style = NODE_STYLES[cat] ?? NODE_STYLES.utility;
  const Icon = style.icon;
  const paramKeys = Object.keys(node.parameters ?? {});

  return (
    <div className="flex items-start gap-0">
      {/* Node card */}
      <div className={cn("rounded-xl border p-4 w-52 shrink-0 cursor-pointer transition-all hover:shadow-lg", style.bg, style.border)}
        onClick={() => setExpanded((p) => !p)}>
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("p-1.5 rounded-lg", style.bg)}>
            <Icon className={cn("h-3.5 w-3.5", style.text)} />
          </div>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-0 font-mono", style.text, style.bg)}>
            {cat}
          </Badge>
        </div>
        <p className="text-xs font-bold text-foreground leading-tight mb-1">{node.name}</p>
        <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{node.description}</p>
        {paramKeys.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {paramKeys.length} param{paramKeys.length !== 1 ? "s" : ""}
          </div>
        )}
        {/* Expanded parameters */}
        {expanded && paramKeys.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border space-y-1">
            {paramKeys.slice(0, 6).map((k) => (
              <div key={k} className="flex flex-col">
                <span className="text-[9px] font-mono text-muted-foreground">{k}</span>
                <span className="text-[10px] text-foreground truncate">
                  {String(node.parameters[k]).slice(0, 40)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Arrow connector */}
      {!isLast && (
        <div className="flex items-center self-center shrink-0 mx-1">
          <div className="w-6 h-px bg-border" />
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground -ml-1" />
        </div>
      )}
    </div>
  );
}

// ── JSON viewer ────────────────────────────────────────────────────────────────
function JsonViewer({ json }: { json: object }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(json, null, 2);

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const n8nJson = json as { name?: string };
    a.download = `${(n8nJson.name ?? "workflow").replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relative">
      <div className="absolute right-3 top-3 flex gap-2 z-10">
        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={copy}>
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied!" : "Copy"}
        </Button>
        <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={download}>
          <Download className="h-3 w-3" /> Download .json
        </Button>
      </div>
      <pre className="bg-muted/30 border border-border rounded-xl p-4 pt-12 text-[11px] font-mono text-foreground overflow-auto max-h-96 leading-relaxed">
        {text}
      </pre>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
const TRIGGER_OPTIONS = [
  { value: "webhook",  label: "Webhook",          desc: "Triggered by HTTP POST from external system", icon: Globe },
  { value: "schedule", label: "Scheduled",        desc: "Runs automatically on a cron schedule",       icon: Clock },
  { value: "manual",   label: "Manual / On-demand", desc: "Triggered manually for testing",            icon: Play },
];

const COMPLEXITY_OPTIONS = [
  { value: "simple",  label: "Simple",  desc: "4–6 nodes", color: "text-green-400" },
  { value: "medium",  label: "Medium",  desc: "6–10 nodes", color: "text-yellow-400" },
  { value: "complex", label: "Complex", desc: "10–14 nodes", color: "text-red-400" },
];

const QUICK_TEMPLATES = [
  { label: "DPDP Breach Notification", desc: "When PII breach detected, notify DPO via email + Slack and log to audit database" },
  { label: "AI Model Risk Alert",      desc: "When AI model risk score exceeds 80, create approval workflow and alert risk officer" },
  { label: "KYC Document Processing",  desc: "Receive KYC document via webhook, extract data using AI, verify against database, return pass/fail" },
  { label: "Compliance Report",        desc: "Every Monday generate ISO 42001 compliance report and email to CISO and board" },
  { label: "AML Transaction Monitor",  desc: "Receive transaction data, run AI risk scoring, flag suspicious ones and create alert in governance system" },
  { label: "Model Drift Detection",    desc: "Every hour check model accuracy metrics, if accuracy drops below threshold send alert and pause model" },
];

export default function N8nBuilderPage() {
  const { addNotification } = useUIStore();
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<"webhook" | "schedule" | "manual">("webhook");
  const [complexity, setComplexity] = useState<"simple" | "medium" | "complex">("medium");
  const [integrations, setIntegrations] = useState<string[]>([]);
  const [integrationInput, setIntegrationInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [activeTab, setActiveTab] = useState<"diagram" | "json" | "setup">("diagram");

  function addIntegration(val: string) {
    const v = val.trim();
    if (v && !integrations.includes(v)) setIntegrations((p) => [...p, v]);
    setIntegrationInput("");
  }

  async function generate() {
    if (!description.trim() || description.length < 20) {
      addNotification({ type: "error", title: "Too short", message: "Describe the workflow in at least 20 characters." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const token = JSON.parse(localStorage.getItem("ai-governance-auth") ?? "{}").state?.token ?? "";
      const res = await fetch("/api/n8n-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description, triggerType, complexity, integrations }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        addNotification({ type: "error", title: "Generation failed", message: json.error });
        return;
      }
      setResult(json.data as WorkflowResult);
      setActiveTab("diagram");
    } catch {
      addNotification({ type: "error", title: "Network error", message: "Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" /> n8n Workflow Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Describe what you want to automate — AI generates a production-ready n8n workflow you can import and run.
          </p>
        </div>
        <a href="https://app.n8n.cloud" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> Open n8n
          </Button>
        </a>
      </div>

      {/* Builder form */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">What should this workflow do? *</Label>
            <Textarea
              placeholder="e.g. When a new KYC document is submitted via API, use AI to extract Aadhaar and PAN numbers, verify against the database, and send a Slack alert to the compliance team with pass/fail result..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{description.length} / 20 min characters</p>
          </div>

          {/* Quick templates */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Quick Templates</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => setDescription(t.desc)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Trigger type */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Trigger Type</Label>
              <div className="space-y-2">
                {TRIGGER_OPTIONS.map((o) => {
                  const Icon = o.icon;
                  return (
                    <button
                      key={o.value}
                      onClick={() => setTriggerType(o.value as typeof triggerType)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all",
                        triggerType === o.value
                          ? "border-primary/60 bg-primary/5"
                          : "border-border hover:border-border/80"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm font-medium">{o.label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{o.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Complexity */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Complexity</Label>
              <div className="space-y-2">
                {COMPLEXITY_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setComplexity(o.value as typeof complexity)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all",
                      complexity === o.value
                        ? "border-primary/60 bg-primary/5"
                        : "border-border hover:border-border/80"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{o.label}</span>
                      <span className={cn("text-xs font-mono", o.color)}>{o.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Integrations */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Systems to Integrate</Label>
              <div className="flex gap-2">
                <input
                  className="flex-1 h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Slack, PostgreSQL..."
                  value={integrationInput}
                  onChange={(e) => setIntegrationInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIntegration(integrationInput); } }}
                />
                <Button size="sm" variant="outline" onClick={() => addIntegration(integrationInput)}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-8">
                {integrations.map((i) => (
                  <Badge key={i} variant="secondary" className="gap-1 cursor-pointer text-xs"
                    onClick={() => setIntegrations((p) => p.filter((x) => x !== i))}>
                    {i} ×
                  </Badge>
                ))}
                {integrations.length === 0 && (
                  <p className="text-xs text-muted-foreground">Leave empty — AI will infer from description</p>
                )}
              </div>
            </div>
          </div>

          <Button onClick={generate} disabled={loading} size="lg" className="gap-2 w-full md:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Generating workflow…" : "Generate n8n Workflow"}
          </Button>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Designing your workflow…</p>
            <p className="text-xs text-muted-foreground">Claude is generating nodes, connections and parameters</p>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Workflow meta */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">{result.workflow_name}</h2>
                    <Badge variant="outline" className="text-xs">{result.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{result.nodes?.length ?? 0} nodes</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{result.estimated_run_time}</span>
                    {result.credentials_required?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-amber-400" />
                        {result.credentials_required.length} credential{result.credentials_required.length !== 1 ? "s" : ""} needed
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(result.n8n_export, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${result.workflow_name.replace(/\s+/g, "_")}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-3.5 w-3.5" /> Download for n8n
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            {[
              { id: "diagram", label: "Visual Diagram", icon: Workflow },
              { id: "json",    label: "n8n JSON",       icon: Code2 },
              { id: "setup",   label: "Setup Guide",    icon: CheckCircle2 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  activeTab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* Visual diagram */}
          {activeTab === "diagram" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
                  <Info className="h-3.5 w-3.5" /> Click any node to expand its parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="overflow-x-auto pb-4">
                  <div className="flex items-start gap-0 min-w-max">
                    {(result.nodes ?? []).map((node, i) => (
                      <NodeCard
                        key={node.id ?? i}
                        node={node}
                        isLast={i === (result.nodes?.length ?? 0) - 1}
                      />
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-3">
                  {Object.entries(NODE_STYLES).map(([cat, style]) => {
                    const Icon = style.icon;
                    return (
                      <div key={cat} className="flex items-center gap-1.5 text-xs">
                        <div className={cn("p-1 rounded", style.bg)}>
                          <Icon className={cn("h-3 w-3", style.text)} />
                        </div>
                        <span className="text-muted-foreground capitalize">{cat}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* JSON viewer */}
          {activeTab === "json" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Code2 className="h-4 w-4" /> Production-Ready n8n Import JSON
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Download this file → open n8n → click <strong>Import</strong> → select file → activate workflow
                </p>
              </CardHeader>
              <CardContent>
                <JsonViewer json={result.n8n_export} />
              </CardContent>
            </Card>
          )}

          {/* Setup guide */}
          {activeTab === "setup" && (
            <div className="space-y-4">
              {/* How to import */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" /> How to Import into n8n
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    "Download the workflow JSON using the button above",
                    'Open your n8n instance (app.n8n.cloud or self-hosted at localhost:5678)',
                    'Click "+" to create a new workflow, then click the "⋮" menu → Import from File',
                    "Select the downloaded JSON file",
                    "Configure the credentials listed below for each node that needs them",
                    'Click "Save" then toggle the workflow to Active',
                    "Test using the instructions below",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">{i + 1}</div>
                      <p className="text-sm text-foreground">{step}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Credentials */}
              {result.credentials_required?.length > 0 && (
                <Card className="border-amber-500/20">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-amber-400">
                      <AlertCircle className="h-4 w-4" /> Credentials Required
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.credentials_required.map((cred, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                          {cred}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      In n8n: Settings → Credentials → Add new credential for each one above
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Setup steps */}
              {result.setup_steps?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Configuration Steps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {result.setup_steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                        {step}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Test instructions */}
              {result.test_instructions && (
                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-blue-400">
                      <Play className="h-4 w-4" /> How to Test
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground">{result.test_instructions}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
