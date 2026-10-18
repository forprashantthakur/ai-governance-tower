/**
 * Shared types for the RBI FREE-AI reference catalogue.
 *
 * Kept separate from the catalogue data itself so the API routes and page can
 * be built and typechecked against a stable contract.
 */

export type FreeAiItemTypeKey = "SUTRA" | "RECOMMENDATION";

/**
 * The six pillars, plus "Sutras" as a pseudo-pillar so the seven guiding
 * principles can live in the same table as the recommendations without
 * being forced under a pillar they do not belong to — the Sutras cut across
 * all six.
 */
export type FreeAiPillarKey =
  | "Sutras"
  | "Infrastructure"
  | "Policy"
  | "Capacity"
  | "Governance"
  | "Protection"
  | "Assurance";

/** RBI tags each recommendation Short term or Medium term. There is no long-term tag. */
export type FreeAiTimelineKey = "SHORT_TERM" | "MEDIUM_TERM" | "NOT_APPLICABLE";

export interface FreeAiPillarMeta {
  key: FreeAiPillarKey;
  /**
   * Which sub-framework the pillar belongs to. RBI groups the six pillars into
   * an Innovation Enablement Framework and a Risk Mitigation Framework.
   */
  group: "SUTRAS" | "ENABLEMENT" | "MITIGATION";
  /** RBI's own descriptor for the pillar. */
  description: string;
}

export interface FreeAiItemSeed {
  /** "SUTRA-1" for guiding principles, "REC-1" … "REC-26" for recommendations. */
  itemCode: string;
  itemType: FreeAiItemTypeKey;
  pillar: FreeAiPillarKey;
  /** Verbatim title from the RBI report. */
  title: string;
  /** RBI's own descriptor. */
  description: string;
  /**
   * Implementation guidance — what a regulated entity does to evidence
   * alignment. This is our interpretation, not RBI text.
   */
  applicability: string;
  /** RBI's "Action" column — who the recommendation is addressed to. */
  actionOwner: string;
  /** RBI's "Timeline" column. */
  timeline: FreeAiTimelineKey;
  /** Suggested internal owner for a regulated entity. */
  ownerRole: string;
}

export const FREE_AI_PILLARS: FreeAiPillarMeta[] = [
  {
    key: "Sutras",
    group: "SUTRAS",
    description:
      "Seven guiding principles that cut across every pillar and anchor the entire framework.",
  },
  {
    key: "Infrastructure",
    group: "ENABLEMENT",
    description: "Building the infrastructure needed to support AI innovation.",
  },
  {
    key: "Policy",
    group: "ENABLEMENT",
    description:
      "Putting in place agile, adaptive policy and regulatory architecture to encourage responsible AI adoption.",
  },
  {
    key: "Capacity",
    group: "ENABLEMENT",
    description:
      "Promoting human skill development and institutional capacity to harness AI safely and effectively.",
  },
  {
    key: "Governance",
    group: "MITIGATION",
    description:
      "Establishing robust governance structures in respect of AI-based decisions and actions.",
  },
  {
    key: "Protection",
    group: "MITIGATION",
    description: "Ensuring strong safeguards for protection from harms.",
  },
  {
    key: "Assurance",
    group: "MITIGATION",
    description:
      "Instituting mechanisms for continuous validation and oversight of AI systems.",
  },
];

export const PILLAR_ORDER: FreeAiPillarKey[] = [
  "Sutras",
  "Governance",
  "Protection",
  "Assurance",
  "Infrastructure",
  "Policy",
  "Capacity",
];

/**
 * Provenance shown in the UI. FREE-AI is a committee report to the RBI, not a
 * regulation — the module must not imply that its recommendations bind a
 * regulated entity today.
 */
export const FREE_AI_SOURCE = {
  title:
    "Framework for Responsible and Ethical Enablement of Artificial Intelligence (FREE-AI)",
  publisher: "Reserve Bank of India — Committee Report",
  publishedOn: "13 August 2025",
  chair: "Dr. Pushpak Bhattacharyya, IIT Bombay",
  statusNote:
    "A committee report to the RBI, not a regulation. Recommendations are directed at regulators, the government and regulated entities, and do not by themselves create binding obligations.",
  url: "https://rbidocs.rbi.org.in/rdocs/PublicationReport/Pdfs/FREEAIR130820250A24FF2D4578453F824C72ED9F5D5851.PDF",
} as const;
