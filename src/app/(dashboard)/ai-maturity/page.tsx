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
  ArrowDown,
  GitBranch,
  Globe,
  Mail,
  MessageSquare,
  Play,
  Filter,
  Braces,
  Link2,
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
];

const FUNCTIONS = [
  "Customer Service", "Sales & CRM", "Marketing", "Finance & Accounting",
  "HR & Talent", "Supply Chain", "Operations", "Risk & Compliance",
  "Legal", "IT & Infrastructure", "Product Development", "Quality Assurance",
  "Data Analytics", "Procurement", "Research & Development",
];

const MATURITY_LEVELS = [
  { score: 1, label: "Ad Hoc", desc: "No formal AI processes. Experimental only.", color: "text-red-400" },
  { score: 2, label: "Developing", desc: "Some pilots running, no governance framework.", color: "text-orange-400" },
  { score: 3, label: "Defined", desc: "AI policies exist but limited enforcement.", color: "text-yellow-400" },
  { score: 4, label: "Managed", desc: "Metrics-driven, models tracked and monitored.", color: "text-blue-400" },
  { score: 5, label: "Optimized", desc: "AI-first org with continuous improvement.", color: "text-green-400" },
];

const COMMON_DATA_SOURCES = [
  "CRM Data", "ERP Data", "Transaction Logs", "Customer Feedback",
  "IoT Sensors", "Social Media", "Email", "Documents & PDFs",
  "API Data", "Database Records", "Excel/CSV Files", "Web Analytics",
  "Sensor Data", "Financial Reports", "HR Records",
];

const COMMON_SYSTEMS = [
  "Salesforce", "SAP", "Oracle", "Microsoft 365", "ServiceNow",
  "Workday", "HubSpot", "Zendesk", "Slack", "Jira", "Power BI",
  "Tableau", "AWS", "Azure", "Google Cloud", "PostgreSQL",
  "MySQL", "MongoDB", "Snowflake", "Databricks",
];

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
      {/* Suggestion chips */}
      {suggestions && (
        <div className="flex flex-wrap gap-1 mt-1">
          {suggestions.filter((s) => !tags.includes(s)).slice(0, 10).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted hover:border-primary hover:bg-primary/10 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="flex items-center gap-1">
              {t}
              <button onClick={() => remove(t)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
            </Badge>
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

  // Build connections: sequential by default, augmented by explicit connections field
  const connections: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }> = {};
  if (wf.connections && wf.connections.length > 0) {
    // Use explicit connections from Claude
    for (const conn of wf.connections) {
      if (!connections[conn.from]) connections[conn.from] = { main: [[]] };
      connections[conn.from].main[0].push({ node: conn.to, type: "main", index: 0 });
    }
  } else {
    // Fall back to sequential
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
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Decision Flow</p>
              <p className="text-sm text-foreground leading-relaxed">{uc.agentic_ai_design.decision_flow}</p>
            </div>
          </div>
        )}

        {tab === "agents" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{uc.agentic_ai_design.agents.length} autonomous agents in this workflow</p>
            {uc.agentic_ai_design.agents.map((agent, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{agent.agent_name}</span>
                  <Badge variant="outline" className="text-xs ml-auto">{agent.role}</Badge>
                </div>
                <ul className="space-y-1 pl-6">
                  {agent.responsibilities.map((r, j) => (
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
            {/* Header row: workflow name + trigger + Download button */}
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
            <div className="flex flex-col items-stretch gap-0">
              {uc.n8n_workflow.nodes.map((node, i) => {
                const style = nodeStyle(node.node_type);
                const CategoryIcon =
                  style.category === "trigger" ? Play
                  : style.category === "ai"      ? Bot
                  : style.category === "logic"   ? GitBranch
                  : style.category === "http"    ? Globe
                  : style.category === "db"      ? Database
                  : style.category === "comms"   ? Mail
                  : style.category === "crm"     ? Link2
                  : Braces;
                return (
                  <div key={i} className="flex flex-col items-center w-full">
                    {/* Node card */}
                    <div className={cn("w-full rounded-xl border p-4 space-y-2.5", style.bg, style.border)}>
                      {/* Top row: icon + name + category badge + step */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border", style.bg, style.border)}>
                            <CategoryIcon className="h-3.5 w-3.5 text-foreground" />
                          </div>
                          <span className="font-semibold text-sm text-foreground truncate">
                            {node.name || `Step ${node.step}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className={cn("text-xs border", style.border)}>
                            {style.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                            #{node.step}
                          </span>
                        </div>
                      </div>
                      {/* node_type pill */}
                      <div className="font-mono text-xs text-muted-foreground bg-background/60 px-2 py-1 rounded border border-border break-all">
                        {node.node_type}
                      </div>
                      {/* Description */}
                      <p className="text-sm text-foreground leading-relaxed">{node.description}</p>
                      {/* Key parameters */}
                      {node.parameters && Object.keys(node.parameters).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {Object.entries(node.parameters).slice(0, 5).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-xs bg-background/80 border border-border rounded px-2 py-0.5 font-mono"
                            >
                              <span className="text-muted-foreground">{k}:</span>{" "}
                              <span className="text-foreground">{String(v).slice(0, 45)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Downward arrow connector */}
                    {i < uc.n8n_workflow.nodes.length - 1 && (
                      <div className="flex flex-col items-center py-0.5">
                        <div className="w-px h-4 bg-border" />
                        <ArrowDown className="h-4 w-4 text-muted-foreground -mt-1" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Integrations */}
            {uc.n8n_workflow.integrations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Integrations</p>
                <div className="flex flex-wrap gap-1.5">
                  {uc.n8n_workflow.integrations.map((intg, i) => (
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
              {uc.implementation_plan.phases.map((phase, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</div>
                      <span className="font-semibold text-sm">{phase.phase_name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{phase.duration}</Badge>
                  </div>
                  <ul className="space-y-1 pl-4">
                    {phase.activities.map((act, j) => (
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

        {tab === "arch" && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Systems Involved</p>
                <div className="flex flex-wrap gap-1.5">
                  {uc.integration_architecture.systems_involved.map((s, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1">
                      <Cpu className="h-3 w-3" />{s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">API Requirements</p>
                <ul className="space-y-1">
                  {uc.integration_architecture.api_requirements.map((api, i) => (
                    <li key={i} className="text-sm text-muted-foreground font-mono flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-primary shrink-0" />{api}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Data Flow</p>
              <p className="text-sm text-foreground leading-relaxed">{uc.integration_architecture.data_flow}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AIMaturityPage() {
  const { addNotification } = useUIStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UseCase[] | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; label: string }[]>([]);

  // Form state
  const [orgProfile, setOrgProfile] = useState("");
  const [industry, setIndustry] = useState("");
  const [functions, setFunctions] = useState<string[]>([]);
  const [maturityScore, setMaturityScore] = useState(2);
  const [dataSources, setDataSources] = useState<string[]>([]);
  const [existingSystems, setExistingSystems] = useState<string[]>([]);
  const [businessGoals, setBusinessGoals] = useState<string[]>([]);

  const toggleFunction = (fn: string) =>
    setFunctions((prev) => prev.includes(fn) ? prev.filter((f) => f !== fn) : [...prev, fn]);

  const canGoNext = useCallback(() => {
    if (step === 1) return orgProfile.trim().length >= 20 && !!industry;
    if (step === 2) return functions.length >= 1 && maturityScore >= 1;
    if (step === 3) return true; // Data & Systems are optional — always allow continue
    return true;
  }, [step, orgProfile, industry, functions, maturityScore]);

  async function handleSubmit() {
    setLoading(true);
    try {
      const token = JSON.parse(localStorage.getItem("ai-governance-auth") ?? "{}").state?.token ?? "";
      const res = await fetch("/api/maturity-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          organizationProfile: orgProfile,
          industry,
          functions,
          maturityScore,
          dataSources,
          existingSystems,
          businessGoals,
        }),
      });
      let json: { success: boolean; error?: string; data?: { id: string; status: string; useCases: UseCase[] } };
      try {
        json = await res.json();
      } catch {
        throw new Error(`HTTP ${res.status} — response was not JSON`);
      }
      if (!res.ok || !json.success) {
        addNotification({ type: "error", title: "Assessment failed", message: `[${res.status}] ${json.error ?? "Unknown error"}` });
        return;
      }
      const data = json.data!;
      const useCases = (data.useCases ?? []) as UseCase[];
      setResult(useCases);
      setAssessmentId(data.id);
      setHistory((h) => [{ id: data.id, label: `${industry} — Level ${maturityScore}` }, ...h]);
      setStep(5);
    } catch {
      addNotification({ type: "error", title: "Network error", message: "Please try again." });
    } finally {
      setLoading(false);
    }
  }

  const totalSteps = 4;
  const progress = ((step - 1) / totalSteps) * 100;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Maturity Assessment
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate AI use case recommendations tailored to your organization's maturity and goals
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
      {step === 5 && result && (
        <div className="space-y-6">
          {/* Summary banner */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Sparkles className="h-8 w-8 text-primary shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {result.length} High-Impact AI Use Cases Generated
              </p>
              <p className="text-sm text-muted-foreground">
                For {industry} · Maturity Level {maturityScore} · {functions.slice(0, 3).join(", ")}{functions.length > 3 ? ` +${functions.length - 3}` : ""}
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
      {step < 5 && (
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
              {step === 1 && <span>Organization Profile</span>}
              {step === 2 && <span>Business Functions & Maturity</span>}
              {step === 3 && <span>Data & Systems</span>}
              {step === 4 && <span>Business Goals</span>}
            </div>
            <CardTitle className="text-xl">
              {step === 1 && "Tell us about your organization"}
              {step === 2 && "What does your organization do with AI today?"}
              {step === 3 && "What data and systems do you work with?"}
              {step === 4 && "What are your top business goals?"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Provide context so the AI can generate highly relevant recommendations."}
              {step === 2 && "Select all functions involved in AI initiatives and your current maturity level."}
              {step === 3 && "These help us design realistic integration architectures."}
              {step === 4 && "Specific goals lead to specific, actionable use cases."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* ── Step 1: Org Profile ──────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="industry">
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

                <div className="space-y-2">
                  <Label htmlFor="orgProfile">
                    Organization Profile *
                    <span className="text-muted-foreground font-normal ml-1">(min 20 characters)</span>
                  </Label>
                  <Textarea
                    id="orgProfile"
                    rows={5}
                    placeholder="Describe your organization — size, what you do, key products/services, geographies, number of employees, annual revenue range, key challenges..."
                    value={orgProfile}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOrgProfile(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground text-right">{orgProfile.length} chars</p>
                </div>
              </div>
            )}

            {/* ── Step 2: Functions + Maturity ─────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>
                    Business Functions Involved in AI *
                    <span className="text-muted-foreground font-normal ml-1">({functions.length} selected)</span>
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {FUNCTIONS.map((fn) => (
                      <button
                        key={fn}
                        type="button"
                        onClick={() => toggleFunction(fn)}
                        className={cn(
                          "text-left text-sm px-3 py-2 rounded-lg border transition-colors",
                          functions.includes(fn)
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        {functions.includes(fn) && <CheckCircle2 className="h-3.5 w-3.5 inline mr-1 text-primary" />}
                        {fn}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>
                    <BarChart3 className="h-4 w-4 inline mr-1" />
                    AI Maturity Level *
                  </Label>
                  <div className="space-y-2">
                    {MATURITY_LEVELS.map((lvl) => (
                      <button
                        key={lvl.score}
                        type="button"
                        onClick={() => setMaturityScore(lvl.score)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border transition-colors flex items-start gap-3",
                          maturityScore === lvl.score
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-muted/30"
                        )}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold">{lvl.score}</div>
                        <div>
                          <p className={cn("font-semibold text-sm", maturityScore === lvl.score ? "text-primary" : "text-foreground")}>
                            Level {lvl.score} — {lvl.label}
                          </p>
                          <p className="text-xs text-muted-foreground">{lvl.desc}</p>
                        </div>
                        {maturityScore === lvl.score && (
                          <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0 mt-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Data Sources + Systems ───────────────────────────── */}
            {step === 3 && (
              <div className="space-y-6">
                <TagInput
                  label="Data Sources (optional but recommended)"
                  placeholder="Type a data source and press Enter..."
                  tags={dataSources}
                  setTags={setDataSources}
                  suggestions={COMMON_DATA_SOURCES}
                />
                <TagInput
                  label="Existing Systems / Tools (optional but recommended)"
                  placeholder="Type a system name and press Enter..."
                  tags={existingSystems}
                  setTags={setExistingSystems}
                  suggestions={COMMON_SYSTEMS}
                />
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 inline mr-1.5 text-primary" />
                  The more context you provide, the more specific and implementable the AI recommendations will be.
                  These are optional — Claude will infer from your industry if not provided.
                </div>
              </div>
            )}

            {/* ── Step 4: Business Goals ────────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-5">
                <TagInput
                  label="Business Goals *"
                  placeholder="e.g. Reduce loan processing time by 50%..."
                  tags={businessGoals}
                  setTags={setBusinessGoals}
                  suggestions={[
                    "Reduce operational costs by 30%",
                    "Improve customer satisfaction score",
                    "Automate manual compliance processes",
                    "Reduce fraud losses",
                    "Accelerate product development cycle",
                    "Improve employee productivity",
                    "Scale without adding headcount",
                    "Achieve ISO 42001 certification",
                    "Reduce loan processing time",
                    "Improve risk prediction accuracy",
                    "Automate customer onboarding",
                    "Reduce churn rate",
                  ]}
                />

                {/* Review summary */}
                <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3 text-sm">
                  <p className="font-semibold text-foreground">Assessment Summary</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-muted-foreground">Industry: </span><span className="font-medium">{industry}</span></div>
                    <div><span className="text-muted-foreground">Maturity: </span><span className="font-medium">Level {maturityScore} — {MATURITY_LEVELS[maturityScore - 1]?.label}</span></div>
                    <div><span className="text-muted-foreground">Functions: </span><span className="font-medium">{functions.length} selected</span></div>
                    <div><span className="text-muted-foreground">Goals: </span><span className="font-medium">{businessGoals.length} defined</span></div>
                    <div><span className="text-muted-foreground">Data sources: </span><span className="font-medium">{dataSources.length || "Auto-detected"}</span></div>
                    <div><span className="text-muted-foreground">Systems: </span><span className="font-medium">{existingSystems.length || "Auto-detected"}</span></div>
                  </div>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3 text-sm">
                  <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Claude will generate up to 3 AI use cases</p>
                    <p className="text-muted-foreground mt-0.5">
                      Each includes an agentic AI design, n8n automation workflow, implementation plan, and integration architecture.
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

              {step < 4 ? (
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
                  className="min-w-[160px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing with Claude...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate AI Use Cases
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading overlay when generating */}
      {loading && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center space-y-3">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
          <p className="font-semibold text-foreground">Claude is analyzing your organization...</p>
          <p className="text-sm text-muted-foreground">
            Generating personalized AI use cases with agentic designs, n8n workflows, and implementation plans.
            This takes 15–30 seconds.
          </p>
        </div>
      )}
    </div>
  );
}
