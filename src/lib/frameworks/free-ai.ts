/**
 * RBI FREE-AI — Framework for Responsible and Ethical Enablement of
 * Artificial Intelligence in the Financial Sector.
 *
 * Committee report published 13 August 2025, chaired by Dr. Pushpak
 * Bhattacharyya (IIT Bombay).
 *
 * `title` and `description` are taken from the report itself: the 7 Sutras
 * from the summary table, and the 26 recommendation titles from the "Summary
 * of Recommendations" table, along with RBI's own Action and Timeline tags.
 *
 * `applicability` is OUR implementation guidance for a regulated entity — it
 * is not RBI text and should be read as such.
 *
 * Note on status: this is a committee report to the RBI, not a regulation.
 * Nothing here binds a regulated entity on its own. The UI surfaces that
 * caveat; do not remove it.
 */

import type { FreeAiItemSeed } from "./free-ai-types";

export * from "./free-ai-types";

// ── The 7 Sutras — guiding principles ────────────────────────────────────────

const SUTRAS: FreeAiItemSeed[] = [
  {
    itemCode: "SUTRA-1",
    itemType: "SUTRA",
    pillar: "Sutras",
    title: "Trust is the Foundation",
    description: "Trust is non-negotiable and should remain uncompromised.",
    applicability:
      "Trust is treated as a board-level obligation rather than a technical property. Evidence it through the approved AI policy, the risk appetite statement covering AI, and reporting into the Board Risk Committee.",
    actionOwner: "Regulated Entities",
    timeline: "NOT_APPLICABLE",
    ownerRole: "Board of Directors",
  },
  {
    itemCode: "SUTRA-2",
    itemType: "SUTRA",
    pillar: "Sutras",
    title: "People First",
    description:
      "AI should augment human decision-making but defer to human judgment and citizen interest.",
    applicability:
      "Every consequential customer decision retains a documented and tested human override. Map which use cases are advisory and which are automated, and hold the override path under change control.",
    actionOwner: "Regulated Entities",
    timeline: "NOT_APPLICABLE",
    ownerRole: "Head of Compliance",
  },
  {
    itemCode: "SUTRA-3",
    itemType: "SUTRA",
    pillar: "Sutras",
    title: "Innovation over Restraint",
    description: "Foster responsible innovation with purpose.",
    applicability:
      "Governance is calibrated to risk rather than applied uniformly. Low-risk use cases are fast-tracked; controls escalate with the assessed tier so oversight does not become a blanket brake on adoption.",
    actionOwner: "Regulated Entities",
    timeline: "NOT_APPLICABLE",
    ownerRole: "Chief Technology Officer",
  },
  {
    itemCode: "SUTRA-4",
    itemType: "SUTRA",
    pillar: "Sutras",
    title: "Fairness and Equity",
    description: "AI outcomes should be fair and non-discriminatory.",
    applicability:
      "Bias and fairness testing runs before deployment and on a defined cycle thereafter, with results retained. Pay particular attention to credit, underwriting and collections models.",
    actionOwner: "Regulated Entities",
    timeline: "NOT_APPLICABLE",
    ownerRole: "Head of Model Risk",
  },
  {
    itemCode: "SUTRA-5",
    itemType: "SUTRA",
    pillar: "Sutras",
    title: "Accountability",
    description: "Accountability rests with the entities deploying AI.",
    applicability:
      "Outsourcing the model does not outsource the accountability. Every AI system carries a named accountable executive, and third-party AI is governed under the same standard as internally built systems.",
    actionOwner: "Regulated Entities",
    timeline: "NOT_APPLICABLE",
    ownerRole: "Chief Risk Officer",
  },
  {
    itemCode: "SUTRA-6",
    itemType: "SUTRA",
    pillar: "Sutras",
    title: "Understandable by Design",
    description: "Ensure explainability for trust.",
    applicability:
      "Explainability is a design requirement set at intake, not retrofitted. Adverse decisions carry reason codes a customer and a supervisor can both follow.",
    actionOwner: "Regulated Entities",
    timeline: "NOT_APPLICABLE",
    ownerRole: "Head of Model Risk",
  },
  {
    itemCode: "SUTRA-7",
    itemType: "SUTRA",
    pillar: "Sutras",
    title: "Safety, Resilience, and Sustainability",
    description: "AI systems should be secure, resilient and energy efficient.",
    applicability:
      "Adversarial testing, graceful degradation to a non-AI fallback, and tested business continuity for critical AI services. Energy and compute footprint is tracked as part of the sustainability position.",
    actionOwner: "Regulated Entities",
    timeline: "NOT_APPLICABLE",
    ownerRole: "Chief Information Security Officer",
  },
];

// ── Innovation Enablement Framework ──────────────────────────────────────────

const INFRASTRUCTURE: FreeAiItemSeed[] = [
  {
    itemCode: "REC-1",
    itemType: "RECOMMENDATION",
    pillar: "Infrastructure",
    title: "Financial Sector Data Infrastructure",
    description:
      "Build shared, high-quality data infrastructure to support AI development across the financial sector.",
    applicability:
      "Track readiness to consume sector data infrastructure as it emerges, and ensure internal data is catalogued and quality-scored so it can participate.",
    actionOwner: "Regulators and Government",
    timeline: "SHORT_TERM",
    ownerRole: "Chief Data Officer",
  },
  {
    itemCode: "REC-2",
    itemType: "RECOMMENDATION",
    pillar: "Infrastructure",
    title: "AI Innovation Sandbox",
    description:
      "Establish a sandbox environment where AI solutions can be developed and tested with appropriate safeguards.",
    applicability:
      "Maintain an internal pre-production environment with representative but protected data, so experimentation never runs against live customer data outside controls.",
    actionOwner: "Regulators, RBI, MeitY, FSRs",
    timeline: "SHORT_TERM",
    ownerRole: "Head of AI Engineering",
  },
  {
    itemCode: "REC-3",
    itemType: "RECOMMENDATION",
    pillar: "Infrastructure",
    title: "Incentives and Funding Support",
    description:
      "Provide incentives and funding to accelerate responsible AI adoption in the financial sector.",
    applicability:
      "Primarily directed at regulators and government. Monitor for schemes the institution can participate in and align the AI investment case accordingly.",
    actionOwner: "RBI and Government",
    timeline: "MEDIUM_TERM",
    ownerRole: "Chief Financial Officer",
  },
  {
    itemCode: "REC-4",
    itemType: "RECOMMENDATION",
    pillar: "Infrastructure",
    title: "Indigenous Financial Sector Specific AI Models",
    description:
      "Develop India-specific, financial-sector-specific AI models suited to local languages, context and regulation.",
    applicability:
      "Assess dependence on foreign general-purpose models and evaluate indigenous alternatives, particularly for vernacular customer interaction and data-residency-sensitive workloads.",
    actionOwner: "Regulators, SROs and Industry",
    timeline: "MEDIUM_TERM",
    ownerRole: "Chief Technology Officer",
  },
  {
    itemCode: "REC-5",
    itemType: "RECOMMENDATION",
    pillar: "Infrastructure",
    title: "Integrating AI with DPI",
    description:
      "Integrate AI capabilities with India's Digital Public Infrastructure to widen access and utility.",
    applicability:
      "Where AI touches UPI, Account Aggregator or similar DPI rails, ensure the integration is covered by the AI inventory, impact assessment and consent architecture.",
    actionOwner: "Regulators",
    timeline: "MEDIUM_TERM",
    ownerRole: "Head of Digital Banking",
  },
];

const POLICY: FreeAiItemSeed[] = [
  {
    itemCode: "REC-6",
    itemType: "RECOMMENDATION",
    pillar: "Policy",
    title: "Adaptive and Enabling Policies",
    description:
      "Put in place agile regulatory and policy architecture that adapts as AI capability evolves.",
    applicability:
      "Internal AI policy is written to be reviewed on a defined cycle and on material regulatory change, rather than fixed at a point in time.",
    actionOwner: "RBI",
    timeline: "MEDIUM_TERM",
    ownerRole: "Head of Compliance",
  },
  {
    itemCode: "REC-7",
    itemType: "RECOMMENDATION",
    pillar: "Policy",
    title: "Enabling AI-Based Affirmative Action",
    description:
      "Enable use of AI to extend financial inclusion and serve underserved segments.",
    applicability:
      "Where AI is used to widen access — thin-file credit scoring, vernacular servicing — document the inclusion objective and monitor that it does not produce a disparate adverse outcome.",
    actionOwner: "Regulators",
    timeline: "MEDIUM_TERM",
    ownerRole: "Head of Financial Inclusion",
  },
  {
    itemCode: "REC-8",
    itemType: "RECOMMENDATION",
    pillar: "Policy",
    title: "AI Liability Framework",
    description:
      "Establish a clear framework for allocating liability arising from AI-driven decisions and actions.",
    applicability:
      "Contracts with AI vendors allocate liability explicitly, and the internal position on customer redress for AI-caused detriment is documented before deployment.",
    actionOwner: "Regulators",
    timeline: "MEDIUM_TERM",
    ownerRole: "General Counsel",
  },
  {
    itemCode: "REC-9",
    itemType: "RECOMMENDATION",
    pillar: "Policy",
    title: "AI Institutional Framework",
    description:
      "Create institutional arrangements to coordinate AI policy and practice across the financial sector.",
    applicability:
      "Nominate the internal forum that engages with sector-level AI institutions and carries their guidance back into the AI Governance Committee.",
    actionOwner: "Regulators, RBI",
    timeline: "SHORT_TERM",
    ownerRole: "Chief Risk Officer",
  },
];

const CAPACITY: FreeAiItemSeed[] = [
  {
    itemCode: "REC-10",
    itemType: "RECOMMENDATION",
    pillar: "Capacity",
    title: "Capacity Building within REs",
    description:
      "Build AI skills and institutional capability within regulated entities.",
    applicability:
      "Role-based AI governance training covering the board, risk, technology and business lines, with attendance and completion evidenced.",
    actionOwner: "Regulated Entities",
    timeline: "MEDIUM_TERM",
    ownerRole: "Head of Human Resources",
  },
  {
    itemCode: "REC-11",
    itemType: "RECOMMENDATION",
    pillar: "Capacity",
    title: "Capacity Building for Regulators and Supervisors",
    description:
      "Build AI capability within the regulator and supervisory functions.",
    applicability:
      "Directed at the regulator. For a regulated entity the practical implication is readiness to explain AI systems to supervisors in supervisory review.",
    actionOwner: "RBI",
    timeline: "MEDIUM_TERM",
    ownerRole: "Head of Regulatory Affairs",
  },
  {
    itemCode: "REC-12",
    itemType: "RECOMMENDATION",
    pillar: "Capacity",
    title: "Framework for Sharing Best Practices",
    description:
      "Establish mechanisms for the industry to share AI best practice and lessons learned.",
    applicability:
      "Participate in industry and SRO forums, and feed material AI incidents and near-misses into that channel where permitted.",
    actionOwner: "Industry Association / SRO",
    timeline: "MEDIUM_TERM",
    ownerRole: "Head of Regulatory Affairs",
  },
  {
    itemCode: "REC-13",
    itemType: "RECOMMENDATION",
    pillar: "Capacity",
    title: "Recognise and Reward Responsible AI Innovation",
    description:
      "Recognise and reward institutions that innovate responsibly with AI.",
    applicability:
      "Internal incentives reward teams for governed delivery, not delivery speed alone — governance adherence forms part of AI delivery performance measures.",
    actionOwner: "Regulators and Industry",
    timeline: "MEDIUM_TERM",
    ownerRole: "Chief Human Resources Officer",
  },
];

// ── Risk Mitigation Framework ────────────────────────────────────────────────

const GOVERNANCE: FreeAiItemSeed[] = [
  {
    itemCode: "REC-14",
    itemType: "RECOMMENDATION",
    pillar: "Governance",
    title: "Board Approved AI Policy",
    description:
      "Regulated entities should put in place a board-approved policy governing the use of AI.",
    applicability:
      "An apex AI policy approved by the board, integrated with enterprise risk management, model risk and IT governance, reviewed on a defined cycle.",
    actionOwner: "REs and Industry",
    timeline: "MEDIUM_TERM",
    ownerRole: "Board of Directors",
  },
  {
    itemCode: "REC-15",
    itemType: "RECOMMENDATION",
    pillar: "Governance",
    title: "Data Lifecycle Governance",
    description:
      "Govern data across its lifecycle where it is used to build and operate AI systems.",
    applicability:
      "Acquisition, lawful basis, provenance, quality thresholds, preparation, retention and disposal are all documented for training and inference data.",
    actionOwner: "Regulated Entities",
    timeline: "MEDIUM_TERM",
    ownerRole: "Chief Data Officer",
  },
  {
    itemCode: "REC-16",
    itemType: "RECOMMENDATION",
    pillar: "Governance",
    title: "AI System Governance Framework",
    description:
      "Establish a governance framework covering the AI system lifecycle end to end.",
    applicability:
      "Intake, risk classification, control gates, approval routing, deployment, monitoring and decommissioning — with the evidence required at each gate defined in advance.",
    actionOwner: "Regulated Entities",
    timeline: "MEDIUM_TERM",
    ownerRole: "Chief Risk Officer",
  },
  {
    itemCode: "REC-17",
    itemType: "RECOMMENDATION",
    pillar: "Governance",
    title: "Product Approval Process",
    description:
      "Bring AI-driven products within the institution's product approval process.",
    applicability:
      "AI-enabled products pass the standard product approval forum with AI risk assessed as an explicit agenda item, not approved through a technology-only route.",
    actionOwner: "Regulated Entities",
    timeline: "MEDIUM_TERM",
    ownerRole: "Head of Product Governance",
  },
];

const PROTECTION: FreeAiItemSeed[] = [
  {
    itemCode: "REC-18",
    itemType: "RECOMMENDATION",
    pillar: "Protection",
    title: "Consumer Protection",
    description:
      "Put in place safeguards protecting consumers from harms arising out of AI-driven services.",
    applicability:
      "Disclosure that AI is in use, a route to human review, grievance handling that covers AI decisions, and monitoring for customer detriment.",
    actionOwner: "Regulated Entities",
    timeline: "MEDIUM_TERM",
    ownerRole: "Head of Customer Experience",
  },
  {
    itemCode: "REC-19",
    itemType: "RECOMMENDATION",
    pillar: "Protection",
    title: "Cybersecurity Measures",
    description:
      "Apply cybersecurity measures appropriate to the risks introduced by AI systems.",
    applicability:
      "Access control over models and prompts, output filtering, supply chain integrity for model artefacts, and AI assets brought into the security operations perimeter.",
    actionOwner: "Regulated Entities",
    timeline: "MEDIUM_TERM",
    ownerRole: "Chief Information Security Officer",
  },
  {
    itemCode: "REC-20",
    itemType: "RECOMMENDATION",
    pillar: "Protection",
    title: "Red Teaming",
    description:
      "Subject AI systems to adversarial testing before and during deployment.",
    applicability:
      "Prompt injection, jailbreak and data-exfiltration testing for generative systems, and adversarial robustness testing for predictive models, on a defined cycle with findings tracked.",
    actionOwner: "Regulated Entities",
    timeline: "MEDIUM_TERM",
    ownerRole: "Chief Information Security Officer",
  },
  {
    itemCode: "REC-21",
    itemType: "RECOMMENDATION",
    pillar: "Protection",
    title: "Business Continuity Plan for AI Systems",
    description:
      "Maintain business continuity arrangements covering failure or unavailability of AI systems.",
    applicability:
      "A documented and exercised fallback for every critical AI service — degradation to a rules engine or manual process — including failure of an external model provider.",
    actionOwner: "Regulated Entities",
    timeline: "MEDIUM_TERM",
    ownerRole: "Head of Business Continuity",
  },
  {
    itemCode: "REC-22",
    itemType: "RECOMMENDATION",
    pillar: "Protection",
    title: "AI Incident Reporting and Sectoral Risk Intelligence Framework",
    description:
      "Report AI incidents and contribute to sector-wide risk intelligence.",
    applicability:
      "An AI incident taxonomy, defined internal escalation, criteria for regulatory notification, and a channel for contributing to sectoral intelligence.",
    actionOwner: "REs, Regulators",
    timeline: "MEDIUM_TERM",
    ownerRole: "Head of Operational Risk",
  },
];

const ASSURANCE: FreeAiItemSeed[] = [
  {
    itemCode: "REC-23",
    itemType: "RECOMMENDATION",
    pillar: "Assurance",
    title: "AI Inventory within REs and Sector-Wide Repository",
    description:
      "Maintain an inventory of AI systems within the entity, feeding a sector-wide repository.",
    applicability:
      "A complete, current register of every AI system including third-party and embedded AI, with active discovery for shadow AI. One of only two RE-facing short-term items.",
    actionOwner: "Regulators and REs",
    timeline: "SHORT_TERM",
    ownerRole: "Chief Technology Officer",
  },
  {
    itemCode: "REC-24",
    itemType: "RECOMMENDATION",
    pillar: "Assurance",
    title: "AI Audit Framework",
    description:
      "Establish an audit framework for AI systems covering internal audits, third-party audits and periodic review.",
    applicability:
      "Internal audit coverage of the AI governance framework, independent third-party assessment where warranted, and a defined periodic review cycle with findings tracked to closure.",
    actionOwner: "Supervisors and REs",
    timeline: "MEDIUM_TERM",
    ownerRole: "Head of Internal Audit",
  },
  {
    itemCode: "REC-25",
    itemType: "RECOMMENDATION",
    pillar: "Assurance",
    title: "Disclosures by REs",
    description:
      "Make appropriate disclosures regarding the use of AI to customers and to regulators.",
    applicability:
      "Customer-facing disclosure where AI materially affects a decision, and the regulatory disclosure pack on AI usage and exposure. One of only two RE-facing short-term items.",
    actionOwner: "REs, Regulators",
    timeline: "SHORT_TERM",
    ownerRole: "Head of Compliance",
  },
  {
    itemCode: "REC-26",
    itemType: "RECOMMENDATION",
    pillar: "Assurance",
    title: "AI Toolkit",
    description:
      "Develop a toolkit supporting consistent assessment and validation of AI systems across the sector.",
    applicability:
      "Adopt sector toolkits as they emerge and align internal assessment templates so results remain comparable with the sector standard.",
    actionOwner: "Regulators and Industry",
    timeline: "MEDIUM_TERM",
    ownerRole: "Head of Model Risk",
  },
];

export const FREE_AI_CATALOG: FreeAiItemSeed[] = [
  ...SUTRAS,
  ...GOVERNANCE,
  ...PROTECTION,
  ...ASSURANCE,
  ...INFRASTRUCTURE,
  ...POLICY,
  ...CAPACITY,
];
