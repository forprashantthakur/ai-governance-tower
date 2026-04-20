"use client";

import { useState, useCallback } from "react";
import {
  Brain,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  Building2,
  Target,
  Database,
  Cpu,
  BarChart3,
  Clock,
  Network,
  Workflow,
  Bot,
  Zap,
  Plus,
  X,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Download,
  GitBranch,
  Globe,
  Mail,
  MessageSquare,
  Play,
  Braces,
  Link2,
  ShieldCheck,
  DollarSign,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUIStore } from "@/store/ui.store";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Agent {
  agent_name: string;
  role: string;
  responsibilities: string[];
}

interface WorkflowNode {
  step: number;
  name: string;
  node_type: string;
  description: string;
  parameters?: Record<string, unknown>;
}

interface WorkflowConnection {
  from: string;
  to: string;
}

interface Phase {
  phase_name: string;
  duration: string;
  activities: string[];
}

interface UseCase {
  use_case_name: string;
  priority_score?: number;
  priority_tier?: string;
  score_breakdown?: {
    business_impact: number;
    data_readiness: number;
    decision_complexity: number;
    monetization: number;
    tech_feasibility: number;
    risk_compliance: number;
    org_readiness: number;
    rationale: string;
  };
  business_problem: string;
  ai_solution: string;
  expected_business_impact: string;
  agentic_ai_design: {
    agents: Agent[];
    decision_flow: string;
  };
  n8n_workflow: {
    workflow_name: string;
    trigger: string;
    nodes: WorkflowNode[];
    connections?: WorkflowConnection[];
    integrations: string[];
    workflow_summary: string;
  };
  implementation_plan: {
    timeline_weeks: string;
    phases: Phase[];
  };
  integration_architecture: {
    systems_involved: string[];
    data_flow: string;
    api_requirements: string[];
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const INDUSTRIES = [
  "Banking & Financial Services",
  "Insurance",
  "Healthcare",
  "Manufacturing",
  "Retail & E-commerce",
  "Telecommunications",
  "Energy & Utilities",
  "Logistics & Supply Chain",
  "Real Estate",
  "Education",
  "Government & Public Sector",
  "Technology & SaaS",
  "Media & Entertainment",
  "Pharmaceuticals",
  "Agriculture",
  "Hospitality",
];

const COMMON_SYSTEMS = [
  "Salesforce", "SAP", "Oracle", "Microsoft 365", "ServiceNow",
  "Workday", "HubSpot", "Zendesk", "Slack", "Jira", "Power BI",
  "Tableau", "AWS", "Azure", "Google Cloud", "PostgreSQL",
  "MySQL", "MongoDB", "Snowflake", "Databricks",
];

// ── Helper UI Components ──────────────────────────────────────────────────────

/** Radio-style card button (single select) */
function OptionCard({
  label, desc, selected, onClick,
}: {
  label: string; desc?: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-xl border transition-colors flex items-start gap-2.5",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border hover:border-primary/50 hover:bg-muted/30 text-foreground"
      )}
    >
      <div className={cn(
        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
        selected ? "border-primary" : "border-muted-foreground/50"
      )}>
        {selected && <div className="h-2 w-2 rounded-full bg-primary" />}
      </div>
      <div>
        <p className={cn("text-sm font-medium", selected ? "text-primary" : "text-foreground")}>{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
    </button>
  );
}

/** Multi-select chip */
function MultiChip({
  label, selected, onClick,
}: {
  label: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors",
        selected
          ? "border-primary bg-primary/10 text-primary font-medium"
          : "border-border hover:border-primary/50 hover:bg-muted/30 text-muted-foreground"
      )}
    >
      {selected && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
      {label}
    </button>
  );
}

// ── Tag Input Component ────────────────────────────────────────────────────────
function TagInput({
  label, placeholder, tags, setTags, suggestions,
}: {
  label: string;
  placeholder: string;
  tags: string[];
  setTags: (t: string[]) => void;
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");
  const add = (val: string) => {
    const v = val.trim();
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setInput("");
  };
  const remove = (t: string) => setTags(tags.filter((x) => x !== t));
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(input); } }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => add(input)}><Plus className="h-4 w-4" /></Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-primary text-primary-foreground"
            >
              {t}
              <button
                type="button"
                onClick={() => remove(t)}
                className="ml-0.5 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {suggestions && (
        <div className="flex flex-wrap gap-1 mt-1">
          {suggestions.filter((s) => !tags.includes(s)).slice(0, 10).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="text-xs px-2 py-0.5 rounded-full border border-dashed border-border/70 text-muted-foreground bg-transparent hover:border-primary hover:text-primary hover:bg-primary/10 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── n8n utilities ────────────────────────────────────────────────────────────

/** Map a node_type to a display colour + icon label */
function nodeStyle(nodeType: string): { bg: string; border: string; label: string; category: string } {
  if (nodeType.includes("webhook") || nodeType.includes("scheduleTrigger") || nodeType.includes("manualTrigger"))
    return { bg: "bg-green-500/10", border: "border-green-500/40", label: "Trigger", category: "trigger" };
  if (nodeType.includes("langchain.agent") || nodeType.includes("chainLlm"))
    return { bg: "bg-purple-500/10", border: "border-purple-500/40", label: "AI Agent", category: "ai" };
  if (nodeType.includes("langchain") || nodeType.includes("openAi") || nodeType.includes("Anthropic") || nodeType.includes("embeddings") || nodeType.includes("vector"))
    return { bg: "bg-violet-500/10", border: "border-violet-500/40", label: "LLM", category: "ai" };
  if (nodeType.includes("if") || nodeType.includes("switch") || nodeType.includes("filter") || nodeType.includes("merge"))
    return { bg: "bg-yellow-500/10", border: "border-yellow-500/40", label: "Logic", category: "logic" };
  if (nodeType.includes("httpRequest") || nodeType.includes("respondToWebhook"))
    return { bg: "bg-blue-500/10", border: "border-blue-500/40", label: "HTTP", category: "http" };
  if (nodeType.includes("postgres") || nodeType.includes("mysql") || nodeType.includes("mongo") || nodeType.includes("redis"))
    return { bg: "bg-orange-500/10", border: "border-orange-500/40", label: "Database", category: "db" };
  if (nodeType.includes("email") || nodeType.includes("slack") || nodeType.includes("teams") || nodeType.includes("twilio"))
    return { bg: "bg-pink-500/10", border: "border-pink-500/40", label: "Notify", category: "comms" };
  if (nodeType.includes("salesforce") || nodeType.includes("hubspot") || nodeType.includes("airtable"))
    return { bg: "bg-cyan-500/10", border: "border-cyan-500/40", label: "CRM", category: "crm" };
  if (nodeType.includes("code") || nodeType.includes("set") || nodeType.includes("itemLists"))
    return { bg: "bg-slate-500/10", border: "border-slate-500/40", label: "Data", category: "data" };
  return { bg: "bg-muted", border: "border-border", label: "Node", category: "other" };
}

/** Generate importable n8n workflow JSON from use-case data */
function buildN8nJson(wf: UseCase["n8n_workflow"], useCaseName: string): object {
  const GRID_X = 250;
  const GRID_Y_START = 300;
  const GRID_Y_STEP = 180;

  const nodes = wf.nodes.map((node, i) => ({
    id: `node_${i + 1}`,
    name: node.name || `Step ${node.step}`,
    type: node.node_type,
    typeVersion: 1,
    position: [GRID_X, GRID_Y_START + i * GRID_Y_STEP],
    parameters: node.parameters ?? {},
    notes: node.description,
  }));

  const connections: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }> = {};
  if (wf.connections && wf.connections.length > 0) {
    for (const conn of wf.connections) {
      if (!connections[conn.from]) connections[conn.from] = { main: [[]] };
      connections[conn.from].main[0].push({ node: conn.to, type: "main", index: 0 });
    }
  } else {
    nodes.slice(0, -1).forEach((n, i) => {
      connections[n.name] = { main: [[{ node: nodes[i + 1].name, type: "main", index: 0 }]] };
    });
  }

  return {
    name: wf.workflow_name || useCaseName,
    nodes,
    connections,
    active: false,
    settings: { executionOrder: "v1" },
    meta: {
      instanceId: "ai-governance-tower",
      templateCredsSetupCompleted: true,
    },
  };
}

/** Download a JSON object as a .json file */
function downloadJson(obj: object, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Use Case Card ─────────────────────────────────────────────────────────────
function UseCaseCard({ uc, index }: { uc: UseCase; index: number }) {
  const [tab, setTab] = useState<"overview" | "agents" | "workflow" | "plan" | "arch">("overview");
  const tabs = [
    { id: "overview", label: "Overview", icon: Target },
    { id: "agents",   label: "AI Agents", icon: Bot },
    { id: "workflow", label: "n8n Workflow", icon: Workflow },
    { id: "plan",     label: "Implementation", icon: Clock },
    { id: "arch",     label: "Architecture", icon: Network },
  ] as const;

  return (
    <Card className="border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-primary/5 px-6 py-4 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-foreground leading-tight">{uc.use_case_name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{uc.business_problem}</p>
        </div>
      </div>

      {/* Priority Score badge */}
      {uc.priority_score !== undefined && (
        <div className="flex items-center gap-3 px-6 py-3 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Priority Score:</span>
            <span className={cn(
              "text-2xl font-bold tabular-nums",
              uc.priority_score >= 80 ? "text-green-400" :
              uc.priority_score >= 60 ? "text-yellow-400" :
              uc.priority_score >= 40 ? "text-orange-400" : "text-red-400"
            )}>{uc.priority_score}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
          {uc.priority_tier && (
            <Badge variant="outline" className={cn(
              "text-xs",
              uc.priority_score >= 80 ? "border-green-500/40 text-green-400" :
              uc.priority_score >= 60 ? "border-yellow-500/40 text-yellow-400" :
              "border-orange-500/40 text-orange-400"
            )}>{uc.priority_tier}</Badge>
          )}
          {uc.score_breakdown?.rationale && (
            <span className="text-xs text-muted-foreground ml-auto hidden md:block">{uc.score_breakdown.rationale}</span>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-border bg-muted/30 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2",
              tab === id
                ? "border-primary text-primary bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <CardContent className="p-6">
        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Solution</p>
                <p className="text-sm text-foreground leading-relaxed">{uc.ai_solution}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-green-400" /> Expected Business Impact
                </p>
                <p className="text-sm text-foreground leading-relaxed">{uc.expected_business_impact}</p>
              </div>
            </div>

            {/* Score breakdown mini-table */}
            {uc.score_breakdown && (
              <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2 bg-muted/40 border-b border-border">
                  Priority Score Breakdown
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-border">
                  {[
                    { key: "business_impact", label: "Business Impact", val: uc.score_breakdown.business_impact },
                    { key: "data_readiness", label: "Data Readiness", val: uc.score_breakdown.data_readiness },
                    { key: "decision_complexity", label: "Decision Complexity", val: uc.score_breakdown.decision_complexity },
                    { key: "monetization", label: "Monetization", val: uc.score_breakdown.monetization },
                    { key: "tech_feasibility", label: "Tech Feasibility", val: uc.score_breakdown.tech_feasibility },
                    { key: "risk_compliance", label: "Risk & Compliance", val: uc.score_breakdown.risk_compliance },
                    { key: "org_readiness", label: "Org Readiness", val: uc.score_breakdown.org_readiness },
                  ].map(({ key, label, val }) => (
                    <div key={key} className="px-3 py-2 text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
                      <p className={cn(
                        "text-lg font-bold tabular-nums",
                        val >= 4 ? "text-green-400" : val >= 3 ? "text-yellow-400" : "text-orange-400"
                      )}>{val}<span className="text-xs text-muted-foreground font-normal">/5</span></p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Decision Flow</p>
              <p className="text-sm text-foreground leading-relaxed">{uc.agentic_ai_design.decision_flow}</p>
            </div>
          </div>
        )}

        {tab === "agents" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{(uc.agentic_ai_design?.agents ?? []).length} autonomous agents in this workflow</p>
            {(uc.agentic_ai_design?.agents ?? []).map((agent, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{agent.agent_name}</span>
                  <Badge variant="outline" className="text-xs ml-auto">{agent.role}</Badge>
                </div>
                <ul className="space-y-1 pl-6">
                  {(agent.responsibilities ?? []).map((r, j) => (
                    <li key={j} className="text-sm text-muted-foreground flex items-start gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/60" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {tab === "workflow" && (
          <div className="space-y-5">
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Workflow: </span>
                  <span className="font-semibold text-foreground">{uc.n8n_workflow.workflow_name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Trigger: </span>
                  <Badge variant="secondary" className="text-xs">{uc.n8n_workflow.trigger}</Badge>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0"
                onClick={() =>
                  downloadJson(
                    buildN8nJson(uc.n8n_workflow, uc.use_case_name),
                    `${uc.use_case_name.replace(/\s+/g, "_")}_n8n_workflow.json`
                  )
                }
              >
                <Download className="h-3.5 w-3.5" />
                Download n8n JSON
              </Button>
            </div>

            {/* Visual flowchart */}
            <div className="overflow-x-auto pb-4">
              <div className="flex items-start gap-0 min-w-max py-2">
                {(Array.isArray(uc.n8n_workflow?.nodes) ? uc.n8n_workflow.nodes : []).map((node, i) => {
                  const style = nodeStyle(node.node_type ?? "");
                  const CategoryIcon =
                    style.category === "trigger" ? Play
                    : style.category === "ai"      ? Bot
                    : style.category === "logic"   ? GitBranch
                    : style.category === "http"    ? Globe
                    : style.category === "db"      ? Database
                    : style.category === "comms"   ? Mail
                    : style.category === "crm"     ? Link2
                    : Braces;
                  const isLast = i === (Array.isArray(uc.n8n_workflow?.nodes) ? uc.n8n_workflow.nodes.length : 0) - 1;
                  const paramKeys = Object.keys(node.parameters ?? {});
                  return (
                    <div key={i} className="flex items-start gap-0">
                      <div className={cn("rounded-xl border p-4 w-52 shrink-0 space-y-2", style.bg, style.border)}>
                        <div className="flex items-center gap-2">
                          <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", style.bg, style.border, "border")}>
                            <CategoryIcon className="h-3 w-3 text-foreground" />
                          </div>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-0 font-mono", style.border)}>
                            {style.label}
                          </Badge>
                          <span className="ml-auto text-[10px] text-muted-foreground font-mono">#{node.step}</span>
                        </div>
                        <p className="text-xs font-bold text-foreground leading-tight">
                          {node.name || `Step ${node.step}`}
                        </p>
                        <div className="font-mono text-[9px] text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded border border-border truncate">
                          {node.node_type}
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-snug line-clamp-3">
                          {node.description}
                        </p>
                        {paramKeys.length > 0 && (
                          <div className="pt-1 border-t border-border space-y-1">
                            {paramKeys.slice(0, 3).map((k) => (
                              <div key={k} className="flex flex-col">
                                <span className="text-[9px] font-mono text-muted-foreground">{k}</span>
                                <span className="text-[9px] text-foreground truncate">{String((node.parameters ?? {})[k]).slice(0, 35)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {!isLast && (
                        <div className="flex items-center self-center shrink-0 mx-1">
                          <div className="w-5 h-px bg-border" />
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground -ml-1" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
              {[
                { cat: "trigger", Icon: Play,       label: "Trigger" },
                { cat: "ai",      Icon: Bot,        label: "AI / LLM" },
                { cat: "logic",   Icon: GitBranch,  label: "Logic" },
                { cat: "http",    Icon: Globe,      label: "HTTP" },
                { cat: "db",      Icon: Database,   label: "Database" },
                { cat: "comms",   Icon: Mail,       label: "Comms" },
                { cat: "data",    Icon: Braces,     label: "Data" },
              ].map(({ cat, Icon, label }) => {
                const s = nodeStyle(cat === "trigger" ? "webhook" : cat === "ai" ? "langchain.agent" : cat === "logic" ? ".if" : cat === "http" ? "httpRequest" : cat === "db" ? "postgres" : cat === "comms" ? "email" : "code");
                return (
                  <div key={cat} className="flex items-center gap-1.5 text-xs">
                    <div className={cn("p-1 rounded", s.bg)}>
                      <Icon className="h-3 w-3 text-foreground" />
                    </div>
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>

            {/* Integrations */}
            {(uc.n8n_workflow?.integrations ?? []).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Integrations</p>
                <div className="flex flex-wrap gap-1.5">
                  {(uc.n8n_workflow?.integrations ?? []).map((intg, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      {intg}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Workflow summary */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Workflow Summary</p>
              <p className="text-sm text-foreground leading-relaxed">{uc.n8n_workflow.workflow_summary}</p>
            </div>
          </div>
        )}

        {tab === "plan" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">Total Timeline: {uc.implementation_plan.timeline_weeks}</span>
            </div>
            <div className="space-y-3">
              {(uc.implementation_plan?.phases ?? []).map((phase, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</div>
                      <span className="font-semibold text-sm">{phase.phase_name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{phase.duration}</Badge>
                  </div>
                  <ul className="space-y-1 pl-4">
                    {(phase.activities ?? []).map((act, j) => (
                      <li key={j} className="text-sm text-muted-foreground flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-400" />
                        {act}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "arch" && (() => {
          const arch = uc.integration_architecture ?? {};
          const systems = Array.isArray(arch.systems_involved) ? arch.systems_involved : [];
          const apis = Array.isArray(arch.api_requirements) ? arch.api_requirements : [];
          const dataFlow = typeof arch.data_flow === "string" ? arch.data_flow : "";

          return (
            <div className="space-y-5">
              {systems.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Network className="h-3.5 w-3.5" /> System Architecture
                  </p>
                  <div className="overflow-x-auto pb-2">
                    <div className="flex items-center gap-0 min-w-max py-2">
                      {systems.map((sys: string, i: number) => (
                        <div key={i} className="flex items-center gap-0">
                          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 w-36 shrink-0 text-center">
                            <div className="flex justify-center mb-1.5">
                              <div className="p-1.5 rounded-lg bg-primary/10">
                                <Cpu className="h-4 w-4 text-primary" />
                              </div>
                            </div>
                            <p className="text-xs font-semibold text-foreground leading-tight">{sys}</p>
                          </div>
                          {i < systems.length - 1 && (
                            <div className="flex items-center shrink-0 mx-1">
                              <div className="w-5 h-px bg-border" />
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground -ml-1" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {dataFlow && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" /> Data Flow
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{dataFlow}</p>
                </div>
              )}

              {apis.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> API Requirements
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {apis.map((api: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-sm font-mono text-foreground">{api}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {systems.length === 0 && !dataFlow && apis.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Architecture details were not generated for this use case.
                </p>
              )}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}

// ── Industry Metrics Fields ───────────────────────────────────────────────────
function IndustryMetricsSection({
  industry,
  industryMetrics,
  setIndustryMetrics,
}: {
  industry: string;
  industryMetrics: Record<string, string>;
  setIndustryMetrics: (m: Record<string, string>) => void;
}) {
  const setField = (key: string, val: string) =>
    setIndustryMetrics({ ...industryMetrics, [key]: val });

  const isBFSI = industry.toLowerCase().includes("bank") || industry.toLowerCase().includes("financial");
  const isInsurance = industry.toLowerCase().includes("insurance");
  const isHealthcare = industry.toLowerCase().includes("health");
  const isRetail = industry.toLowerCase().includes("retail") || industry.toLowerCase().includes("e-commerce");
  const isManufacturing = industry.toLowerCase().includes("manufactur");
  const isHospitality = industry.toLowerCase().includes("hospital");
  const isTelecom = industry.toLowerCase().includes("telecom");
  const isEducation = industry.toLowerCase().includes("education");
  const isLogistics = industry.toLowerCase().includes("logistic") || industry.toLowerCase().includes("supply");

  let fields: { key: string; label: string; placeholder: string }[] = [];

  if (isBFSI) {
    fields = [
      { key: "fraudRate", label: "Fraud Rate (%)", placeholder: "e.g. 0.8%" },
      { key: "nplRate", label: "Non-Performing Loan (NPL) Rate (%)", placeholder: "e.g. 3.2%" },
      { key: "defaultRate", label: "Default Rate (%)", placeholder: "e.g. 1.5%" },
      { key: "regulatoryClassification", label: "Regulatory Classification", placeholder: "e.g. RBI Category-A NBFC" },
    ];
  } else if (isInsurance) {
    fields = [
      { key: "claimsProcessingTime", label: "Claims Processing Time", placeholder: "e.g. 14 days" },
      { key: "lossRatio", label: "Loss Ratio (%)", placeholder: "e.g. 62%" },
      { key: "policyRenewalRate", label: "Policy Renewal Rate (%)", placeholder: "e.g. 75%" },
    ];
  } else if (isHealthcare) {
    fields = [
      { key: "patientWaitTime", label: "Patient Wait Time (minutes)", placeholder: "e.g. 45 min" },
      { key: "bedOccupancy", label: "Bed Occupancy (%)", placeholder: "e.g. 82%" },
      { key: "diagnosticAccuracy", label: "Diagnostic Accuracy (%)", placeholder: "e.g. 91%" },
    ];
  } else if (isRetail) {
    fields = [
      { key: "cartAbandonmentRate", label: "Cart Abandonment Rate (%)", placeholder: "e.g. 68%" },
      { key: "skuCount", label: "SKU Count", placeholder: "e.g. 12,000 SKUs" },
      { key: "monthlyOrders", label: "Monthly Orders", placeholder: "e.g. 80,000" },
    ];
  } else if (isManufacturing) {
    fields = [
      { key: "equipmentDowntime", label: "Equipment Downtime (%)", placeholder: "e.g. 12%" },
      { key: "defectRate", label: "Defect Rate (%)", placeholder: "e.g. 2.3%" },
      { key: "oee", label: "OEE (%)", placeholder: "e.g. 74%" },
    ];
  } else if (isHospitality) {
    fields = [
      { key: "occupancyRate", label: "Occupancy Rate (%)", placeholder: "e.g. 71%" },
      { key: "revpar", label: "RevPAR (₹)", placeholder: "e.g. ₹4,200" },
      { key: "adr", label: "Average Daily Rate (₹)", placeholder: "e.g. ₹6,500" },
      { key: "guestNps", label: "Guest NPS", placeholder: "e.g. 52" },
    ];
  } else if (isTelecom) {
    fields = [
      { key: "churnRate", label: "Churn Rate (%)", placeholder: "e.g. 2.1% monthly" },
      { key: "arpu", label: "ARPU (₹)", placeholder: "e.g. ₹280" },
      { key: "npsScore", label: "NPS Score", placeholder: "e.g. 38" },
    ];
  } else if (isEducation) {
    fields = [
      { key: "studentRetentionRate", label: "Student Retention Rate (%)", placeholder: "e.g. 85%" },
      { key: "courseCompletionRate", label: "Course Completion (%)", placeholder: "e.g. 63%" },
      { key: "dropoutRate", label: "Dropout Rate (%)", placeholder: "e.g. 15%" },
    ];
  } else if (isLogistics) {
    fields = [
      { key: "onTimeDelivery", label: "On-Time Delivery (%)", placeholder: "e.g. 87%" },
      { key: "shipmentVolume", label: "Shipment Volume/month", placeholder: "e.g. 50,000 shipments" },
      { key: "costPerDelivery", label: "Cost per Delivery (₹)", placeholder: "e.g. ₹85" },
    ];
  }

  if (fields.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <Label className="text-sm font-semibold">
          {industry} — Industry KPIs
          <span className="text-muted-foreground font-normal ml-1">(helps AI generate precise benchmarks)</span>
        </Label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input
              placeholder={placeholder}
              value={industryMetrics[key] ?? ""}
              onChange={(e) => setField(key, e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AIMaturityPage() {
  const { addNotification } = useUIStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UseCase[] | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  // Core
  const [orgProfile, setOrgProfile] = useState("");
  const [industry, setIndustry] = useState("");

  // Step 1: Business Context
  const [primaryObjective, setPrimaryObjective] = useState("");
  const [targetKPI, setTargetKPI] = useState("");
  const [kpiBaseline, setKpiBaseline] = useState("");
  const [kpiTarget, setKpiTarget] = useState("");
  const [timeHorizon, setTimeHorizon] = useState("3-6 months");

  // Step 2: Process & Decisions
  const [valueChainStage, setValueChainStage] = useState("");
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [processType, setProcessType] = useState("");
  const [keyDecisions, setKeyDecisions] = useState<string[]>([]);
  const [decisionFrequency, setDecisionFrequency] = useState("");
  const [isDecisionSubjective, setIsDecisionSubjective] = useState(false);

  // Step 3: Data Readiness
  const [dataAvailability, setDataAvailability] = useState<string[]>([]);
  const [dataVolume, setDataVolume] = useState("");
  const [dataQuality, setDataQuality] = useState("");
  const [dataFreshness, setDataFreshness] = useState("");
  const [dataAccess, setDataAccess] = useState("");
  const [dataSources, setDataSources] = useState<string[]>([]);

  // Step 4: Customer & Monetization
  const [customerTouchpoints, setCustomerTouchpoints] = useState<string[]>([]);
  const [journeyStage, setJourneyStage] = useState("");
  const [personalizationRequired, setPersonalizationRequired] = useState(false);
  const [revenueLevers, setRevenueLevers] = useState<string[]>([]);
  const [estimatedRevenueImpact, setEstimatedRevenueImpact] = useState("");
  const [estimatedCostSaving, setEstimatedCostSaving] = useState("");
  const [transactionVolume, setTransactionVolume] = useState("");

  // Step 5: Technology, Governance & Business Goals
  const [existingSystems, setExistingSystems] = useState<string[]>([]);
  const [integrationComplexity, setIntegrationComplexity] = useState("");
  const [cloudReadiness, setCloudReadiness] = useState("");
  const [regulatoryImpact, setRegulatoryImpact] = useState("");
  const [explainabilityRequired, setExplainabilityRequired] = useState(false);
  const [biasRisk, setBiasRisk] = useState("");
  const [skillAvailability, setSkillAvailability] = useState<string[]>([]);
  const [changeImpact, setChangeImpact] = useState("");
  const [industryMetrics, setIndustryMetrics] = useState<Record<string, string>>({});
  const [businessGoals, setBusinessGoals] = useState<string[]>([]);

  const toggleArr = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const canGoNext = useCallback(() => {
    if (step === 1) return orgProfile.trim().length >= 20 && !!industry && !!primaryObjective;
    if (step === 2) return painPoints.length >= 1 && !!valueChainStage;
    if (step === 3) return true;
    if (step === 4) return true;
    if (step === 5) return businessGoals.length >= 1;
    return true;
  }, [step, orgProfile, industry, primaryObjective, painPoints, valueChainStage, businessGoals]);

  async function handleSubmit() {
    setLoading(true);
    try {
      let token = "";
      try {
        const raw = localStorage.getItem("ai-governance-auth");
        token = raw ? (JSON.parse(raw)?.state?.token ?? "") : "";
      } catch { token = ""; }
      const res = await fetch("/api/maturity-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          organizationProfile: orgProfile,
          industry,
          primaryObjective,
          targetKPI,
          kpiBaseline,
          kpiTarget,
          timeHorizon,
          valueChainStage,
          painPoints,
          processType,
          keyDecisions,
          decisionFrequency,
          isDecisionSubjective,
          dataAvailability,
          dataVolume,
          dataQuality,
          dataFreshness,
          dataAccess,
          dataSources,
          customerTouchpoints,
          journeyStage,
          personalizationRequired,
          revenueLevers,
          estimatedRevenueImpact,
          estimatedCostSaving,
          transactionVolume,
          existingSystems,
          integrationComplexity,
          cloudReadiness,
          regulatoryImpact,
          explainabilityRequired,
          biasRisk,
          skillAvailability,
          changeImpact,
          industryMetrics,
          businessGoals,
          // Legacy compatibility
          functions: [],
          maturityScore: 2,
        }),
      });
      let json: { success: boolean; error?: string; data?: { id: string; status: string; useCases: UseCase[] } };
      try {
        json = await res.json();
      } catch {
        addNotification({ type: "error", title: "Server error", message: `HTTP ${res.status} — server returned a non-JSON response. Check Vercel logs.` });
        return;
      }
      if (!res.ok || !json.success) {
        addNotification({ type: "error", title: "Generation failed", message: json.error ?? `HTTP ${res.status}` });
        return;
      }
      const data = json.data;
      if (!data) {
        addNotification({ type: "error", title: "Unexpected response", message: "Server returned success but no data. Please try again." });
        return;
      }
      const useCases = Array.isArray(data.useCases) ? data.useCases as UseCase[] : [];
      setResult(useCases);
      setAssessmentId(data.id);
      setStep(6);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error — please try again";
      addNotification({ type: "error", title: "Error", message: msg });
    } finally {
      setLoading(false);
    }
  }

  const totalSteps = 5;
  const progress = Math.min(((step - 1) / totalSteps) * 100, 100);

  const stepLabels = [
    "Business Context",
    "Process & Decisions",
    "Data Readiness",
    "Customer & Monetization",
    "Technology & Governance",
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Use Case Finder
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Deep-discovery framework to surface your highest-priority, production-ready AI use case
          </p>
        </div>
        {result && (
          <Button variant="outline" onClick={() => { setStep(1); setResult(null); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            New Assessment
          </Button>
        )}
      </div>

      {/* Results */}
      {step === 6 && result && (
        <div className="space-y-6">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Sparkles className="h-8 w-8 text-primary shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {result.length} High-Impact AI Use {result.length === 1 ? "Case" : "Cases"} Generated
              </p>
              <p className="text-sm text-muted-foreground">
                For {industry} · {primaryObjective} · {timeHorizon}
              </p>
            </div>
            {assessmentId && (
              <Badge variant="outline" className="text-xs font-mono shrink-0">
                ID: {assessmentId.slice(0, 8)}
              </Badge>
            )}
          </div>
          {result.map((uc, i) => <UseCaseCard key={i} uc={uc} index={i} />)}
        </div>
      )}

      {/* Multi-step form */}
      {step < 6 && (
        <Card>
          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span>Step {step} of {totalSteps}</span>
              <span>·</span>
              <span>{stepLabels[step - 1]}</span>
            </div>
            <CardTitle className="text-xl">
              {step === 1 && "Business Context & Objectives"}
              {step === 2 && "Process & Decision Intelligence"}
              {step === 3 && "Data Readiness Assessment"}
              {step === 4 && "Customer & Monetization Potential"}
              {step === 5 && "Technology, Governance & Business Goals"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Define the specific business problem and KPIs — this drives the AI's prioritization engine."}
              {step === 2 && "Map the process, pain points and decisions where AI can intervene."}
              {step === 3 && "Assess data availability and quality — the AI scores your readiness to deploy."}
              {step === 4 && "Quantify revenue and cost impact so the use case has a clear business case."}
              {step === 5 && "Capture technology landscape, governance constraints, and define your AI objectives."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* ── Step 1: Business Context ──────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Industry */}
                <div className="space-y-2">
                  <Label>
                    <Building2 className="h-4 w-4 inline mr-1" />
                    Industry *
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {INDUSTRIES.map((ind) => (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => setIndustry(ind)}
                        className={cn(
                          "text-left text-sm px-3 py-2 rounded-lg border transition-colors",
                          industry === ind
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                  {!INDUSTRIES.includes(industry) && (
                    <Input
                      placeholder="Or type your industry..."
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    />
                  )}
                </div>

                {/* Org Profile */}
                <div className="space-y-2">
                  <Label htmlFor="orgProfile">
                    Organization Profile *
                    <span className="text-muted-foreground font-normal ml-1">(min 20 characters)</span>
                  </Label>
                  <Textarea
                    id="orgProfile"
                    rows={4}
                    placeholder="Describe your organization — size, what you do, key products/services, geographies, number of employees, annual revenue range, key challenges..."
                    value={orgProfile}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOrgProfile(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground text-right">{orgProfile.length} chars</p>
                </div>

                {/* Primary Objective */}
                <div className="space-y-2">
                  <Label>Primary AI Objective *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { label: "Revenue Increase", desc: "Grow top-line through upsell, cross-sell, or new products" },
                      { label: "Cost Reduction", desc: "Automate manual work and eliminate operational waste" },
                      { label: "Risk Mitigation", desc: "Detect fraud, defaults, compliance gaps earlier" },
                      { label: "CX Improvement", desc: "Personalize and accelerate the customer experience" },
                    ].map(({ label, desc }) => (
                      <OptionCard
                        key={label}
                        label={label}
                        desc={desc}
                        selected={primaryObjective === label}
                        onClick={() => setPrimaryObjective(label)}
                      />
                    ))}
                  </div>
                </div>

                {/* Target KPI */}
                <div className="space-y-2">
                  <Label htmlFor="targetKPI">
                    Target KPI
                    <span className="text-muted-foreground font-normal ml-1">(e.g. "Reduce loan approval time")</span>
                  </Label>
                  <Input
                    id="targetKPI"
                    placeholder="What specific metric do you want to move?"
                    value={targetKPI}
                    onChange={(e) => setTargetKPI(e.target.value)}
                  />
                </div>

                {/* KPI Baseline + Target */}
                <div className="space-y-2">
                  <Label>KPI Baseline → Target</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Current value (baseline)</p>
                      <Input
                        placeholder="e.g. 5 days"
                        value={kpiBaseline}
                        onChange={(e) => setKpiBaseline(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Target value (goal)</p>
                      <Input
                        placeholder="e.g. 1 day"
                        value={kpiTarget}
                        onChange={(e) => setKpiTarget(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Time Horizon */}
                <div className="space-y-2">
                  <Label>Time Horizon</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["0-3 months", "3-6 months", "6-12 months"].map((t) => (
                      <OptionCard
                        key={t}
                        label={t}
                        selected={timeHorizon === t}
                        onClick={() => setTimeHorizon(t)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Process & Decisions ───────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Value Chain Stage */}
                <div className="space-y-2">
                  <Label>Value Chain Stage *</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Acquisition", "Onboarding", "Operations", "Support", "Retention"].map((s) => (
                      <MultiChip
                        key={s}
                        label={s}
                        selected={valueChainStage === s}
                        onClick={() => setValueChainStage(s)}
                      />
                    ))}
                  </div>
                </div>

                {/* Pain Points */}
                <div className="space-y-2">
                  <Label>
                    Current Pain Points *
                    <span className="text-muted-foreground font-normal ml-1">(select all that apply)</span>
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      "High manual effort",
                      "Low conversion",
                      "Delays & SLA breaches",
                      "Errors & inconsistencies",
                      "High cost",
                      "Poor customer experience",
                    ].map((p) => (
                      <MultiChip
                        key={p}
                        label={p}
                        selected={painPoints.includes(p)}
                        onClick={() => toggleArr(painPoints, setPainPoints, p)}
                      />
                    ))}
                  </div>
                </div>

                {/* Process Type */}
                <div className="space-y-2">
                  <Label>Current Process Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Manual", desc: "Humans do everything" },
                      { label: "Rule-based", desc: "Automated with rigid rules" },
                      { label: "Semi-automated", desc: "Mix of rules + human judgment" },
                    ].map(({ label, desc }) => (
                      <OptionCard
                        key={label}
                        label={label}
                        desc={desc}
                        selected={processType === label}
                        onClick={() => setProcessType(label)}
                      />
                    ))}
                  </div>
                </div>

                {/* Key Decisions */}
                <div className="space-y-2">
                  <Label>Key Decisions Involved</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {["Pricing", "Approval", "Recommendation", "Routing", "Forecasting", "Risk Assessment"].map((d) => (
                      <MultiChip
                        key={d}
                        label={d}
                        selected={keyDecisions.includes(d)}
                        onClick={() => toggleArr(keyDecisions, setKeyDecisions, d)}
                      />
                    ))}
                  </div>
                </div>

                {/* Decision Frequency */}
                <div className="space-y-2">
                  <Label>Decision Frequency</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Per transaction", desc: "Real-time / event-driven" },
                      { label: "Daily batch", desc: "End-of-day processing" },
                      { label: "Weekly/Monthly", desc: "Periodic reviews" },
                    ].map(({ label, desc }) => (
                      <OptionCard
                        key={label}
                        label={label}
                        desc={desc}
                        selected={decisionFrequency === label}
                        onClick={() => setDecisionFrequency(label)}
                      />
                    ))}
                  </div>
                </div>

                {/* Subjective decision toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">Is this decision subjective?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Human judgment is currently required to make this call</p>
                  </div>
                  <div className="flex gap-2">
                    {[{ label: "Yes", val: true }, { label: "No", val: false }].map(({ label, val }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setIsDecisionSubjective(val)}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                          isDecisionSubjective === val
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Data Readiness ────────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-6">
                {/* Data Availability */}
                <div className="space-y-2">
                  <Label>Data Availability Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Structured (DB/CSV)",
                      "Unstructured (text, voice, image)",
                      "Behavioral (clickstream, logs)",
                    ].map((d) => (
                      <MultiChip
                        key={d}
                        label={d}
                        selected={dataAvailability.includes(d)}
                        onClick={() => toggleArr(dataAvailability, setDataAvailability, d)}
                      />
                    ))}
                  </div>
                </div>

                {/* Data Volume */}
                <div className="space-y-2">
                  <Label>Data Volume</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Low", desc: "<10k records" },
                      { label: "Medium", desc: "10k – 1M records" },
                      { label: "High", desc: ">1M records" },
                    ].map(({ label, desc }) => (
                      <OptionCard
                        key={label}
                        label={label}
                        desc={desc}
                        selected={dataVolume === label}
                        onClick={() => setDataVolume(label)}
                      />
                    ))}
                  </div>
                </div>

                {/* Data Quality */}
                <div className="space-y-2">
                  <Label>Data Quality</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Poor", desc: "Many gaps & errors" },
                      { label: "Moderate", desc: "Usable with cleanup" },
                      { label: "High", desc: "Clean & labelled" },
                    ].map(({ label, desc }) => (
                      <OptionCard
                        key={label}
                        label={label}
                        desc={desc}
                        selected={dataQuality === label}
                        onClick={() => setDataQuality(label)}
                      />
                    ))}
                  </div>
                </div>

                {/* Data Freshness */}
                <div className="space-y-2">
                  <Label>Data Freshness</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Batch", desc: "Daily / weekly" },
                      { label: "Near real-time", desc: "<5 min latency" },
                      { label: "Real-time streaming", desc: "Sub-second" },
                    ].map(({ label, desc }) => (
                      <OptionCard
                        key={label}
                        label={label}
                        desc={desc}
                        selected={dataFreshness === label}
                        onClick={() => setDataFreshness(label)}
                      />
                    ))}
                  </div>
                </div>

                {/* Data Access */}
                <div className="space-y-2">
                  <Label>Data Access Level</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Siloed", desc: "Manual extracts required" },
                      { label: "Partially integrated", desc: "Some pipelines exist" },
                      { label: "Fully accessible", desc: "APIs available" },
                    ].map(({ label, desc }) => (
                      <OptionCard
                        key={label}
                        label={label}
                        desc={desc}
                        selected={dataAccess === label}
                        onClick={() => setDataAccess(label)}
                      />
                    ))}
                  </div>
                </div>

                {/* Data Sources */}
                <TagInput
                  label="Known Data Sources (optional)"
                  placeholder="e.g. Loan Origination System, CRM..."
                  tags={dataSources}
                  setTags={setDataSources}
                  suggestions={[
                    "CRM Data", "ERP Data", "Transaction Logs", "Customer Feedback",
                    "IoT Sensors", "Social Media", "Email", "Documents & PDFs",
                    "API Data", "Database Records", "Excel/CSV Files", "Web Analytics",
                  ]}
                />
              </div>
            )}

            {/* ── Step 4: Customer & Monetization ──────────────────────────── */}
            {step === 4 && (
              <div className="space-y-6">
                {/* Customer Touchpoints */}
                <div className="space-y-2">
                  <Label>Customer Touchpoints</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Mobile App", "Web Portal", "Call Center", "Field Agent", "Physical Branch"].map((t) => (
                      <MultiChip
                        key={t}
                        label={t}
                        selected={customerTouchpoints.includes(t)}
                        onClick={() => toggleArr(customerTouchpoints, setCustomerTouchpoints, t)}
                      />
                    ))}
                  </div>
                </div>

                {/* Customer Journey Stage */}
                <div className="space-y-2">
                  <Label>Customer Journey Stage</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Awareness", "Consideration", "Purchase", "Usage", "Loyalty"].map((s) => (
                      <MultiChip
                        key={s}
                        label={s}
                        selected={journeyStage === s}
                        onClick={() => setJourneyStage(s)}
                      />
                    ))}
                  </div>
                </div>

                {/* Personalization toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">Personalization Required?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Does the solution need to tailor output per individual customer?</p>
                  </div>
                  <div className="flex gap-2">
                    {[{ label: "Yes", val: true }, { label: "No", val: false }].map(({ label, val }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setPersonalizationRequired(val)}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                          personalizationRequired === val
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Revenue Levers */}
                <div className="space-y-2">
                  <Label>Revenue Levers</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Upsell", "Cross-sell", "Pricing Optimization", "New Product/Subscription"].map((l) => (
                      <MultiChip
                        key={l}
                        label={l}
                        selected={revenueLevers.includes(l)}
                        onClick={() => toggleArr(revenueLevers, setRevenueLevers, l)}
                      />
                    ))}
                  </div>
                </div>

                {/* Financial estimates */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Estimated Revenue Impact</Label>
                    <div className="relative">
                      <Input
                        placeholder="e.g. 15"
                        value={estimatedRevenueImpact}
                        onChange={(e) => setEstimatedRevenueImpact(e.target.value)}
                        className="pr-7"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Estimated Cost Saving</Label>
                    <div className="relative">
                      <Input
                        placeholder="e.g. 30"
                        value={estimatedCostSaving}
                        onChange={(e) => setEstimatedCostSaving(e.target.value)}
                        className="pr-7"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Monthly Transaction Volume</Label>
                    <Input
                      placeholder="e.g. 50,000 transactions"
                      value={transactionVolume}
                      onChange={(e) => setTransactionVolume(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 5: Technology, Governance & Business Goals ───────────── */}
            {step === 5 && (
              <div className="space-y-6">
                {/* Industry-specific KPIs */}
                <IndustryMetricsSection
                  industry={industry}
                  industryMetrics={industryMetrics}
                  setIndustryMetrics={setIndustryMetrics}
                />

                {/* Integration Complexity */}
                <div className="space-y-2">
                  <Label>Integration Complexity</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Low", desc: "Plug & play APIs" },
                      { label: "Medium", desc: "Some custom work" },
                      { label: "High", desc: "Major integration effort" },
                    ].map(({ label, desc }) => (
                      <OptionCard
                        key={label}
                        label={label}
                        desc={desc}
                        selected={integrationComplexity === label}
                        onClick={() => setIntegrationComplexity(label)}
                      />
                    ))}
                  </div>
                </div>

                {/* Cloud Readiness */}
                <div className="space-y-2">
                  <Label>Cloud Readiness</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "On-prem", desc: "All systems on-site" },
                      { label: "Hybrid", desc: "Mix of cloud and on-prem" },
                      { label: "Cloud-native", desc: "Fully cloud deployed" },
                    ].map(({ label, desc }) => (
                      <OptionCard
                        key={label}
                        label={label}
                        desc={desc}
                        selected={cloudReadiness === label}
                        onClick={() => setCloudReadiness(label)}
                      />
                    ))}
                  </div>
                </div>

                {/* Regulatory Impact */}
                <div className="space-y-2">
                  <Label>
                    <ShieldCheck className="h-4 w-4 inline mr-1" />
                    Regulatory Impact
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "None", desc: "No regulatory constraints" },
                      { label: "Moderate", desc: "Partial compliance needed" },
                      { label: "High", desc: "DPDP / GDPR / Basel / HIPAA" },
                    ].map(({ label, desc }) => (
                      <OptionCard
                        key={label}
                        label={label}
                        desc={desc}
                        selected={regulatoryImpact === label}
                        onClick={() => setRegulatoryImpact(label)}
                      />
                    ))}
                  </div>
                </div>

                {/* Explainability toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">Explainability Required?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Model decisions must be auditable and explainable to regulators or customers</p>
                  </div>
                  <div className="flex gap-2">
                    {[{ label: "Yes", val: true }, { label: "No", val: false }].map(({ label, val }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setExplainabilityRequired(val)}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                          explainabilityRequired === val
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bias Risk */}
                <div className="space-y-2">
                  <Label>Bias Risk</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Low", desc: "Minimal bias exposure" },
                      { label: "Medium", desc: "Monitoring required" },
                      { label: "High", desc: "Critical audit needed" },
                    ].map(({ label, desc }) => (
                      <OptionCard
                        key={label}
                        label={label}
                        desc={desc}
                        selected={biasRisk === label}
                        onClick={() => setBiasRisk(label)}
                      />
                    ))}
                  </div>
                </div>

                {/* Skill Availability */}
                <div className="space-y-2">
                  <Label>
                    <Users className="h-4 w-4 inline mr-1" />
                    Internal Skill Availability
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {["Data Science", "Data Engineering", "MLOps"].map((s) => (
                      <MultiChip
                        key={s}
                        label={s}
                        selected={skillAvailability.includes(s)}
                        onClick={() => toggleArr(skillAvailability, setSkillAvailability, s)}
                      />
                    ))}
                  </div>
                </div>

                {/* Change Management Impact */}
                <div className="space-y-2">
                  <Label>Change Management Impact</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Low", desc: "Minimal process change" },
                      { label: "Medium", desc: "Training & comms needed" },
                      { label: "High", desc: "Major org redesign" },
                    ].map(({ label, desc }) => (
                      <OptionCard
                        key={label}
                        label={label}
                        desc={desc}
                        selected={changeImpact === label}
                        onClick={() => setChangeImpact(label)}
                      />
                    ))}
                  </div>
                </div>

                {/* Existing Systems */}
                <TagInput
                  label="Existing Systems / Tools"
                  placeholder="e.g. Salesforce, SAP, Oracle..."
                  tags={existingSystems}
                  setTags={setExistingSystems}
                  suggestions={COMMON_SYSTEMS}
                />

                {/* Business Goals — required */}
                <TagInput
                  label="Business Goals / AI Objectives *"
                  placeholder="e.g. Reduce loan approval time by 80%..."
                  tags={businessGoals}
                  setTags={setBusinessGoals}
                  suggestions={[
                    "Reduce operational costs by 30%",
                    "Improve customer satisfaction score",
                    "Automate manual compliance processes",
                    "Reduce fraud losses",
                    "Accelerate product development cycle",
                    "Scale without adding headcount",
                    "Reduce loan processing time",
                    "Improve risk prediction accuracy",
                    "Automate customer onboarding",
                    "Reduce churn rate",
                  ]}
                />
                {businessGoals.length === 0 && (
                  <p className="text-xs text-orange-400">Add at least one business goal to continue.</p>
                )}

                {/* Review summary */}
                <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3 text-sm">
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Discovery Summary
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-muted-foreground">Industry: </span><span className="font-medium">{industry || "—"}</span></div>
                    <div><span className="text-muted-foreground">Objective: </span><span className="font-medium">{primaryObjective || "—"}</span></div>
                    <div><span className="text-muted-foreground">KPI: </span><span className="font-medium">{targetKPI ? `${kpiBaseline} → ${kpiTarget}` : "—"}</span></div>
                    <div><span className="text-muted-foreground">Timeline: </span><span className="font-medium">{timeHorizon}</span></div>
                    <div><span className="text-muted-foreground">Pain Points: </span><span className="font-medium">{painPoints.length} selected</span></div>
                    <div><span className="text-muted-foreground">Data Quality: </span><span className="font-medium">{dataQuality || "Not set"}</span></div>
                    <div><span className="text-muted-foreground">Revenue Impact: </span><span className="font-medium">{estimatedRevenueImpact ? `${estimatedRevenueImpact}%` : "—"}</span></div>
                    <div><span className="text-muted-foreground">Goals: </span><span className="font-medium">{businessGoals.length} defined</span></div>
                  </div>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3 text-sm">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Claude will generate the single highest-priority AI use case</p>
                    <p className="text-muted-foreground mt-0.5">
                      Scored across 7 dimensions — with exact KPI references, agentic design, n8n workflow, and implementation plan.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              {step < 5 ? (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canGoNext()}
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || businessGoals.length === 0}
                  className="min-w-[180px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing with Claude...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate AI Use Case
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center space-y-3">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
          <p className="font-semibold text-foreground">Claude is running the discovery analysis...</p>
          <p className="text-sm text-muted-foreground">
            Scoring across 7 dimensions and generating a hyper-specific use case with agentic design,
            n8n workflow, and implementation plan. This takes 15–30 seconds.
          </p>
        </div>
      )}
    </div>
  );
}
