"use client";

import { useEffect, useState } from "react";
import { Scale, CheckCircle2, XCircle, AlertCircle, Circle, ExternalLink } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Types ─────────────────────────────────────────────────────────────────────

type ControlStatus = "PASS" | "FAIL" | "PARTIAL" | "PENDING_REVIEW" | "NOT_APPLICABLE" | "UNKNOWN";

interface ComplianceControl {
  controlId: string;
  status: ControlStatus;
}

interface MappingRow {
  area: string;
  iso42001: { clause: string; title: string };
  dpdp?: { section: string; title: string };
  euAiAct?: { article: string; title: string };
  iso42005?: { clause: string; title: string };
  controlIds: string[];          // which ComplianceControl IDs apply
  riskTier: "HIGH" | "MEDIUM" | "LOW";
}

// ── Static cross-regulation mapping matrix ────────────────────────────────────

const MAPPING: MappingRow[] = [
  {
    area: "AI System Inventory & Classification",
    iso42001: { clause: "6.1.2", title: "AI risk identification" },
    dpdp: { section: "Sec 4", title: "Lawful processing of personal data" },
    euAiAct: { article: "Art 6–7", title: "Classification of high-risk AI systems" },
    controlIds: [],
    riskTier: "HIGH",
  },
  {
    area: "Risk Assessment & Management",
    iso42001: { clause: "6.1.3", title: "AI risk treatment" },
    dpdp: { section: "Sec 8", title: "Obligations of data fiduciary" },
    euAiAct: { article: "Art 9", title: "Risk management system" },
    iso42005: { clause: "§5.3", title: "Description of AI system" },
    controlIds: [],
    riskTier: "HIGH",
  },
  {
    area: "Data Governance & Privacy",
    iso42001: { clause: "8.4", title: "Data for AI systems" },
    dpdp: { section: "Sec 8–9", title: "Data quality & purpose limitation" },
    euAiAct: { article: "Art 10", title: "Data and data governance" },
    controlIds: [],
    riskTier: "HIGH",
  },
  {
    area: "Transparency & Explainability",
    iso42001: { clause: "8.6", title: "System behaviour — transparency" },
    dpdp: { section: "Sec 11", title: "Right to information" },
    euAiAct: { article: "Art 13", title: "Transparency and provision of information" },
    iso42005: { clause: "§5.8.d", title: "Transparency dimension" },
    controlIds: [],
    riskTier: "HIGH",
  },
  {
    area: "Human Oversight",
    iso42001: { clause: "8.5", title: "AI system life cycle" },
    euAiAct: { article: "Art 14", title: "Human oversight" },
    iso42005: { clause: "§5.8.h", title: "Human agency dimension" },
    controlIds: [],
    riskTier: "HIGH",
  },
  {
    area: "Accuracy, Reliability & Robustness",
    iso42001: { clause: "8.7", title: "Documented information for AI systems" },
    euAiAct: { article: "Art 15", title: "Accuracy, robustness and cybersecurity" },
    iso42005: { clause: "§5.8.e", title: "Reliability dimension" },
    controlIds: [],
    riskTier: "MEDIUM",
  },
  {
    area: "Bias & Fairness",
    iso42001: { clause: "6.1.4", title: "AI impact assessment" },
    dpdp: { section: "Sec 5", title: "Notice and consent" },
    euAiAct: { article: "Art 10.3", title: "Training data bias requirements" },
    iso42005: { clause: "§5.8.c", title: "Fairness dimension" },
    controlIds: [],
    riskTier: "HIGH",
  },
  {
    area: "Data Subject Rights",
    iso42001: { clause: "8.4.3", title: "Data quality for AI" },
    dpdp: { section: "Sec 12–13", title: "Rights of data principal" },
    euAiAct: { article: "Art 13.2", title: "Right to explanation" },
    controlIds: [],
    riskTier: "HIGH",
  },
  {
    area: "Incident Reporting & Monitoring",
    iso42001: { clause: "9.1", title: "Monitoring & measurement" },
    euAiAct: { article: "Art 26", title: "Post-market monitoring" },
    iso42005: { clause: "§5.8.f", title: "Safety dimension" },
    controlIds: [],
    riskTier: "MEDIUM",
  },
  {
    area: "AI System Documentation",
    iso42001: { clause: "7.5", title: "Documented information" },
    euAiAct: { article: "Art 11", title: "Technical documentation" },
    controlIds: [],
    riskTier: "LOW",
  },
  {
    area: "Supplier & Third-Party AI",
    iso42001: { clause: "8.4.1", title: "Third-party AI systems" },
    dpdp: { section: "Sec 8.3", title: "Processor obligations" },
    euAiAct: { article: "Art 25", title: "Obligations of providers placing AI systems" },
    controlIds: [],
    riskTier: "MEDIUM",
  },
  {
    area: "Consent & Lawful Basis",
    iso42001: { clause: "8.4.2", title: "Personal data in AI" },
    dpdp: { section: "Sec 6–7", title: "Consent and deemed consent" },
    euAiAct: { article: "Art 10.5", title: "Data minimisation" },
    controlIds: [],
    riskTier: "HIGH",
  },
  {
    area: "Conformity Assessment & Audit",
    iso42001: { clause: "9.2", title: "Internal audit" },
    euAiAct: { article: "Art 43", title: "Conformity assessment" },
    controlIds: [],
    riskTier: "MEDIUM",
  },
  {
    area: "Foreseeable Misuse Prevention",
    iso42001: { clause: "6.1.2.b", title: "Unintended use scenarios" },
    euAiAct: { article: "Art 9.2.b", title: "Reasonably foreseeable misuse" },
    iso42005: { clause: "§5.3.5", title: "Foreseeable misuse scenarios" },
    controlIds: [],
    riskTier: "HIGH",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ControlStatus | "UNKNOWN" }) {
  if (status === "PASS")           return <CheckCircle2 className="h-4 w-4 text-green-400" />;
  if (status === "FAIL")           return <XCircle className="h-4 w-4 text-red-400" />;
  if (status === "PARTIAL")        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
  if (status === "PENDING_REVIEW") return <AlertCircle className="h-4 w-4 text-blue-400" />;
  return <Circle className="h-4 w-4 text-muted-foreground/40" />;
}

function StatusBadge({ status }: { status: ControlStatus | "UNKNOWN" }) {
  const map: Record<string, string> = {
    PASS:           "bg-green-500/15 text-green-400 border-green-500/30",
    FAIL:           "bg-red-500/15 text-red-400 border-red-500/30",
    PARTIAL:        "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    PENDING_REVIEW: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    NOT_APPLICABLE: "bg-muted text-muted-foreground border-border",
    UNKNOWN:        "bg-muted/40 text-muted-foreground border-border",
  };
  const label: Record<string, string> = {
    PASS: "Pass", FAIL: "Fail", PARTIAL: "Partial",
    PENDING_REVIEW: "Review", NOT_APPLICABLE: "N/A", UNKNOWN: "—",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium whitespace-nowrap ${map[status] ?? map.UNKNOWN}`}>
      <StatusIcon status={status} />
      {label[status] ?? status}
    </span>
  );
}

function RiskTierBadge({ tier }: { tier: "HIGH" | "MEDIUM" | "LOW" }) {
  const map = { HIGH: "text-red-400 bg-red-500/10 border-red-500/20", MEDIUM: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", LOW: "text-green-400 bg-green-500/10 border-green-500/20" };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${map[tier]}`}>{tier}</span>;
}

// ── Summary stats ─────────────────────────────────────────────────────────────

function CoveragePill({ label, covered, total, color }: { label: string; covered: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{covered}/{total}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] text-muted-foreground">{pct}% coverage</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ComplianceMapPage() {
  const api = useApi();
  const [controls, setControls] = useState<ComplianceControl[]>([]);
  const [filter, setFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all controls across all frameworks
    Promise.all([
      api.get<{ controls: ComplianceControl[] }>("/compliance?framework=DPDP"),
      api.get<{ controls: ComplianceControl[] }>("/compliance?framework=ISO42001"),
      api.get<{ controls: ComplianceControl[] }>("/compliance?framework=ISO42005"),
      api.get<{ controls: ComplianceControl[] }>("/compliance?framework=SOC2"),
    ])
      .then(([a, b, c, d]) => {
        setControls([
          ...(a.controls ?? []),
          ...(b.controls ?? []),
          ...(c.controls ?? []),
          ...(d.controls ?? []),
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredRows = MAPPING.filter((r) => filter === "ALL" || r.riskTier === filter);

  // Coverage computation
  const highRows   = MAPPING.filter((r) => r.riskTier === "HIGH").length;
  const medRows    = MAPPING.filter((r) => r.riskTier === "MEDIUM").length;
  const lowRows    = MAPPING.filter((r) => r.riskTier === "LOW").length;

  // For each row: has at least one PASS control → "covered"
  const rowStatus = (row: MappingRow): ControlStatus | "UNKNOWN" => {
    if (controls.length === 0) return "UNKNOWN";
    const matching = controls.filter((c) =>
      row.iso42001.clause.includes(c.controlId) || row.controlIds.includes(c.controlId)
    );
    if (matching.length === 0) return "UNKNOWN";
    if (matching.every((c) => c.status === "PASS")) return "PASS";
    if (matching.some((c) => c.status === "FAIL")) return "FAIL";
    return "PARTIAL";
  };

  // Count controls by status across rows
  const byStatus = MAPPING.reduce((acc, row) => {
    const s = rowStatus(row);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Cross-Regulation Compliance Map
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ISO 42001 · DPDP Act 2023 · EU AI Act 2024 · ISO 42005 — requirement cross-reference
          </p>
        </div>
      </div>

      {/* Coverage summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Framework Coverage</p>
            <CoveragePill label="ISO 42001" covered={controls.filter((c) => c.controlId.includes("ISO") && c.status === "PASS").length} total={controls.filter((c) => c.controlId.includes("ISO")).length} color="#3b82f6" />
            <CoveragePill label="DPDP Act"  covered={controls.filter((c) => c.controlId.includes("DPDP") && c.status === "PASS").length} total={controls.filter((c) => c.controlId.includes("DPDP")).length} color="#10b981" />
            <CoveragePill label="All Frameworks" covered={controls.filter((c) => c.status === "PASS").length} total={controls.length} color="#8b5cf6" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Mapping Areas by Status</p>
            <div className="space-y-2">
              {([["PASS","text-green-400"],["PARTIAL","text-yellow-400"],["FAIL","text-red-400"],["UNKNOWN","text-muted-foreground"]] as [string,string][]).map(([s,color]) => (
                <div key={s} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{s === "UNKNOWN" ? "Not assessed" : s}</span>
                  <span className={`font-bold ${color}`}>{byStatus[s] ?? 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Areas by Risk Tier</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-red-400 font-medium">High Risk Areas</span>
                <span className="font-bold">{highRows}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-yellow-400 font-medium">Medium Risk Areas</span>
                <span className="font-bold">{medRows}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-400 font-medium">Low Risk Areas</span>
                <span className="font-bold">{lowRows}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "ALL" ? `All Areas (${MAPPING.length})` : `${f} (${MAPPING.filter((r) => r.riskTier === f).length})`}
          </button>
        ))}
      </div>

      {/* Mapping table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requirement Cross-Reference Matrix</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider min-w-[180px]">Governance Area</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider min-w-[140px]">ISO 42001</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider min-w-[140px]">DPDP Act 2023</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider min-w-[140px]">EU AI Act 2024</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider min-w-[140px]">ISO 42005</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Risk</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => {
                  const status = rowStatus(row);
                  return (
                    <tr key={row.area} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{row.area}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-primary">{row.iso42001.clause}</p>
                        <p className="text-muted-foreground mt-0.5 text-[11px]">{row.iso42001.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        {row.dpdp ? (
                          <>
                            <p className="font-mono text-teal-400">{row.dpdp.section}</p>
                            <p className="text-muted-foreground mt-0.5 text-[11px]">{row.dpdp.title}</p>
                          </>
                        ) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {row.euAiAct ? (
                          <>
                            <p className="font-mono text-purple-400">{row.euAiAct.article}</p>
                            <p className="text-muted-foreground mt-0.5 text-[11px]">{row.euAiAct.title}</p>
                          </>
                        ) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {row.iso42005 ? (
                          <>
                            <p className="font-mono text-cyan-400">{row.iso42005.clause}</p>
                            <p className="text-muted-foreground mt-0.5 text-[11px]">{row.iso42005.title}</p>
                          </>
                        ) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RiskTierBadge tier={row.riskTier} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Regulatory notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "ISO 42001:2023", color: "text-primary", desc: "International standard for AI Management Systems (AIMS). Covers risk, lifecycle, data quality, transparency and organisational controls.", link: "https://www.iso.org/standard/81230.html" },
          { label: "DPDP Act 2023 (India)", color: "text-teal-400", desc: "India's Digital Personal Data Protection Act. Applies to AI systems that process personal data of Indian citizens. Enforced by Data Protection Board.", link: "https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf" },
          { label: "EU AI Act 2024", color: "text-purple-400", desc: "EU Regulation on Artificial Intelligence. Risk-based classification (minimal, limited, high-risk, prohibited). Applies to AI placed on EU market.", link: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689" },
        ].map((r) => (
          <Card key={r.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-semibold ${r.color}`}>{r.label}</p>
                <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
