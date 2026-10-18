/**
 * Board-approved AI Governance Policy Framework — reference document set.
 *
 * The document hierarchy a regulated entity is expected to hold: one
 * Board-approved policy at the apex, a governance manual beneath it, and the
 * operating procedures that make the policy executable. Each entry records
 * which existing enterprise structure it plugs into (ERM, MRM, IT governance,
 * cyber, privacy) so the framework integrates rather than duplicates.
 */

export type PolicyDocTypeKey =
  | "POLICY"
  | "MANUAL"
  | "PROCEDURE"
  | "STANDARD"
  | "GUIDELINE"
  | "CHARTER"
  | "SOP";

export interface PolicyDocSeed {
  docCode: string;
  title: string;
  type: PolicyDocTypeKey;
  summary: string;
  ownerRole: string;
  approverRole: string;
  /** Existing enterprise structures this document integrates with. */
  integratesWith: string[];
  /** Framework requirements this document evidences. */
  frameworkRefs: string[];
}

export const INTEGRATION_TARGETS = [
  "ERM",
  "MRM",
  "IT_GOVERNANCE",
  "CYBER",
  "PRIVACY",
  "OUTSOURCING",
  "INTERNAL_AUDIT",
] as const;

export const POLICY_CATALOG: PolicyDocSeed[] = [
  // ── Apex: Board-approved policy ────────────────────────────────────────────
  {
    docCode: "AI-POL-001",
    title: "Enterprise AI Governance Policy",
    type: "POLICY",
    summary:
      "Board-approved apex policy setting the enterprise's principles, risk appetite, governance structure and accountability for the development, procurement and use of AI. Establishes the mandate for the AI Management System and integrates AI risk into the existing enterprise risk taxonomy.",
    ownerRole: "Chief Risk Officer",
    approverRole: "Board of Directors",
    integratesWith: ["ERM", "MRM", "IT_GOVERNANCE"],
    frameworkRefs: ["ISO42001-5.2", "A.2.2", "A.2.3"],
  },
  {
    docCode: "AI-CHR-001",
    title: "AI Governance Committee Charter",
    type: "CHARTER",
    summary:
      "Constitution of the AI Governance Committee — composition, quorum, decision rights, escalation thresholds to the Board Risk Committee, and the standing agenda covering model inventory, risk exposure, incidents and KRI performance.",
    ownerRole: "Company Secretary",
    approverRole: "Board Risk Committee",
    integratesWith: ["ERM", "IT_GOVERNANCE"],
    frameworkRefs: ["ISO42001-5.3", "A.3.2"],
  },

  // ── Tier 2: Manual ─────────────────────────────────────────────────────────
  {
    docCode: "AI-MAN-001",
    title: "AI Management System Manual",
    type: "MANUAL",
    summary:
      "The AIMS manual: scope and boundaries, interested parties, process interactions, the Statement of Applicability, and the documented information controls required by ISO/IEC 42001 Clauses 4 to 10.",
    ownerRole: "Head of Compliance",
    approverRole: "Chief Risk Officer",
    integratesWith: ["ERM", "INTERNAL_AUDIT"],
    frameworkRefs: ["ISO42001-4.3", "ISO42001-4.4", "ISO42001-7.5"],
  },

  // ── Tier 3: Procedures ─────────────────────────────────────────────────────
  {
    docCode: "AI-PRO-001",
    title: "AI Use Case Intake and Risk Classification Procedure",
    type: "PROCEDURE",
    summary:
      "How AI use cases enter governance: registration in the inventory, the risk classification questionnaire, tiering into Minimal / Low / Moderate / High, and the differentiated control requirements and approval routing that follow from the tier.",
    ownerRole: "Head of Model Risk",
    approverRole: "AI Governance Committee",
    integratesWith: ["ERM", "MRM"],
    frameworkRefs: ["ISO42001-6.1.2", "A.6.2.2"],
  },
  {
    docCode: "AI-PRO-002",
    title: "AI Risk Assessment and Treatment Procedure",
    type: "PROCEDURE",
    summary:
      "The repeatable AI risk assessment method — risk criteria, identification, analysis, evaluation and treatment selection — producing residual risk positions accepted by named risk owners and feeding the enterprise risk register.",
    ownerRole: "Head of Model Risk",
    approverRole: "Chief Risk Officer",
    integratesWith: ["ERM", "MRM"],
    frameworkRefs: ["ISO42001-6.1.2", "ISO42001-6.1.3", "ISO42001-8.2"],
  },
  {
    docCode: "AI-PRO-003",
    title: "AI System Impact Assessment Procedure",
    type: "PROCEDURE",
    summary:
      "Assessment of consequences for individuals, groups and society across the AI life cycle, covering fairness, transparency, explainability, human agency, privacy and environmental impact. Aligned to ISO/IEC 42005 and triggered by tier and material change.",
    ownerRole: "Head of Compliance",
    approverRole: "AI Governance Committee",
    integratesWith: ["PRIVACY", "ERM"],
    frameworkRefs: ["ISO42001-6.1.4", "A.5.2", "A.5.4", "A.5.5"],
  },
  {
    docCode: "AI-PRO-004",
    title: "AI System Development Life Cycle Procedure",
    type: "PROCEDURE",
    summary:
      "Control gates across design, development, verification, validation, deployment and decommissioning — including documentation, event logging and the evidence required to pass each gate.",
    ownerRole: "Head of AI Engineering",
    approverRole: "Chief Technology Officer",
    integratesWith: ["IT_GOVERNANCE", "MRM"],
    frameworkRefs: ["A.6.1.3", "A.6.2.3", "A.6.2.4", "A.6.2.5"],
  },
  {
    docCode: "AI-PRO-005",
    title: "Model Validation and Independent Review Procedure",
    type: "PROCEDURE",
    summary:
      "Independent validation aligned to RBI model risk management expectations: conceptual soundness review, outcome analysis, back-testing, benchmarking, tier-based revalidation frequency, and the finding and limitation register.",
    ownerRole: "Head of Model Validation",
    approverRole: "Chief Risk Officer",
    integratesWith: ["MRM", "ERM", "INTERNAL_AUDIT"],
    frameworkRefs: ["A.6.2.4", "ISO42001-9.1"],
  },
  {
    docCode: "AI-PRO-006",
    title: "AI Data Governance Procedure",
    type: "PROCEDURE",
    summary:
      "Governance of data across the AI life cycle — acquisition, lawful basis, provenance and lineage, quality thresholds, preparation methods, retention and disposal — for both training and inference data.",
    ownerRole: "Chief Data Officer",
    approverRole: "Data Governance Council",
    integratesWith: ["PRIVACY", "IT_GOVERNANCE"],
    frameworkRefs: ["A.7.2", "A.7.3", "A.7.4", "A.7.5", "A.7.6"],
  },
  {
    docCode: "AI-PRO-007",
    title: "DPDP Compliance Procedure for AI Systems",
    type: "PROCEDURE",
    summary:
      "Operationalises the Digital Personal Data Protection Act, 2023 for AI: notice and consent capture, purpose limitation, data principal rights fulfilment, breach notification, and the consent-withdrawal path including downstream model and dataset treatment.",
    ownerRole: "Data Protection Officer",
    approverRole: "Chief Risk Officer",
    integratesWith: ["PRIVACY", "ERM"],
    frameworkRefs: ["DPDP-6.1", "DPDP-7.2", "DPDP-8.1"],
  },
  {
    docCode: "AI-PRO-008",
    title: "Third-Party and Vendor AI Procedure",
    type: "PROCEDURE",
    summary:
      "Due diligence and ongoing oversight for externally sourced AI — model providers, API services and embedded AI in vendor products. Covers responsibility allocation, contractual clauses, concentration limits, audit rights and exit planning.",
    ownerRole: "Head of Vendor Management",
    approverRole: "AI Governance Committee",
    integratesWith: ["OUTSOURCING", "ERM", "CYBER"],
    frameworkRefs: ["A.10.2", "A.10.3"],
  },
  {
    docCode: "AI-PRO-009",
    title: "AI Monitoring and Guardrails Procedure",
    type: "PROCEDURE",
    summary:
      "Post-deployment surveillance: performance and drift thresholds, bias monitoring, output guardrails for generative systems, alert routing, and the trigger conditions that force revalidation or suspension.",
    ownerRole: "Head of AI Operations",
    approverRole: "Chief Technology Officer",
    integratesWith: ["IT_GOVERNANCE", "MRM"],
    frameworkRefs: ["A.6.2.6", "ISO42001-9.1"],
  },
  {
    docCode: "AI-PRO-010",
    title: "AI Incident Management and Reporting Procedure",
    type: "PROCEDURE",
    summary:
      "Identification, classification, escalation and root-cause analysis of AI incidents, with regulatory notification criteria, customer communication protocol, and the link into the non-conformity and CAPA register.",
    ownerRole: "Head of Operational Risk",
    approverRole: "Chief Risk Officer",
    integratesWith: ["ERM", "CYBER"],
    frameworkRefs: ["ISO42001-10.2", "A.8.4"],
  },
  {
    docCode: "AI-PRO-011",
    title: "Human Oversight and Override Procedure",
    type: "PROCEDURE",
    summary:
      "Defines meaningful human control by risk tier — where a human must review before action, override authority and its audit trail, competence requirements for reviewers, and testing of the override path.",
    ownerRole: "Head of Compliance",
    approverRole: "AI Governance Committee",
    integratesWith: ["ERM"],
    frameworkRefs: ["A.9.2", "A.9.4"],
  },
  {
    docCode: "AI-STD-001",
    title: "AI Transparency and Explainability Standard",
    type: "STANDARD",
    summary:
      "Minimum explainability by use case tier, customer-facing AI disclosure requirements, adverse-action reason codes for credit and underwriting decisions, and the model documentation pack contents.",
    ownerRole: "Head of Model Risk",
    approverRole: "AI Governance Committee",
    integratesWith: ["MRM", "ERM"],
    frameworkRefs: ["A.8.2", "A.6.2.7"],
  },
  {
    docCode: "AI-STD-002",
    title: "AI Security and Adversarial Resilience Standard",
    type: "STANDARD",
    summary:
      "Security controls for AI assets — model and prompt access control, prompt-injection defences, output filtering, supply chain integrity for model artefacts, and mandatory red-team testing before production release.",
    ownerRole: "Chief Information Security Officer",
    approverRole: "Chief Technology Officer",
    integratesWith: ["CYBER", "IT_GOVERNANCE"],
    frameworkRefs: ["A.6.2.6", "ISO42001-8.1"],
  },
  {
    docCode: "AI-SOP-001",
    title: "AI Governance Committee Reporting SOP",
    type: "SOP",
    summary:
      "The reporting cycle into senior management and the Board: KRI pack assembly across technology, cyber, AI and data domains, inventory and exposure movement, incident summary, and open remediation status.",
    ownerRole: "Head of Compliance",
    approverRole: "AI Governance Committee",
    integratesWith: ["ERM", "IT_GOVERNANCE"],
    frameworkRefs: ["ISO42001-9.1", "ISO42001-9.3"],
  },
];

// ── RACI — AI lifecycle operating model ──────────────────────────────────────

export type GovernanceLayerKey =
  | "BOARD"
  | "BOARD_COMMITTEE"
  | "EXECUTIVE"
  | "MANAGEMENT"
  | "OPERATIONAL";

export interface RaciSeed {
  activity: string;
  lifecyclePhase: string;
  layer: GovernanceLayerKey;
  responsible: string[];
  accountable: string;
  consulted: string[];
  informed: string[];
  sortOrder: number;
}

export const LIFECYCLE_PHASES = [
  "Intake & Assess",
  "Build or Procure",
  "Validate & Approve",
  "Deploy",
  "Operate & Monitor",
  "Retire",
] as const;

export const RACI_CATALOG: RaciSeed[] = [
  {
    activity: "Approve the enterprise AI policy and risk appetite",
    lifecyclePhase: "Intake & Assess",
    layer: "BOARD",
    responsible: ["Chief Risk Officer"],
    accountable: "Board of Directors",
    consulted: ["Head of Compliance", "Chief Technology Officer"],
    informed: ["All Business Units"],
    sortOrder: 10,
  },
  {
    activity: "Register AI use case in the inventory",
    lifecyclePhase: "Intake & Assess",
    layer: "OPERATIONAL",
    responsible: ["Product Owner"],
    accountable: "Business Unit Head",
    consulted: ["Head of Model Risk"],
    informed: ["AI Governance Committee"],
    sortOrder: 20,
  },
  {
    activity: "Complete AI risk classification questionnaire and assign tier",
    lifecyclePhase: "Intake & Assess",
    layer: "OPERATIONAL",
    responsible: ["Product Owner", "Head of Model Risk"],
    accountable: "Head of Model Risk",
    consulted: ["Data Protection Officer", "Chief Information Security Officer"],
    informed: ["AI Governance Committee"],
    sortOrder: 30,
  },
  {
    activity: "Conduct AI system impact assessment for High and Critical tiers",
    lifecyclePhase: "Intake & Assess",
    layer: "MANAGEMENT",
    responsible: ["Head of Compliance"],
    accountable: "Chief Risk Officer",
    consulted: ["Legal", "Data Protection Officer", "Product Owner"],
    informed: ["AI Governance Committee"],
    sortOrder: 40,
  },
  {
    activity: "Assess lawful basis and consent under the DPDP Act",
    lifecyclePhase: "Intake & Assess",
    layer: "MANAGEMENT",
    responsible: ["Data Protection Officer"],
    accountable: "Chief Risk Officer",
    consulted: ["Legal", "Chief Data Officer"],
    informed: ["Product Owner"],
    sortOrder: 50,
  },
  {
    activity: "Perform third-party AI due diligence and contract review",
    lifecyclePhase: "Build or Procure",
    layer: "MANAGEMENT",
    responsible: ["Head of Vendor Management"],
    accountable: "Chief Technology Officer",
    consulted: ["Legal", "Chief Information Security Officer", "Head of Model Risk"],
    informed: ["AI Governance Committee"],
    sortOrder: 60,
  },
  {
    activity: "Develop the AI system against documented requirements",
    lifecyclePhase: "Build or Procure",
    layer: "OPERATIONAL",
    responsible: ["AI Engineering Team"],
    accountable: "Head of AI Engineering",
    consulted: ["Chief Data Officer", "Product Owner"],
    informed: ["Head of Model Risk"],
    sortOrder: 70,
  },
  {
    activity: "Implement and evidence tier-based AI controls",
    lifecyclePhase: "Build or Procure",
    layer: "OPERATIONAL",
    responsible: ["AI Engineering Team", "Product Owner"],
    accountable: "Head of AI Engineering",
    consulted: ["Head of Compliance"],
    informed: ["Head of Internal Audit"],
    sortOrder: 80,
  },
  {
    activity: "Perform independent model validation",
    lifecyclePhase: "Validate & Approve",
    layer: "MANAGEMENT",
    responsible: ["Head of Model Validation"],
    accountable: "Chief Risk Officer",
    consulted: ["Head of AI Engineering"],
    informed: ["AI Governance Committee", "Head of Internal Audit"],
    sortOrder: 90,
  },
  {
    activity: "Conduct bias, fairness and adversarial robustness testing",
    lifecyclePhase: "Validate & Approve",
    layer: "MANAGEMENT",
    responsible: ["Head of Model Validation", "Chief Information Security Officer"],
    accountable: "Head of Model Risk",
    consulted: ["Head of Compliance"],
    informed: ["AI Governance Committee"],
    sortOrder: 100,
  },
  {
    activity: "Approve deployment for Moderate tier use cases",
    lifecyclePhase: "Validate & Approve",
    layer: "EXECUTIVE",
    responsible: ["Head of Model Risk"],
    accountable: "AI Governance Committee",
    consulted: ["Head of Compliance", "Chief Information Security Officer"],
    informed: ["Product Owner"],
    sortOrder: 110,
  },
  {
    activity: "Approve deployment for High and Critical tier use cases",
    lifecyclePhase: "Validate & Approve",
    layer: "BOARD_COMMITTEE",
    responsible: ["AI Governance Committee"],
    accountable: "Board Risk Committee",
    consulted: ["Chief Risk Officer", "Legal", "Chief Technology Officer"],
    informed: ["Board of Directors"],
    sortOrder: 120,
  },
  {
    activity: "Release the AI system into production",
    lifecyclePhase: "Deploy",
    layer: "OPERATIONAL",
    responsible: ["AI Engineering Team"],
    accountable: "Head of AI Engineering",
    consulted: ["Head of AI Operations"],
    informed: ["Product Owner", "AI Governance Committee"],
    sortOrder: 130,
  },
  {
    activity: "Monitor performance, drift, bias and guardrail breaches",
    lifecyclePhase: "Operate & Monitor",
    layer: "OPERATIONAL",
    responsible: ["Head of AI Operations"],
    accountable: "Chief Technology Officer",
    consulted: ["Head of Model Risk"],
    informed: ["AI Governance Committee"],
    sortOrder: 140,
  },
  {
    activity: "Triage and escalate AI incidents",
    lifecyclePhase: "Operate & Monitor",
    layer: "MANAGEMENT",
    responsible: ["Head of Operational Risk"],
    accountable: "Chief Risk Officer",
    consulted: ["Head of AI Operations", "Legal", "Data Protection Officer"],
    informed: ["Board Risk Committee"],
    sortOrder: 150,
  },
  {
    activity: "Report integrated technology, cyber, AI and data KRIs",
    lifecyclePhase: "Operate & Monitor",
    layer: "BOARD_COMMITTEE",
    responsible: ["Head of Compliance"],
    accountable: "Chief Risk Officer",
    consulted: ["Chief Technology Officer", "Chief Information Security Officer", "Chief Data Officer"],
    informed: ["Board Risk Committee"],
    sortOrder: 160,
  },
  {
    activity: "Perform periodic revalidation per model tier",
    lifecyclePhase: "Operate & Monitor",
    layer: "MANAGEMENT",
    responsible: ["Head of Model Validation"],
    accountable: "Chief Risk Officer",
    consulted: ["Head of AI Engineering"],
    informed: ["AI Governance Committee"],
    sortOrder: 170,
  },
  {
    activity: "Conduct internal audit of the AI management system",
    lifecyclePhase: "Operate & Monitor",
    layer: "BOARD_COMMITTEE",
    responsible: ["Head of Internal Audit"],
    accountable: "Board Audit Committee",
    consulted: ["Head of Compliance"],
    informed: ["Board of Directors", "Chief Risk Officer"],
    sortOrder: 180,
  },
  {
    activity: "Decommission the AI system and dispose of data",
    lifecyclePhase: "Retire",
    layer: "OPERATIONAL",
    responsible: ["Head of AI Engineering", "Chief Data Officer"],
    accountable: "Business Unit Head",
    consulted: ["Data Protection Officer", "Head of Compliance"],
    informed: ["AI Governance Committee"],
    sortOrder: 190,
  },
];
