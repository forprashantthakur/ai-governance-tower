/**
 * Integrated Technology / Cyber / AI / Data risk KRI catalogue.
 *
 * Designed for senior-management and Board Risk Committee reporting: one
 * dashboard where AI risk sits alongside the technology, cyber and data risk
 * indicators the committee already reviews, rather than in a separate pack.
 *
 * Thresholds follow a RAG convention. `direction` decides which side of the
 * threshold is good — for LOWER_IS_BETTER a reading at or below `green` is
 * green; for HIGHER_IS_BETTER a reading at or above `green` is green.
 */

export type KriDomainKey = "TECHNOLOGY" | "CYBER" | "AI" | "DATA";
export type KriDirectionKey = "LOWER_IS_BETTER" | "HIGHER_IS_BETTER";

export interface KriSeed {
  kriCode: string;
  name: string;
  domain: KriDomainKey;
  description: string;
  formula: string;
  unit: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY";
  direction: KriDirectionKey;
  greenThreshold: number;
  amberThreshold: number;
  redThreshold: number;
  ownerRole: string;
  reportedTo: string;
}

export const KRI_CATALOG: KriSeed[] = [
  // ── AI risk ────────────────────────────────────────────────────────────────
  {
    kriCode: "AI-KRI-01",
    name: "AI models in production without current validation",
    domain: "AI",
    description:
      "Proportion of production AI models whose independent validation has lapsed beyond the tier-defined revalidation cycle. Directly evidences RBI model risk management expectations.",
    formula: "(Models past revalidation due date ÷ Total production models) × 100",
    unit: "%",
    frequency: "MONTHLY",
    direction: "LOWER_IS_BETTER",
    greenThreshold: 5,
    amberThreshold: 15,
    redThreshold: 25,
    ownerRole: "Head of Model Risk",
    reportedTo: "Board Risk Committee",
  },
  {
    kriCode: "AI-KRI-02",
    name: "High-risk AI use cases without documented impact assessment",
    domain: "AI",
    description:
      "Number of AI use cases rated High or Critical that have no completed AI system impact assessment (ISO/IEC 42001 Clause 6.1.4).",
    formula: "Count of High/Critical use cases with no signed-off impact assessment",
    unit: "count",
    frequency: "MONTHLY",
    direction: "LOWER_IS_BETTER",
    greenThreshold: 0,
    amberThreshold: 2,
    redThreshold: 5,
    ownerRole: "Head of Compliance",
    reportedTo: "Board Risk Committee",
  },
  {
    kriCode: "AI-KRI-03",
    name: "Model performance drift breaches",
    domain: "AI",
    description:
      "Production models whose accuracy, PSI or population drift exceeded the approved tolerance during the period without remediation inside SLA.",
    formula: "Count of models breaching drift tolerance and past remediation SLA",
    unit: "count",
    frequency: "MONTHLY",
    direction: "LOWER_IS_BETTER",
    greenThreshold: 0,
    amberThreshold: 3,
    redThreshold: 6,
    ownerRole: "Head of AI Operations",
    reportedTo: "Executive Risk Committee",
  },
  {
    kriCode: "AI-KRI-04",
    name: "Shadow AI detections",
    domain: "AI",
    description:
      "AI or GenAI usage identified outside the approved inventory and intake process — a leading indicator of ungoverned AI adoption.",
    formula: "Count of unregistered AI systems detected via discovery scans",
    unit: "count",
    frequency: "MONTHLY",
    direction: "LOWER_IS_BETTER",
    greenThreshold: 0,
    amberThreshold: 3,
    redThreshold: 8,
    ownerRole: "Chief Technology Officer",
    reportedTo: "Executive Risk Committee",
  },
  {
    kriCode: "AI-KRI-05",
    name: "Human oversight coverage for consequential decisions",
    domain: "AI",
    description:
      "Proportion of AI systems making decisions materially affecting customers that have a documented and tested human-in-the-loop override.",
    formula: "(Consequential AI systems with tested override ÷ All consequential AI systems) × 100",
    unit: "%",
    frequency: "QUARTERLY",
    direction: "HIGHER_IS_BETTER",
    greenThreshold: 95,
    amberThreshold: 85,
    redThreshold: 70,
    ownerRole: "Head of Compliance",
    reportedTo: "Board Risk Committee",
  },
  {
    kriCode: "AI-KRI-06",
    name: "AI incidents raised",
    domain: "AI",
    description:
      "AI-specific incidents — harmful output, discriminatory outcome, hallucination causing customer detriment, or unexplained decision — logged in the period.",
    formula: "Count of AI incidents logged, weighted by severity",
    unit: "count",
    frequency: "MONTHLY",
    direction: "LOWER_IS_BETTER",
    greenThreshold: 2,
    amberThreshold: 6,
    redThreshold: 12,
    ownerRole: "Head of Operational Risk",
    reportedTo: "Board Risk Committee",
  },

  // ── Cyber risk ─────────────────────────────────────────────────────────────
  {
    kriCode: "CY-KRI-01",
    name: "AI systems without adversarial / red-team testing",
    domain: "CYBER",
    description:
      "Production AI systems, particularly LLM-based, that have not undergone prompt-injection and adversarial robustness testing in the last 12 months.",
    formula: "(AI systems without red-team test in 12m ÷ Total production AI systems) × 100",
    unit: "%",
    frequency: "QUARTERLY",
    direction: "LOWER_IS_BETTER",
    greenThreshold: 10,
    amberThreshold: 25,
    redThreshold: 40,
    ownerRole: "Chief Information Security Officer",
    reportedTo: "Board Risk Committee",
  },
  {
    kriCode: "CY-KRI-02",
    name: "Prompt injection / jailbreak attempts blocked",
    domain: "CYBER",
    description:
      "Volume of blocked adversarial prompts against customer-facing GenAI surfaces. A sustained rise signals active targeting of AI channels.",
    formula: "Count of guardrail-blocked adversarial prompts",
    unit: "count",
    frequency: "MONTHLY",
    direction: "LOWER_IS_BETTER",
    greenThreshold: 50,
    amberThreshold: 200,
    redThreshold: 500,
    ownerRole: "Chief Information Security Officer",
    reportedTo: "Executive Risk Committee",
  },
  {
    kriCode: "CY-KRI-03",
    name: "Critical vulnerabilities in AI/ML supply chain",
    domain: "CYBER",
    description:
      "Open critical or high CVEs in model-serving infrastructure, ML libraries and third-party model artefacts past the remediation SLA.",
    formula: "Count of open critical/high CVEs in AI stack past SLA",
    unit: "count",
    frequency: "MONTHLY",
    direction: "LOWER_IS_BETTER",
    greenThreshold: 0,
    amberThreshold: 3,
    redThreshold: 8,
    ownerRole: "Chief Information Security Officer",
    reportedTo: "Executive Risk Committee",
  },

  // ── Data risk ──────────────────────────────────────────────────────────────
  {
    kriCode: "DT-KRI-01",
    name: "AI training datasets without documented provenance",
    domain: "DATA",
    description:
      "Datasets used for model development or fine-tuning that lack a recorded lineage and lawful-basis assessment (ISO/IEC 42001 A.7.5, DPDP Act).",
    formula: "(Datasets without provenance record ÷ Total AI training datasets) × 100",
    unit: "%",
    frequency: "QUARTERLY",
    direction: "LOWER_IS_BETTER",
    greenThreshold: 5,
    amberThreshold: 20,
    redThreshold: 35,
    ownerRole: "Chief Data Officer",
    reportedTo: "Board Risk Committee",
  },
  {
    kriCode: "DT-KRI-02",
    name: "Personal data processed by AI without valid consent basis",
    domain: "DATA",
    description:
      "Instances where an AI system processed personal data with no valid consent or other lawful basis under the DPDP Act, 2023.",
    formula: "Count of processing instances lacking a valid lawful basis",
    unit: "count",
    frequency: "MONTHLY",
    direction: "LOWER_IS_BETTER",
    greenThreshold: 0,
    amberThreshold: 1,
    redThreshold: 3,
    ownerRole: "Data Protection Officer",
    reportedTo: "Board Risk Committee",
  },
  {
    kriCode: "DT-KRI-03",
    name: "Data principal rights requests breaching statutory timeline",
    domain: "DATA",
    description:
      "Access, correction or erasure requests touching AI systems that were not fulfilled within the DPDP Act response window.",
    formula: "(Requests breaching timeline ÷ Total requests received) × 100",
    unit: "%",
    frequency: "MONTHLY",
    direction: "LOWER_IS_BETTER",
    greenThreshold: 2,
    amberThreshold: 8,
    redThreshold: 15,
    ownerRole: "Data Protection Officer",
    reportedTo: "Board Risk Committee",
  },
  {
    kriCode: "DT-KRI-04",
    name: "Training data quality score",
    domain: "DATA",
    description:
      "Composite completeness, accuracy, timeliness and representativeness score across datasets feeding Tier 1 models.",
    formula: "Weighted average of data quality dimension scores for Tier 1 datasets",
    unit: "score",
    frequency: "QUARTERLY",
    direction: "HIGHER_IS_BETTER",
    greenThreshold: 90,
    amberThreshold: 80,
    redThreshold: 70,
    ownerRole: "Chief Data Officer",
    reportedTo: "Executive Risk Committee",
  },

  // ── Technology risk ────────────────────────────────────────────────────────
  {
    kriCode: "TE-KRI-01",
    name: "AI platform availability",
    domain: "TECHNOLOGY",
    description:
      "Availability of model-serving infrastructure supporting customer-facing journeys, measured against the agreed service level.",
    formula: "(Uptime minutes ÷ Total minutes in period) × 100",
    unit: "%",
    frequency: "MONTHLY",
    direction: "HIGHER_IS_BETTER",
    greenThreshold: 99.5,
    amberThreshold: 99,
    redThreshold: 98,
    ownerRole: "Chief Technology Officer",
    reportedTo: "Executive Risk Committee",
  },
  {
    kriCode: "TE-KRI-02",
    name: "AI change failures",
    domain: "TECHNOLOGY",
    description:
      "Model or prompt deployments rolled back, or causing a production incident, as a share of all AI changes released in the period.",
    formula: "(Failed AI changes ÷ Total AI changes released) × 100",
    unit: "%",
    frequency: "MONTHLY",
    direction: "LOWER_IS_BETTER",
    greenThreshold: 5,
    amberThreshold: 12,
    redThreshold: 20,
    ownerRole: "Head of AI Engineering",
    reportedTo: "Executive Risk Committee",
  },
  {
    kriCode: "TE-KRI-03",
    name: "Third-party AI concentration",
    domain: "TECHNOLOGY",
    description:
      "Share of production AI workload dependent on a single external model provider — the core concentration and exit-risk indicator for outsourced AI.",
    formula: "(Workload on largest single AI provider ÷ Total AI workload) × 100",
    unit: "%",
    frequency: "QUARTERLY",
    direction: "LOWER_IS_BETTER",
    greenThreshold: 40,
    amberThreshold: 60,
    redThreshold: 75,
    ownerRole: "Head of Vendor Management",
    reportedTo: "Board Risk Committee",
  },
  {
    kriCode: "TE-KRI-04",
    name: "AI systems without tested business continuity plan",
    domain: "TECHNOLOGY",
    description:
      "Critical AI systems with no fallback path exercised in the last 12 months — covers degradation to a rules engine or manual process.",
    formula: "(Critical AI systems without tested BCP ÷ Total critical AI systems) × 100",
    unit: "%",
    frequency: "QUARTERLY",
    direction: "LOWER_IS_BETTER",
    greenThreshold: 10,
    amberThreshold: 25,
    redThreshold: 40,
    ownerRole: "Head of Business Continuity",
    reportedTo: "Board Risk Committee",
  },
];

/** Resolve a reading to its RAG status using the definition's thresholds. */
export function evaluateKriStatus(
  value: number,
  direction: KriDirectionKey,
  green: number,
  amber: number
): "GREEN" | "AMBER" | "RED" {
  if (direction === "LOWER_IS_BETTER") {
    if (value <= green) return "GREEN";
    if (value <= amber) return "AMBER";
    return "RED";
  }
  if (value >= green) return "GREEN";
  if (value >= amber) return "AMBER";
  return "RED";
}
