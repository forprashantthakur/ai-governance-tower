"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  BarChart3, Plus, Trash2, Calendar, Clock, Mail,
  FileText, ShieldAlert, CheckSquare, BrainCircuit,
  FileSearch, Printer, RefreshCw, Users, AlertCircle,
  ChevronRight, X, Eye, Send, ToggleLeft, ToggleRight,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDateShort } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

// ── Types ────────────────────────────────────────────────────────────────────

type ReportType = "EXECUTIVE_SUMMARY" | "RISK_ASSESSMENT" | "COMPLIANCE_STATUS" | "AI_INVENTORY" | "ISO42005_ASSESSMENT";
type ReportFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

interface ReportSchedule {
  id: string;
  frequency: ReportFrequency;
  sendTime: string;
  recipients: string[];
  isActive: boolean;
  nextRunAt?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

interface Report {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  filters: Record<string, string>;
  sections: string[];
  createdAt: string;
  creator: { id: string; name: string };
  schedules: ReportSchedule[];
}

// ── Config ───────────────────────────────────────────────────────────────────

const REPORT_TYPES: { type: ReportType; label: string; icon: React.ElementType; description: string; color: string }[] = [
  { type: "EXECUTIVE_SUMMARY",   label: "Executive Summary",      icon: BarChart3,    description: "High-level KPIs, risk overview, compliance score and model statistics.", color: "text-blue-400" },
  { type: "RISK_ASSESSMENT",     label: "Risk Assessment",         icon: ShieldAlert,  description: "All risk assessments with scores, levels and dimension breakdowns.",      color: "text-red-400" },
  { type: "COMPLIANCE_STATUS",   label: "Compliance Status",       icon: CheckSquare,  description: "Control pass/fail rates by framework: ISO 42001, GDPR, SOC 2.",          color: "text-green-400" },
  { type: "AI_INVENTORY",        label: "AI Inventory",            icon: BrainCircuit, description: "Complete AI model inventory with owners, risk levels and status.",         color: "text-purple-400" },
  { type: "ISO42005_ASSESSMENT", label: "ISO 42005 Assessment",    icon: FileSearch,   description: "Impact assessment documentation for all AI models per clause.",           color: "text-teal-400" },
];

const FREQ_OPTIONS: { value: ReportFrequency; label: string }[] = [
  { value: "DAILY",   label: "Daily"   },
  { value: "WEEKLY",  label: "Weekly"  },
  { value: "MONTHLY", label: "Monthly" },
];

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function typeMeta(type: ReportType) {
  return REPORT_TYPES.find(t => t.type === type) ?? REPORT_TYPES[0];
}

function riskColor(level: string) {
  return level === "CRITICAL" ? "text-red-400" : level === "HIGH" ? "text-orange-400" : level === "MEDIUM" ? "text-yellow-400" : "text-green-400";
}

function statusColor(status: string) {
  if (status === "PASS") return "bg-green-500/15 text-green-400 border-green-500/30";
  if (status === "FAIL") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (status === "PARTIAL") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return "bg-muted text-muted-foreground border-border";
}

// ── Print helper — opens a clean new window so the modal chrome is excluded ──

function printReport(title: string, contentEl: HTMLElement | null) {
  if (!contentEl) return;
  const html = contentEl.innerHTML;
  const win = window.open("", "_blank", "width=1000,height=800");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;color:#111827;background:#fff;padding:16mm 14mm;font-size:13px;line-height:1.5}
h1{font-size:1.4rem;font-weight:700;margin-bottom:.2rem}
h3{font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:.6rem}
table{width:100%;border-collapse:collapse;font-size:.82rem}
thead tr{background:#f9fafb}
th{padding:.45rem .7rem;text-align:left;font-size:.7rem;font-weight:600;color:#6b7280;border-bottom:1px solid #e5e7eb;white-space:nowrap}
td{padding:.45rem .7rem;border-bottom:1px solid #f3f4f6;vertical-align:top}
tr:nth-child(even) td{background:#fafafa}
.space-y-6>*+*{margin-top:1.5rem}
.space-y-4>*+*{margin-top:1rem}
.space-y-3>*+*{margin-top:.75rem}
.space-y-2>*+*{margin-top:.5rem}
.grid{display:grid;gap:.75rem}
.grid-cols-2{grid-template-columns:1fr 1fr}
.grid-cols-3{grid-template-columns:1fr 1fr 1fr}
.grid-cols-4{grid-template-columns:1fr 1fr 1fr 1fr}
.gap-4{gap:1rem}.gap-3{gap:.75rem}.gap-2{gap:.5rem}.gap-6{gap:1.5rem}
.flex{display:flex}.items-start{align-items:flex-start}.justify-between{justify-content:space-between}
.text-right{text-align:right}.text-center{text-align:center}
.font-bold{font-weight:700}.font-semibold{font-weight:600}.font-medium{font-weight:500}
.font-mono{font-family:monospace}
.text-2xl{font-size:1.4rem;font-weight:700}.text-xl{font-size:1.15rem;font-weight:700}
.text-sm{font-size:.85rem}.text-xs{font-size:.75rem}
.text-muted-foreground{color:#6b7280}
.uppercase{text-transform:uppercase}.tracking-wide{letter-spacing:.025em}.tracking-widest{letter-spacing:.08em}
.border{border:1px solid #e5e7eb}.border-b{border-bottom:1px solid #e5e7eb}
.border-t{border-top:1px solid #e5e7eb}.border-border{border-color:#e5e7eb}
.rounded-lg{border-radius:.5rem}.rounded{border-radius:.25rem}
.overflow-hidden{overflow:hidden}
.p-4{padding:1rem}.p-3{padding:.75rem}.p-5{padding:1.25rem}.p-2{padding:.5rem}.px-3{padding-left:.75rem;padding-right:.75rem}
.py-2{padding-top:.5rem;padding-bottom:.5rem}.pb-5{padding-bottom:1.25rem}.pt-4{padding-top:1rem}.py-8{padding:2rem 0}.py-4{padding:1rem 0}
.mt-1{margin-top:.25rem}.mt-2{margin-top:.5rem}.mt-0\\.5{margin-top:.125rem}.mb-1{margin-bottom:.25rem}.mb-2{margin-bottom:.5rem}.mb-3{margin-bottom:.75rem}
.bg-muted\\/20,.bg-muted\\/10{background:#f9fafb}.bg-muted\\/40{background:#f3f4f6}
.min-w-\\[90px\\]{min-width:90px}
.whitespace-nowrap{white-space:nowrap}.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.flex-wrap{flex-wrap:wrap}
/* inline badge */
span.inline-flex,div.inline-flex{display:inline-flex;align-items:center;padding:.1rem .45rem;border-radius:.25rem;font-size:.7rem;font-weight:500;border:1px solid transparent}
/* colour helpers */
.text-green-400{color:#16a34a}.text-red-400{color:#dc2626}.text-yellow-400{color:#d97706}.text-orange-400{color:#ea580c}.text-blue-400{color:#2563eb}.text-teal-400{color:#0d9488}.text-purple-400{color:#9333ea}
.bg-green-500\\/15{background:#dcfce7}.border-green-500\\/30{border-color:#86efac}
.bg-red-500\\/15{background:#fee2e2}.border-red-500\\/30{border-color:#fca5a5}
.bg-yellow-500\\/15{background:#fef9c3}.border-yellow-500\\/30{border-color:#fde047}
.bg-muted{background:#f3f4f6}.border-border{border-color:#e5e7eb}
/* hide lucide icons in print */
svg{display:none}
@page{margin:14mm;size:A4}
</style>
</head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 600);
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT VIEW (rendered report content)
// ─────────────────────────────────────────────────────────────────────────────

function ReportView({ report, data }: { report: Report; data: Record<string, unknown> }) {
  const meta = typeMeta(report.type);
  const now = new Date();

  return (
    <div className="space-y-6 text-sm">
      {/* Report header */}
      <div className="border-b border-border pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">AI Governance Control Tower</p>
            <h1 className="text-2xl font-bold">{report.name}</h1>
            <p className="text-muted-foreground mt-1">{meta.label}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground space-y-1">
            <p>Generated: {now.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</p>
            <p>By: {report.creator.name}</p>
            {report.filters.from && <p>Period: {report.filters.from} → {report.filters.to || "Today"}</p>}
          </div>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY */}
      {report.type === "EXECUTIVE_SUMMARY" && (() => {
        const d = data as { totalModels:number; activeModels:number; agentCount:number; avgRiskScore:number; complianceScore:number; byType:Record<string,number>; byStatus:Record<string,number>; byRisk:Record<string,number>; complianceSummary:{status:string;count:number}[]; recentAuditEvents:number; piiModels:number; criticalModels:number };
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total AI Models", value: d.totalModels, sub: `${d.activeModels} active` },
                { label: "Avg Risk Score", value: `${d.avgRiskScore}/100`, sub: "latest assessments" },
                { label: "Compliance Score", value: `${d.complianceScore}%`, sub: "controls passing" },
                { label: "Active Agents", value: d.agentCount, sub: "deployed" },
              ].map(k => (
                <div key={k.label} className="border border-border rounded-lg p-4 bg-muted/20">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</p>
                  <p className="text-2xl font-bold mt-1">{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 text-xs uppercase tracking-widest text-muted-foreground">Risk Distribution</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(d.byRisk).map(([level, count]) => (
                      <tr key={level} className="border-b border-border/50">
                        <td className="py-2 font-medium"><span className={riskColor(level)}>{level}</span></td>
                        <td className="py-2 text-right">{count} model{count!==1?"s":""}</td>
                      </tr>
                    ))}
                    {Object.keys(d.byRisk).length === 0 && <tr><td colSpan={2} className="py-2 text-muted-foreground">No assessments yet</td></tr>}
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-xs uppercase tracking-widest text-muted-foreground">Compliance Controls</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {d.complianceSummary.map(c => (
                      <tr key={c.status} className="border-b border-border/50">
                        <td className="py-2"><Badge variant="outline" className={statusColor(c.status)}>{c.status}</Badge></td>
                        <td className="py-2 text-right">{c.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-xs uppercase tracking-widest text-muted-foreground">Models by Type</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(d.byType).map(([type, count]) => (
                  <div key={type} className="border border-border rounded px-3 py-2 text-center min-w-[90px] bg-muted/20">
                    <p className="text-xs text-muted-foreground">{type}</p>
                    <p className="text-xl font-bold">{count}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="border border-border rounded-lg p-3 bg-muted/20">
                <p className="text-xs text-muted-foreground">PII Processing</p>
                <p className="text-xl font-bold text-orange-400">{d.piiModels}</p>
              </div>
              <div className="border border-border rounded-lg p-3 bg-muted/20">
                <p className="text-xs text-muted-foreground">Critical Models</p>
                <p className="text-xl font-bold text-red-400">{d.criticalModels}</p>
              </div>
              <div className="border border-border rounded-lg p-3 bg-muted/20">
                <p className="text-xs text-muted-foreground">Audit Events (period)</p>
                <p className="text-xl font-bold">{d.recentAuditEvents}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* RISK ASSESSMENT */}
      {report.type === "RISK_ASSESSMENT" && (() => {
        const d = data as { assessments: { id:string; overallScore:number; riskLevel:string; createdAt:string; model:{name:string;type:string;status:string;department?:string}; assessor:{name:string} }[]; byRisk:Record<string,number>; avgScore:number; total:number };
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Assessments", value: d.total },
                { label: "Avg Risk Score", value: `${d.avgScore}/100` },
                { label: "High/Critical", value: (d.byRisk["HIGH"]||0)+(d.byRisk["CRITICAL"]||0) },
              ].map(k => (
                <div key={k.label} className="border border-border rounded-lg p-4 bg-muted/20 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</p>
                  <p className="text-2xl font-bold mt-1">{k.value}</p>
                </div>
              ))}
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-xs uppercase tracking-widest text-muted-foreground">All Risk Assessments</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>{["Model","Type","Department","Risk Level","Score","Assessor","Date"].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {d.assessments.map((a,i) => (
                      <tr key={a.id} className={i%2===0?"":"bg-muted/10"}>
                        <td className="px-3 py-2 font-medium">{a.model.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{a.model.type}</td>
                        <td className="px-3 py-2 text-muted-foreground">{a.model.department||"—"}</td>
                        <td className={`px-3 py-2 font-semibold ${riskColor(a.riskLevel)}`}>{a.riskLevel}</td>
                        <td className="px-3 py-2">{a.overallScore.toFixed(1)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{a.assessor.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("en-IN")}</td>
                      </tr>
                    ))}
                    {d.assessments.length===0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No assessments in this period</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* COMPLIANCE STATUS */}
      {report.type === "COMPLIANCE_STATUS" && (() => {
        const d = data as { controls:{id:string;framework:string;controlId:string;controlName:string;status:string;model:{name:string}}[]; byFramework:Record<string,Record<string,number>>; total:number; passing:number; score:number };
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-border rounded-lg p-4 bg-muted/20 text-center">
                <p className="text-xs text-muted-foreground uppercase">Total Controls</p>
                <p className="text-2xl font-bold mt-1">{d.total}</p>
              </div>
              <div className="border border-border rounded-lg p-4 bg-muted/20 text-center">
                <p className="text-xs text-muted-foreground uppercase">Passing</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{d.passing}</p>
              </div>
              <div className="border border-border rounded-lg p-4 bg-muted/20 text-center">
                <p className="text-xs text-muted-foreground uppercase">Compliance Score</p>
                <p className="text-2xl font-bold mt-1">{d.score}%</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-xs uppercase tracking-widest text-muted-foreground">By Framework</h3>
              <div className="space-y-3">
                {Object.entries(d.byFramework).map(([fw, counts]) => (
                  <div key={fw} className="border border-border rounded-lg p-4 bg-muted/20">
                    <p className="font-semibold mb-2">{fw}</p>
                    <div className="flex gap-4 text-sm">
                      {Object.entries(counts).map(([status,count]) => (
                        <span key={status}><Badge variant="outline" className={statusColor(status)}>{status}</Badge> <span className="ml-1">{count}</span></span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-xs uppercase tracking-widest text-muted-foreground">All Controls</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>{["Control ID","Title","Framework","Model","Status"].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {d.controls.map((c,i) => (
                      <tr key={c.id} className={i%2===0?"":"bg-muted/10"}>
                        <td className="px-3 py-2 font-mono text-xs">{c.controlId}</td>
                        <td className="px-3 py-2">{c.controlName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{c.framework}</td>
                        <td className="px-3 py-2 text-muted-foreground">{c.model.name}</td>
                        <td className="px-3 py-2"><Badge variant="outline" className={statusColor(c.status)}>{c.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* AI INVENTORY */}
      {report.type === "AI_INVENTORY" && (() => {
        const d = data as { models:{id:string;name:string;type:string;status:string;version:string;department?:string;vendor?:string;isPiiProcessing:boolean;isCritical:boolean;createdAt:string;owner:{name:string};approver?:{name:string}|null;riskAssessments:{riskLevel:string;overallScore:number}[]}[]; total:number };
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Total: <strong>{d.total}</strong> AI models registered</p>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>{["Name","Type","Status","Version","Department","Owner","Approver","Risk","PII","Critical","Registered"].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {d.models.map((m,i) => (
                    <tr key={m.id} className={i%2===0?"":"bg-muted/10"}>
                      <td className="px-3 py-2 font-medium">{m.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.type}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{m.status}</Badge></td>
                      <td className="px-3 py-2 text-muted-foreground">{m.version}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.department||"—"}</td>
                      <td className="px-3 py-2">{m.owner.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.approver?.name||"—"}</td>
                      <td className={`px-3 py-2 font-semibold ${m.riskAssessments[0]?riskColor(m.riskAssessments[0].riskLevel):"text-muted-foreground"}`}>{m.riskAssessments[0]?.riskLevel||"—"}</td>
                      <td className="px-3 py-2 text-center">{m.isPiiProcessing?"✓":"—"}</td>
                      <td className="px-3 py-2 text-center">{m.isCritical?"✓":"—"}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{new Date(m.createdAt).toLocaleDateString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ISO 42005 */}
      {report.type === "ISO42005_ASSESSMENT" && (() => {
        const d = data as { assessments:{id:string;model:{name:string;type:string;status:string};intendedUses:string[];algorithmType?:string;geographicScope:string[];accountability?:string;transparency?:string;fairness?:string;privacy?:string;reliability?:string;safety?:string}[]; total:number };
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">{d.total} impact assessment{d.total!==1?"s":""} on record</p>
            {d.assessments.map(a => (
              <div key={a.id} className="border border-border rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{a.model.name}</h3>
                  <span className="text-xs text-muted-foreground">{a.model.type} · {a.model.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Algorithm Type</p>
                    <p>{a.algorithmType||"—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Geographic Scope</p>
                    <p>{a.geographicScope?.join(", ")||"—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Intended Uses</p>
                    <p>{a.intendedUses?.join(", ")||"—"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Impact Dimensions</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[["Accountability",a.accountability],["Transparency",a.transparency],["Fairness",a.fairness],["Privacy",a.privacy],["Reliability",a.reliability],["Safety",a.safety]].map(([label,val])=>(
                      <div key={label as string} className="border border-border/50 rounded p-2 bg-muted/20">
                        <p className="font-medium text-muted-foreground">{label}</p>
                        <p className="mt-0.5 truncate">{(val as string)||"—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {d.assessments.length===0 && <p className="text-center text-muted-foreground py-8">No impact assessments recorded yet.</p>}
          </div>
        );
      })()}

      {/* Footer */}
      <div className="border-t border-border pt-4 text-xs text-muted-foreground flex justify-between">
        <span>AI Governance Control Tower — Confidential</span>
        <span>Generated {now.toISOString().split("T")[0]}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const api = useApi();
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "scheduled">("all");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [form, setForm] = useState({ name: "", description: "", from: "", to: "" });
  const [creating, setCreating] = useState(false);

  // View modal
  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Schedule modal
  const [scheduleReport, setScheduleReport] = useState<Report | null>(null);
  const [schedForm, setSchedForm] = useState({ frequency: "WEEKLY" as ReportFrequency, dayOfWeek: 1, dayOfMonth: 1, sendTime: "09:00", recipients: "", isActive: true });
  const [saving, setSaving] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Report[]>("/reports");
      setReports(Array.isArray(data) ? data : []);
    } catch { setReports([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Create report ──────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!selectedType || !form.name.trim()) return;
    setCreating(true);
    try {
      const report = await api.post<Report>("/reports", {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: selectedType,
        filters: { ...(form.from && { from: form.from }), ...(form.to && { to: form.to }) },
      });
      setReports(prev => [report, ...prev]);
      setShowCreate(false);
      setStep(1);
      setSelectedType(null);
      setForm({ name: "", description: "", from: "", to: "" });
    } catch { /* ignore */ } finally { setCreating(false); }
  }

  // ── Generate / view report ─────────────────────────────────────────────────

  async function handleView(r: Report) {
    setViewReport(r);
    setReportData(null);
    setGenerating(true);
    try {
      const res = await api.get<{ report: Report; data: Record<string,unknown>; generatedAt: string }>(`/reports/${r.id}/generate`);
      setReportData(res.data);
    } catch { setReportData({}); } finally { setGenerating(false); }
  }

  // ── Delete report ──────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm("Delete this report?")) return;
    await api.del(`/reports/${id}`).catch(() => {});
    setReports(prev => prev.filter(r => r.id !== id));
  }

  // ── Save schedule ──────────────────────────────────────────────────────────

  async function handleSaveSchedule() {
    if (!scheduleReport) return;
    const recipientList = schedForm.recipients.split(/[,\n]+/).map(e => e.trim()).filter(Boolean);
    if (!recipientList.length) return;
    setSaving(true);
    try {
      await api.post(`/reports/${scheduleReport.id}/schedule`, {
        frequency: schedForm.frequency,
        dayOfWeek: schedForm.frequency === "WEEKLY" ? schedForm.dayOfWeek : undefined,
        dayOfMonth: schedForm.frequency === "MONTHLY" ? schedForm.dayOfMonth : undefined,
        sendTime: schedForm.sendTime,
        recipients: recipientList,
        isActive: schedForm.isActive,
      });
      await fetchReports();
      setScheduleReport(null);
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function handleDeleteSchedule(reportId: string) {
    if (!confirm("Remove schedule?")) return;
    await api.del(`/reports/${reportId}/schedule`).catch(() => {});
    await fetchReports();
  }

  // Open schedule modal and pre-fill if existing
  function openSchedule(r: Report) {
    const existing = r.schedules?.[0];
    if (existing) {
      setSchedForm({
        frequency: existing.frequency,
        dayOfWeek: existing.dayOfWeek ?? 1,
        dayOfMonth: existing.dayOfMonth ?? 1,
        sendTime: existing.sendTime,
        recipients: existing.recipients.join(", "),
        isActive: existing.isActive,
      });
    } else {
      setSchedForm({ frequency: "WEEKLY", dayOfWeek: 1, dayOfMonth: 1, sendTime: "09:00", recipients: "", isActive: true });
    }
    setScheduleReport(r);
  }

  // ── Derived lists ──────────────────────────────────────────────────────────

  const displayed = activeTab === "scheduled" ? reports.filter(r => r.schedules?.some(s => s.isActive)) : reports;

  const totalScheduled = reports.filter(r => r.schedules?.some(s => s.isActive)).length;

  // suppress unused warning — user is available for future role checks
  void user;

  // ── UI ─────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" />Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Generate, export and schedule governance reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`} /></Button>
          <Button size="sm" onClick={() => { setShowCreate(true); setStep(1); setSelectedType(null); setForm({name:"",description:"",from:"",to:""}); }}>
            <Plus className="h-4 w-4 mr-1" />Create Report
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Reports", value: reports.length, icon: FileText, color: "text-blue-400" },
          { label: "Scheduled", value: totalScheduled, icon: Calendar, color: "text-green-400" },
          { label: "Report Types", value: REPORT_TYPES.length, icon: BarChart3, color: "text-purple-400" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg"><s.icon className={`h-5 w-5 ${s.color}`} /></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([["all","All Reports"],["scheduled","Scheduled"]] as const).map(([key,label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab===key?"border-primary text-foreground":"border-transparent text-muted-foreground hover:text-foreground"}`}>
            {label}{key==="scheduled" && totalScheduled>0 && <span className="ml-1.5 bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">{totalScheduled}</span>}
          </button>
        ))}
      </div>

      {/* Report grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-44 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">{activeTab==="scheduled" ? "No scheduled reports" : "No reports yet"}</p>
          {activeTab==="all" && <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />Create First Report</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map(r => {
            const meta = typeMeta(r.type);
            const schedule = r.schedules?.[0];
            const Icon = meta.icon;
            return (
              <Card key={r.id} className="flex flex-col hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-muted rounded-lg"><Icon className={`h-4 w-4 ${meta.color}`} /></div>
                      <div>
                        <CardTitle className="text-sm leading-tight">{r.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{meta.label}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(r.id)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.description}</p>}
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />Created {formatDateShort(r.createdAt)} · {r.creator.name}
                    </div>
                    {schedule ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="h-3 w-3 text-green-400" />
                        <span className="text-green-400">{schedule.frequency}</span>
                        <span className="text-muted-foreground">· {schedule.sendTime} UTC · {schedule.recipients.length} recipient{schedule.recipients.length!==1?"s":""}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />Not scheduled</div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => handleView(r)}>
                      <Eye className="h-3 w-3 mr-1" />View
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => openSchedule(r)}>
                      <Calendar className="h-3 w-3 mr-1" />{schedule ? "Edit Schedule" : "Schedule"}
                    </Button>
                    {schedule && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300" onClick={() => handleDeleteSchedule(r.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── CREATE REPORT MODAL ────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="font-semibold text-lg">Create Report</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Step {step} of 2</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>

            <div className="p-6">
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">Choose the type of report to generate:</p>
                  <div className="grid grid-cols-1 gap-3">
                    {REPORT_TYPES.map(t => {
                      const Icon = t.icon;
                      return (
                        <button key={t.type} onClick={() => setSelectedType(t.type)}
                          className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${selectedType===t.type?"border-primary bg-primary/5":"border-border hover:border-primary/50 hover:bg-muted/50"}`}>
                          <div className={`p-2 bg-muted rounded-lg shrink-0 mt-0.5`}><Icon className={`h-5 w-5 ${t.color}`} /></div>
                          <div>
                            <p className="font-medium text-sm">{t.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                          </div>
                          {selectedType===t.type && <ChevronRight className="h-4 w-4 text-primary ml-auto mt-0.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 2 && selectedType && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                    {(() => { const m = typeMeta(selectedType); const Icon = m.icon; return <><div className="p-1.5 bg-muted rounded"><Icon className={`h-4 w-4 ${m.color}`} /></div><span className="text-sm font-medium">{m.label}</span></>; })()}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rname">Report Name <span className="text-red-400">*</span></Label>
                    <Input id="rname" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder={`${typeMeta(selectedType).label} — Q2 2026`} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rdesc">Description</Label>
                    <Input id="rdesc" value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} placeholder="Optional description..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="rfrom">From Date</Label>
                      <Input id="rfrom" type="date" value={form.from} onChange={e => setForm(p=>({...p,from:e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rto">To Date</Label>
                      <Input id="rto" type="date" value={form.to} onChange={e => setForm(p=>({...p,to:e.target.value}))} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between p-6 border-t border-border">
              {step === 1 ? (
                <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              ) : (
                <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
              )}
              {step === 1 ? (
                <Button disabled={!selectedType} onClick={() => setStep(2)}>Next →</Button>
              ) : (
                <Button disabled={!form.name.trim() || creating} onClick={handleCreate}>
                  {creating ? "Creating…" : "Create Report"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REPORT VIEW MODAL ─────────────────────────────────────────────── */}
      {viewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0 no-print">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-semibold">{viewReport.name}</h2>
                  <p className="text-xs text-muted-foreground">{typeMeta(viewReport.type).label}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={!reportData} onClick={() => printReport(viewReport.name, printRef.current)}>
                  <Printer className="h-4 w-4 mr-1.5" />Export PDF
                </Button>
                <button onClick={() => { setViewReport(null); setReportData(null); }} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <div id="report-print-root" className="flex-1 overflow-y-auto p-6" ref={printRef}>
              {generating ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Generating report…</p>
                </div>
              ) : reportData ? (
                <ReportView report={viewReport} data={reportData} />
              ) : (
                <div className="flex items-center justify-center py-20"><AlertCircle className="h-6 w-6 text-red-400 mr-2" /><span className="text-muted-foreground">Failed to generate report</span></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULE MODAL ────────────────────────────────────────────────── */}
      {scheduleReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-2"><Send className="h-4 w-4 text-primary" /><h2 className="font-semibold">Schedule Report</h2></div>
              <button onClick={() => setScheduleReport(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">Configure automatic delivery for <strong>{scheduleReport.name}</strong></p>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <div className="flex gap-2">
                  {FREQ_OPTIONS.map(f => (
                    <button key={f.value} onClick={() => setSchedForm(p=>({...p,frequency:f.value}))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${schedForm.frequency===f.value?"border-primary bg-primary/10 text-primary":"border-border text-muted-foreground hover:border-primary/50"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {schedForm.frequency === "WEEKLY" && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <select value={schedForm.dayOfWeek} onChange={e => setSchedForm(p=>({...p,dayOfWeek:Number(e.target.value)}))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    {DAY_NAMES.map((d,i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              )}

              {schedForm.frequency === "MONTHLY" && (
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Input type="number" min={1} max={28} value={schedForm.dayOfMonth} onChange={e => setSchedForm(p=>({...p,dayOfMonth:Number(e.target.value)}))} />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="stime">Send Time (UTC)</Label>
                <Input id="stime" type="time" value={schedForm.sendTime} onChange={e => setSchedForm(p=>({...p,sendTime:e.target.value}))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recips" className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Recipients <span className="text-xs text-muted-foreground">(comma or newline separated)</span></Label>
                <textarea id="recips" value={schedForm.recipients} onChange={e => setSchedForm(p=>({...p,recipients:e.target.value}))}
                  placeholder="ciso@company.com, compliance@company.com"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none h-20" />
              </div>

              <div className="flex items-center justify-between py-2 border border-border rounded-lg px-4">
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span className="text-sm">Schedule Active</span></div>
                <button onClick={() => setSchedForm(p=>({...p,isActive:!p.isActive}))} className="text-primary">
                  {schedForm.isActive ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div className="flex justify-between p-6 border-t border-border">
              <Button variant="ghost" onClick={() => setScheduleReport(null)}>Cancel</Button>
              <Button disabled={saving || !schedForm.recipients.trim()} onClick={handleSaveSchedule}>
                {saving ? "Saving…" : <><Calendar className="h-4 w-4 mr-1.5" />Save Schedule</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
