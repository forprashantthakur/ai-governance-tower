"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ScrollText,
  Layers,
  ClipboardList,
  Landmark,
  LineChart,
  SearchCheck,
  FlaskConical,
  AlertOctagon,
  Route as RouteIcon,
  Gauge,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoSeedButton } from "@/components/shared/demo-seed-button";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Workstream {
  key: string;
  label: string;
  href: string;
  score: number;
  total: number;
  complete: number;
  detail: string;
}

interface Blockers {
  soaUnjustified: number;
  gapCritical: number;
  ncrMajorOpen: number;
  remediationP1Open: number;
  mrmOverdue: number;
  kriRed: number;
  testsIneffective: number;
  boardTrainingOutstanding: boolean;
}

interface ReadinessResponse {
  overallReadiness: number;
  workstreamsStarted: number;
  workstreamsTotal: number;
  workstreams: Workstream[];
  blockers: Blockers;
}

// ── Programme structure ───────────────────────────────────────────────────────
// Mirrors the two-phase engagement shape: build the framework, then prove it
// works. Cross-cutting workstreams run across both.

const ICONS: Record<string, LucideIcon> = {
  policy: ScrollText,
  aims: Layers,
  soa: ClipboardList,
  "free-ai": Landmark,
  "model-risk": LineChart,
  gap: SearchCheck,
  "control-testing": FlaskConical,
  ncr: AlertOctagon,
  remediation: RouteIcon,
  kri: Gauge,
  training: GraduationCap,
};

const PHASES: {
  id: string;
  title: string;
  subtitle: string;
  keys: string[];
}[] = [
  {
    id: "phase-1",
    title: "Phase 1 — Framework, Policy & Procedures",
    subtitle:
      "Board-approved AI policy, the AI Management System, applicability decisions and regulatory alignment.",
    keys: ["policy", "aims", "soa", "free-ai"],
  },
  {
    id: "phase-2",
    title: "Phase 2 — Gap Assessment, Validation & Control Testing",
    subtitle:
      "Independent assurance that the framework operates effectively, with findings tracked to closure.",
    keys: ["gap", "control-testing", "ncr", "remediation"],
  },
  {
    id: "continuous",
    title: "Continuous Oversight",
    subtitle:
      "The capabilities that keep running once the engagement ends — model validation, Board reporting and competence.",
    keys: ["model-risk", "kri", "training"],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreTone(score: number, started: boolean) {
  if (!started) return { text: "text-muted-foreground", bar: "bg-muted-foreground/30" };
  if (score >= 80) return { text: "text-green-400", bar: "bg-green-500" };
  if (score >= 50) return { text: "text-yellow-400", bar: "bg-yellow-500" };
  return { text: "text-red-400", bar: "bg-red-500" };
}

function phaseScore(workstreams: Workstream[], keys: string[]): { score: number; started: number } {
  const rows = workstreams.filter((w) => keys.includes(w.key) && w.total > 0);
  if (rows.length === 0) return { score: 0, started: 0 };
  return {
    score: Math.round(rows.reduce((s, w) => s + w.score, 0) / rows.length),
    started: rows.length,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GovernanceProgrammePage() {
  const { get } = useApi();
  const [data, setData] = useState<ReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get<ReadinessResponse>("/governance/readiness");
      setData(res);
      setErrMsg(null);
    } catch (err) {
      setData(null);
      setErrMsg(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
    // `get` is intentionally not a dependency. useApi() returns a fresh object
    // on every render, so depending on it recreates this callback each render,
    // which re-fires the effect below and loops requests until the middleware
    // rate-limits them. Every other page in the app omits it for the same reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">Could not load programme readiness</p>
            {errMsg && (
              <p className="text-xs text-muted-foreground mt-2 font-mono break-words max-w-md mx-auto">
                {errMsg}
              </p>
            )}
            <button
              onClick={load}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overallReadiness, workstreams, workstreamsStarted, workstreamsTotal, blockers } = data;
  const overallTone = scoreTone(overallReadiness, workstreamsStarted > 0);

  const blockerRows: { label: string; count: number; href: string }[] = [
    { label: "Critical gaps still open", count: blockers.gapCritical, href: "/gap-assessment" },
    { label: "Major non-conformities open", count: blockers.ncrMajorOpen, href: "/ncr-capa" },
    { label: "P1 remediation items outstanding", count: blockers.remediationP1Open, href: "/remediation" },
    { label: "Models overdue for revalidation", count: blockers.mrmOverdue, href: "/model-risk" },
    { label: "Controls assessed ineffective", count: blockers.testsIneffective, href: "/control-testing" },
    { label: "KRIs breaching risk appetite", count: blockers.kriRed, href: "/kri" },
    { label: "Annex A exclusions without justification", count: blockers.soaUnjustified, href: "/soa" },
  ].filter((b) => b.count > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">AI Governance Programme</h1>
        <p className="text-muted-foreground mt-1">
          Readiness across every workstream — aligned to ISO/IEC 42001, RBI expectations and the
          DPDP Act, 2023.
        </p>
      </div>

      {/* One-click CIO demo — seeds a fully-populated programme into a separate
          organization so a walkthrough never touches this organization's data. */}
      <DemoSeedButton />

      {/* Overall readiness */}
      <Card>
        <CardContent className="p-6 grid gap-6 md:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-5">
            <div className="relative h-28 w-28 shrink-0">
              <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="10"
                  className="stroke-muted"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  className={
                    overallReadiness >= 80
                      ? "stroke-green-500"
                      : overallReadiness >= 50
                      ? "stroke-yellow-500"
                      : "stroke-red-500"
                  }
                  strokeDasharray={`${(overallReadiness / 100) * 2 * Math.PI * 42} ${
                    2 * Math.PI * 42
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${overallTone.text}`}>
                  {overallReadiness}%
                </span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Ready
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Overall programme readiness</p>
              <p className="text-sm text-muted-foreground mt-1">
                {workstreamsStarted} of {workstreamsTotal} workstreams underway
              </p>
              {workstreamsStarted === 0 && (
                <p className="text-xs text-muted-foreground mt-2 max-w-xs">
                  Nothing configured yet. Open a workstream below and load its standard
                  framework to begin.
                </p>
              )}
            </div>
          </div>

          {/* Phase summary */}
          <div className="grid gap-3 sm:grid-cols-3 content-center">
            {PHASES.map((phase) => {
              const { score, started } = phaseScore(workstreams, phase.keys);
              const tone = scoreTone(score, started > 0);
              return (
                <div key={phase.id} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground truncate">
                    {phase.title.split(" — ")[0]}
                  </p>
                  <p className={`text-xl font-bold mt-0.5 ${tone.text}`}>
                    {started > 0 ? `${score}%` : "—"}
                  </p>
                  <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${tone.bar} transition-all`}
                      style={{ width: `${started > 0 ? score : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Blockers */}
      {blockerRows.length > 0 && (
        <Card className="border-red-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Outstanding items before sign-off
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {blockerRows.map((b) => (
              <Link
                key={b.label}
                href={b.href}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/40 hover:bg-muted/50 transition-colors"
              >
                <span className="text-muted-foreground">{b.label}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <Badge variant="danger">{b.count}</Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {blockerRows.length === 0 && workstreamsStarted > 0 && (
        <Card className="border-green-500/20">
          <CardContent className="py-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-green-400 shrink-0" />
            <p className="text-sm">
              No critical blockers outstanding across the programme.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Phases */}
      {PHASES.map((phase) => {
        const rows = phase.keys
          .map((k) => workstreams.find((w) => w.key === k))
          .filter((w): w is Workstream => w !== undefined);

        return (
          <div key={phase.id}>
            <div className="mb-3">
              <h2 className="text-lg font-semibold">{phase.title}</h2>
              <p className="text-sm text-muted-foreground">{phase.subtitle}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {rows.map((w) => {
                const Icon = ICONS[w.key] ?? Layers;
                const started = w.total > 0;
                const tone = scoreTone(w.score, started);
                return (
                  <Link key={w.key} href={w.href} className="block">
                    <Card className="h-full hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <span className={`text-xl font-bold ${tone.text}`}>
                            {started ? `${w.score}%` : "—"}
                          </span>
                        </div>

                        <p className="text-sm font-medium mt-3 leading-tight">{w.label}</p>

                        <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${tone.bar} transition-all`}
                            style={{ width: `${started ? w.score : 0}%` }}
                          />
                        </div>

                        <p className="text-xs text-muted-foreground mt-2 leading-snug">
                          {w.detail}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
