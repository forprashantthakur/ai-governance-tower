/**
 * ISO/IEC 42001:2023 — Artificial Intelligence Management System (AIMS)
 *
 * Two reference catalogues used to seed a tenant's governance workspace:
 *
 *   AIMS_CLAUSES  — the management-system requirements, Clauses 4–10.
 *                   These follow the ISO Annex SL high-level structure shared
 *                   by ISO 27001 / 9001, so they slot into an existing ERM or
 *                   IT governance programme without re-inventing the wheel.
 *
 *   ANNEX_A_CONTROLS — the 38 Annex A controls (A.2–A.10) that a Statement of
 *                   Applicability must account for, each with an applicability
 *                   decision and justification.
 */

export interface AimsClauseSeed {
  clauseNo: string;
  clauseTitle: string;
  section: string;
  requirement: string;
  ownerRole: string;
}

export const AIMS_SECTIONS = [
  "Context",
  "Leadership",
  "Planning",
  "Support",
  "Operation",
  "Performance Evaluation",
  "Improvement",
] as const;

export type AimsSection = (typeof AIMS_SECTIONS)[number];

export const AIMS_CLAUSES: AimsClauseSeed[] = [
  // ── Clause 4 — Context of the organization ─────────────────────────────────
  {
    clauseNo: "4.1",
    clauseTitle: "Understanding the organization and its context",
    section: "Context",
    requirement:
      "Determine external and internal issues relevant to the organization's purpose that affect its ability to achieve the intended outcomes of the AI management system, including its role as AI provider, producer, user or partner.",
    ownerRole: "Chief Risk Officer",
  },
  {
    clauseNo: "4.2",
    clauseTitle: "Understanding the needs and expectations of interested parties",
    section: "Context",
    requirement:
      "Identify interested parties relevant to the AIMS — customers, regulators, employees, affected individuals and society — and their requirements, including statutory, regulatory and contractual obligations.",
    ownerRole: "Head of Compliance",
  },
  {
    clauseNo: "4.3",
    clauseTitle: "Determining the scope of the AI management system",
    section: "Context",
    requirement:
      "Determine the boundaries and applicability of the AIMS, considering the issues in 4.1, the requirements in 4.2, and the organizational activities, products and services in scope. The scope shall be documented information.",
    ownerRole: "Chief Risk Officer",
  },
  {
    clauseNo: "4.4",
    clauseTitle: "AI management system",
    section: "Context",
    requirement:
      "Establish, implement, maintain and continually improve the AIMS, including the processes needed and their interactions, in accordance with the requirements of ISO/IEC 42001.",
    ownerRole: "Chief Risk Officer",
  },

  // ── Clause 5 — Leadership ──────────────────────────────────────────────────
  {
    clauseNo: "5.1",
    clauseTitle: "Leadership and commitment",
    section: "Leadership",
    requirement:
      "Top management shall demonstrate leadership and commitment to the AIMS by ensuring the AI policy and objectives are established and compatible with strategic direction, that resources are available, and by directing and supporting persons contributing to AIMS effectiveness.",
    ownerRole: "Board of Directors",
  },
  {
    clauseNo: "5.2",
    clauseTitle: "AI policy",
    section: "Leadership",
    requirement:
      "Top management shall establish an AI policy that is appropriate to the purpose of the organization, provides a framework for setting AI objectives, includes a commitment to satisfy applicable requirements and to continual improvement. It shall be documented, communicated and available to interested parties.",
    ownerRole: "Board of Directors",
  },
  {
    clauseNo: "5.3",
    clauseTitle: "Roles, responsibilities and authorities",
    section: "Leadership",
    requirement:
      "Top management shall ensure that responsibilities and authorities for roles relevant to the AIMS are assigned and communicated within the organization, including responsibility for conformance to ISO/IEC 42001 and for reporting AIMS performance to top management.",
    ownerRole: "Chief Risk Officer",
  },

  // ── Clause 6 — Planning ────────────────────────────────────────────────────
  {
    clauseNo: "6.1.1",
    clauseTitle: "Actions to address risks and opportunities — General",
    section: "Planning",
    requirement:
      "When planning the AIMS, consider the issues in 4.1 and requirements in 4.2 and determine the risks and opportunities that need to be addressed to give assurance the AIMS can achieve its intended outcomes and to achieve continual improvement.",
    ownerRole: "Chief Risk Officer",
  },
  {
    clauseNo: "6.1.2",
    clauseTitle: "AI risk assessment",
    section: "Planning",
    requirement:
      "Define and apply an AI risk assessment process that establishes and maintains risk criteria, ensures repeatable and comparable results, identifies risks to the achievement of AI objectives, and analyses and evaluates those risks. Retain documented information about the process.",
    ownerRole: "Head of Model Risk",
  },
  {
    clauseNo: "6.1.3",
    clauseTitle: "AI risk treatment",
    section: "Planning",
    requirement:
      "Define and apply an AI risk treatment process to select appropriate treatment options, determine the necessary controls, compare them against Annex A, produce a Statement of Applicability, formulate a risk treatment plan, and obtain risk owners' approval and acceptance of residual risks.",
    ownerRole: "Head of Model Risk",
  },
  {
    clauseNo: "6.1.4",
    clauseTitle: "AI system impact assessment",
    section: "Planning",
    requirement:
      "Define and apply a process to assess the potential consequences for individuals, groups of individuals and societies of the development, provision or use of AI systems throughout their life cycle.",
    ownerRole: "Head of Compliance",
  },
  {
    clauseNo: "6.2",
    clauseTitle: "AI objectives and planning to achieve them",
    section: "Planning",
    requirement:
      "Establish AI objectives at relevant functions and levels. Objectives shall be consistent with the AI policy, measurable, monitored, communicated and updated. Plan what will be done, what resources are required, who is responsible, when it will be completed and how results will be evaluated.",
    ownerRole: "Chief Risk Officer",
  },
  {
    clauseNo: "6.3",
    clauseTitle: "Planning of changes",
    section: "Planning",
    requirement:
      "When the organization determines the need for changes to the AI management system, the changes shall be carried out in a planned manner.",
    ownerRole: "Chief Risk Officer",
  },

  // ── Clause 7 — Support ─────────────────────────────────────────────────────
  {
    clauseNo: "7.1",
    clauseTitle: "Resources",
    section: "Support",
    requirement:
      "Determine and provide the resources needed for the establishment, implementation, maintenance and continual improvement of the AI management system.",
    ownerRole: "Chief Technology Officer",
  },
  {
    clauseNo: "7.2",
    clauseTitle: "Competence",
    section: "Support",
    requirement:
      "Determine the necessary competence of persons doing work under the organization's control that affects AI performance, ensure they are competent on the basis of education, training or experience, and retain documented evidence of competence.",
    ownerRole: "Head of Human Resources",
  },
  {
    clauseNo: "7.3",
    clauseTitle: "Awareness",
    section: "Support",
    requirement:
      "Persons doing work under the organization's control shall be aware of the AI policy, their contribution to the effectiveness of the AIMS, the benefits of improved AI performance, and the implications of not conforming with AIMS requirements.",
    ownerRole: "Head of Human Resources",
  },
  {
    clauseNo: "7.4",
    clauseTitle: "Communication",
    section: "Support",
    requirement:
      "Determine the internal and external communications relevant to the AIMS — on what, when, with whom, how, and by whom communication takes place.",
    ownerRole: "Head of Corporate Communications",
  },
  {
    clauseNo: "7.5",
    clauseTitle: "Documented information",
    section: "Support",
    requirement:
      "The AIMS shall include documented information required by ISO/IEC 42001 and determined as necessary for effectiveness. Control creation, updating, availability, distribution, access, retrieval, storage, version control and retention.",
    ownerRole: "Head of Compliance",
  },

  // ── Clause 8 — Operation ───────────────────────────────────────────────────
  {
    clauseNo: "8.1",
    clauseTitle: "Operational planning and control",
    section: "Operation",
    requirement:
      "Plan, implement and control the processes needed to meet AIMS requirements and to implement the actions determined in Clause 6. Control planned changes, review the consequences of unintended changes, and ensure externally provided processes are controlled.",
    ownerRole: "Head of AI Engineering",
  },
  {
    clauseNo: "8.2",
    clauseTitle: "AI risk assessment",
    section: "Operation",
    requirement:
      "Perform AI risk assessments at planned intervals or when significant changes are proposed or occur, taking account of the criteria established in 6.1.2. Retain documented information of the results.",
    ownerRole: "Head of Model Risk",
  },
  {
    clauseNo: "8.3",
    clauseTitle: "AI risk treatment",
    section: "Operation",
    requirement:
      "Implement the AI risk treatment plan and retain documented information of the results of AI risk treatment.",
    ownerRole: "Head of Model Risk",
  },
  {
    clauseNo: "8.4",
    clauseTitle: "AI system impact assessment",
    section: "Operation",
    requirement:
      "Perform AI system impact assessments at planned intervals or when significant changes occur, and retain documented information of the results.",
    ownerRole: "Head of Compliance",
  },

  // ── Clause 9 — Performance evaluation ──────────────────────────────────────
  {
    clauseNo: "9.1",
    clauseTitle: "Monitoring, measurement, analysis and evaluation",
    section: "Performance Evaluation",
    requirement:
      "Determine what needs to be monitored and measured, the methods to ensure valid results, when monitoring shall be performed and by whom, and when results shall be analysed and evaluated. Retain documented information as evidence.",
    ownerRole: "Head of Model Risk",
  },
  {
    clauseNo: "9.2",
    clauseTitle: "Internal audit",
    section: "Performance Evaluation",
    requirement:
      "Conduct internal audits at planned intervals to determine whether the AIMS conforms to the organization's own requirements and to ISO/IEC 42001, and is effectively implemented and maintained. Plan, establish, implement and maintain an audit programme.",
    ownerRole: "Head of Internal Audit",
  },
  {
    clauseNo: "9.3",
    clauseTitle: "Management review",
    section: "Performance Evaluation",
    requirement:
      "Top management shall review the AIMS at planned intervals to ensure its continuing suitability, adequacy and effectiveness, considering audit results, interested-party feedback, AI risk status, nonconformities and opportunities for continual improvement.",
    ownerRole: "Board Risk Committee",
  },

  // ── Clause 10 — Improvement ────────────────────────────────────────────────
  {
    clauseNo: "10.1",
    clauseTitle: "Continual improvement",
    section: "Improvement",
    requirement:
      "Continually improve the suitability, adequacy and effectiveness of the AI management system.",
    ownerRole: "Chief Risk Officer",
  },
  {
    clauseNo: "10.2",
    clauseTitle: "Nonconformity and corrective action",
    section: "Improvement",
    requirement:
      "When a nonconformity occurs, react to control and correct it, evaluate the need for action to eliminate the causes so it does not recur, implement the action, review effectiveness, and retain documented information on the nature of the nonconformity and the corrective actions taken.",
    ownerRole: "Head of Compliance",
  },
];

// ── ISO/IEC 42001 Annex A — 38 controls across 9 objective groups ────────────

export interface AnnexAControlSeed {
  controlRef: string;
  controlTitle: string;
  objectiveGroup: string;
  controlObjective: string;
  ownerRole: string;
}

export const ANNEX_A_GROUPS = [
  "A.2 Policies related to AI",
  "A.3 Internal organization",
  "A.4 Resources for AI systems",
  "A.5 Assessing impacts of AI systems",
  "A.6 AI system life cycle",
  "A.7 Data for AI systems",
  "A.8 Information for interested parties",
  "A.9 Use of AI systems",
  "A.10 Third-party and customer relationships",
] as const;

export const ANNEX_A_CONTROLS: AnnexAControlSeed[] = [
  // A.2 — Policies related to AI
  {
    controlRef: "A.2.2",
    controlTitle: "AI policy",
    objectiveGroup: "A.2 Policies related to AI",
    controlObjective:
      "The organization shall document a policy for the development or use of AI systems, approved at an appropriate level of management.",
    ownerRole: "Board of Directors",
  },
  {
    controlRef: "A.2.3",
    controlTitle: "Alignment with other organizational policies",
    objectiveGroup: "A.2 Policies related to AI",
    controlObjective:
      "The organization shall determine where other policies — such as enterprise risk management, model risk, information security, privacy and IT governance — can be affected by or apply to the objectives of the AI policy.",
    ownerRole: "Chief Risk Officer",
  },
  {
    controlRef: "A.2.4",
    controlTitle: "Review of the AI policy",
    objectiveGroup: "A.2 Policies related to AI",
    controlObjective:
      "The AI policy shall be reviewed at planned intervals, or additionally as needed, to ensure its continuing suitability, adequacy and effectiveness.",
    ownerRole: "Board Risk Committee",
  },

  // A.3 — Internal organization
  {
    controlRef: "A.3.2",
    controlTitle: "AI roles and responsibilities",
    objectiveGroup: "A.3 Internal organization",
    controlObjective:
      "Roles and responsibilities for AI shall be defined and allocated according to the needs of the organization, covering the full AI system life cycle.",
    ownerRole: "Chief Risk Officer",
  },
  {
    controlRef: "A.3.3",
    controlTitle: "Reporting of concerns",
    objectiveGroup: "A.3 Internal organization",
    controlObjective:
      "The organization shall define and put in place a process to report concerns about the organization's role with respect to an AI system throughout its life cycle.",
    ownerRole: "Head of Compliance",
  },

  // A.4 — Resources for AI systems
  {
    controlRef: "A.4.2",
    controlTitle: "Resource documentation",
    objectiveGroup: "A.4 Resources for AI systems",
    controlObjective:
      "The organization shall identify and document the relevant resources required for the activities at given AI system life cycle stages.",
    ownerRole: "Head of AI Engineering",
  },
  {
    controlRef: "A.4.3",
    controlTitle: "Data resources",
    objectiveGroup: "A.4 Resources for AI systems",
    controlObjective:
      "As part of resource identification, the organization shall document information about the data resources utilized for the AI system.",
    ownerRole: "Chief Data Officer",
  },
  {
    controlRef: "A.4.4",
    controlTitle: "Tooling resources",
    objectiveGroup: "A.4 Resources for AI systems",
    controlObjective:
      "As part of resource identification, the organization shall document information about the tooling resources utilized for the AI system.",
    ownerRole: "Head of AI Engineering",
  },
  {
    controlRef: "A.4.5",
    controlTitle: "System and computing resources",
    objectiveGroup: "A.4 Resources for AI systems",
    controlObjective:
      "As part of resource identification, the organization shall document information about the system and computing resources utilized for the AI system.",
    ownerRole: "Chief Technology Officer",
  },
  {
    controlRef: "A.4.6",
    controlTitle: "Human resources",
    objectiveGroup: "A.4 Resources for AI systems",
    controlObjective:
      "As part of resource identification, the organization shall document information about the human resources and their competences utilized for the development, deployment and operation of the AI system.",
    ownerRole: "Head of Human Resources",
  },

  // A.5 — Assessing impacts of AI systems
  {
    controlRef: "A.5.2",
    controlTitle: "AI system impact assessment process",
    objectiveGroup: "A.5 Assessing impacts of AI systems",
    controlObjective:
      "The organization shall establish a process to assess the potential consequences for individuals, groups of individuals and societies of the AI system throughout its life cycle.",
    ownerRole: "Head of Compliance",
  },
  {
    controlRef: "A.5.3",
    controlTitle: "Documentation of AI system impact assessments",
    objectiveGroup: "A.5 Assessing impacts of AI systems",
    controlObjective:
      "The organization shall document the results of AI system impact assessments and retain the results for a defined period.",
    ownerRole: "Head of Compliance",
  },
  {
    controlRef: "A.5.4",
    controlTitle: "Assessing AI system impact on individuals or groups of individuals",
    objectiveGroup: "A.5 Assessing impacts of AI systems",
    controlObjective:
      "The organization shall assess and document the potential impacts of AI systems on individuals or groups of individuals throughout the system's life cycle.",
    ownerRole: "Head of Compliance",
  },
  {
    controlRef: "A.5.5",
    controlTitle: "Assessing societal impacts of AI systems",
    objectiveGroup: "A.5 Assessing impacts of AI systems",
    controlObjective:
      "The organization shall assess and document the potential societal impacts of their AI systems throughout their life cycles.",
    ownerRole: "Head of Compliance",
  },

  // A.6 — AI system life cycle
  {
    controlRef: "A.6.1.2",
    controlTitle: "Objectives for responsible development of AI system",
    objectiveGroup: "A.6 AI system life cycle",
    controlObjective:
      "The organization shall identify and document objectives to guide the responsible development of AI systems, and take those objectives into account during development.",
    ownerRole: "Head of AI Engineering",
  },
  {
    controlRef: "A.6.1.3",
    controlTitle: "Processes for responsible AI system design and development",
    objectiveGroup: "A.6 AI system life cycle",
    controlObjective:
      "The organization shall define and document the specific processes for the responsible design and development of the AI system.",
    ownerRole: "Head of AI Engineering",
  },
  {
    controlRef: "A.6.2.2",
    controlTitle: "AI system requirements and specification",
    objectiveGroup: "A.6 AI system life cycle",
    controlObjective:
      "The organization shall specify and document requirements for new AI systems or material enhancements to existing systems.",
    ownerRole: "Head of AI Engineering",
  },
  {
    controlRef: "A.6.2.3",
    controlTitle: "Documentation of AI system design and development",
    objectiveGroup: "A.6 AI system life cycle",
    controlObjective:
      "The organization shall document the AI system design and development based on organizational objectives, documented requirements and specification criteria.",
    ownerRole: "Head of AI Engineering",
  },
  {
    controlRef: "A.6.2.4",
    controlTitle: "AI system verification and validation",
    objectiveGroup: "A.6 AI system life cycle",
    controlObjective:
      "The organization shall define and document verification and validation measures for the AI system and specify criteria for their use.",
    ownerRole: "Head of Model Risk",
  },
  {
    controlRef: "A.6.2.5",
    controlTitle: "AI system deployment",
    objectiveGroup: "A.6 AI system life cycle",
    controlObjective:
      "The organization shall document a deployment plan and ensure that appropriate requirements are met prior to deployment.",
    ownerRole: "Head of AI Engineering",
  },
  {
    controlRef: "A.6.2.6",
    controlTitle: "AI system operation and monitoring",
    objectiveGroup: "A.6 AI system life cycle",
    controlObjective:
      "The organization shall define and document the necessary elements for the ongoing operation of the AI system, at minimum covering system and performance monitoring, repairs, updates and support.",
    ownerRole: "Head of AI Operations",
  },
  {
    controlRef: "A.6.2.7",
    controlTitle: "AI system technical documentation",
    objectiveGroup: "A.6 AI system life cycle",
    controlObjective:
      "The organization shall determine what technical documentation is needed for each relevant category of interested parties, and provide the technical documentation to them in the appropriate form.",
    ownerRole: "Head of AI Engineering",
  },
  {
    controlRef: "A.6.2.8",
    controlTitle: "AI system recording of event logs",
    objectiveGroup: "A.6 AI system life cycle",
    controlObjective:
      "The organization shall determine at which phases of the AI system life cycle record keeping of event logs should be enabled, and the mechanisms to be used.",
    ownerRole: "Head of AI Operations",
  },

  // A.7 — Data for AI systems
  {
    controlRef: "A.7.2",
    controlTitle: "Data for development and enhancement of AI system",
    objectiveGroup: "A.7 Data for AI systems",
    controlObjective:
      "The organization shall define, document and implement data management processes related to the development of AI systems.",
    ownerRole: "Chief Data Officer",
  },
  {
    controlRef: "A.7.3",
    controlTitle: "Acquisition of data",
    objectiveGroup: "A.7 Data for AI systems",
    controlObjective:
      "The organization shall determine and document details about the acquisition and selection of the data used in AI systems.",
    ownerRole: "Chief Data Officer",
  },
  {
    controlRef: "A.7.4",
    controlTitle: "Quality of data for AI systems",
    objectiveGroup: "A.7 Data for AI systems",
    controlObjective:
      "The organization shall define and document requirements for data quality and ensure that data used to develop and operate the AI system meet those requirements.",
    ownerRole: "Chief Data Officer",
  },
  {
    controlRef: "A.7.5",
    controlTitle: "Data provenance",
    objectiveGroup: "A.7 Data for AI systems",
    controlObjective:
      "The organization shall define and document a process for recording the provenance of data used in its AI systems over the life cycles of the data and the AI system.",
    ownerRole: "Chief Data Officer",
  },
  {
    controlRef: "A.7.6",
    controlTitle: "Data preparation",
    objectiveGroup: "A.7 Data for AI systems",
    controlObjective:
      "The organization shall define and document its criteria for selecting data preparation methods and the data preparation methods to be used.",
    ownerRole: "Chief Data Officer",
  },

  // A.8 — Information for interested parties
  {
    controlRef: "A.8.2",
    controlTitle: "System documentation and information for users",
    objectiveGroup: "A.8 Information for interested parties",
    controlObjective:
      "The organization shall determine and provide the necessary information to users of the AI system.",
    ownerRole: "Head of Product",
  },
  {
    controlRef: "A.8.3",
    controlTitle: "External reporting",
    objectiveGroup: "A.8 Information for interested parties",
    controlObjective:
      "The organization shall provide capabilities for interested parties to report adverse impacts of the AI system.",
    ownerRole: "Head of Customer Experience",
  },
  {
    controlRef: "A.8.4",
    controlTitle: "Communication of incidents",
    objectiveGroup: "A.8 Information for interested parties",
    controlObjective:
      "The organization shall determine and document a plan for communicating incidents to users of the AI system.",
    ownerRole: "Head of Compliance",
  },
  {
    controlRef: "A.8.5",
    controlTitle: "Information for interested parties",
    objectiveGroup: "A.8 Information for interested parties",
    controlObjective:
      "The organization shall determine and document its obligations to reporting information about the AI system to interested parties, including regulators.",
    ownerRole: "Head of Compliance",
  },

  // A.9 — Use of AI systems
  {
    controlRef: "A.9.2",
    controlTitle: "Processes for responsible use of AI systems",
    objectiveGroup: "A.9 Use of AI systems",
    controlObjective:
      "The organization shall define and document the processes for the responsible use of AI systems.",
    ownerRole: "Business Unit Head",
  },
  {
    controlRef: "A.9.3",
    controlTitle: "Objectives for responsible use of AI system",
    objectiveGroup: "A.9 Use of AI systems",
    controlObjective:
      "The organization shall identify and document objectives to guide the responsible use of AI systems.",
    ownerRole: "Business Unit Head",
  },
  {
    controlRef: "A.9.4",
    controlTitle: "Intended use of the AI system",
    objectiveGroup: "A.9 Use of AI systems",
    controlObjective:
      "The organization shall ensure that the AI system is used according to the intended uses of the AI system and its accompanying documentation.",
    ownerRole: "Business Unit Head",
  },

  // A.10 — Third-party and customer relationships
  {
    controlRef: "A.10.2",
    controlTitle: "Allocating responsibilities",
    objectiveGroup: "A.10 Third-party and customer relationships",
    controlObjective:
      "The organization shall ensure that responsibilities within their AI system life cycle are allocated between the organization, its partners, suppliers, customers and third parties.",
    ownerRole: "Head of Vendor Management",
  },
  {
    controlRef: "A.10.3",
    controlTitle: "Suppliers",
    objectiveGroup: "A.10 Third-party and customer relationships",
    controlObjective:
      "The organization shall establish a process to ensure that its usage of services, products or materials provided by suppliers aligns with the organization's approach to the responsible development and use of AI systems.",
    ownerRole: "Head of Vendor Management",
  },
  {
    controlRef: "A.10.4",
    controlTitle: "Customers",
    objectiveGroup: "A.10 Third-party and customer relationships",
    controlObjective:
      "The organization shall ensure that its responsible approach to the development and use of AI systems considers customer expectations and needs.",
    ownerRole: "Head of Customer Experience",
  },
];
