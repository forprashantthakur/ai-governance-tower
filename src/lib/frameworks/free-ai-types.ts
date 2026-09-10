/**
 * Shared types for the RBI FREE-AI reference catalogue.
 *
 * Kept separate from the catalogue data itself so the API routes and page can
 * be built and typechecked against a stable contract while the regulatory
 * content is verified against the source document.
 */

export type FreeAiItemTypeKey = "SUTRA" | "RECOMMENDATION";

/** The six pillars: three enable innovation, three mitigate risk. */
export type FreeAiPillarKey =
  | "Infrastructure"
  | "Policy"
  | "Capacity"
  | "Governance"
  | "Protection"
  | "Assurance";

export interface FreeAiPillarMeta {
  key: FreeAiPillarKey;
  /** "ENABLEMENT" pillars grow adoption; "MITIGATION" pillars contain risk. */
  group: "ENABLEMENT" | "MITIGATION";
  description: string;
}

export interface FreeAiItemSeed {
  /** "SUTRA-1" for guiding principles, "REC-1" for recommendations. */
  itemCode: string;
  itemType: FreeAiItemTypeKey;
  /** Sutras apply across all pillars and carry the pillar "Governance". */
  pillar: FreeAiPillarKey;
  title: string;
  description: string;
  /** What a regulated entity has to do to evidence alignment. */
  applicability: string;
  ownerRole: string;
}

export const FREE_AI_PILLARS: FreeAiPillarMeta[] = [
  {
    key: "Infrastructure",
    group: "ENABLEMENT",
    description:
      "Shared data, compute and digital public infrastructure that makes responsible AI adoption feasible for the sector.",
  },
  {
    key: "Policy",
    group: "ENABLEMENT",
    description:
      "Adaptive regulatory and internal policy that enables AI adoption without loosening prudential standards.",
  },
  {
    key: "Capacity",
    group: "ENABLEMENT",
    description:
      "Skills, awareness and institutional knowledge across the regulated entity, its board and its supervisors.",
  },
  {
    key: "Governance",
    group: "MITIGATION",
    description:
      "Board-level accountability, policy, lifecycle controls and approval structures for every AI system.",
  },
  {
    key: "Protection",
    group: "MITIGATION",
    description:
      "Consumer protection, cyber security, resilience and incident response for AI-driven services.",
  },
  {
    key: "Assurance",
    group: "MITIGATION",
    description:
      "Audit, transparency, disclosure and independent validation that the framework works as intended.",
  },
];

export const PILLAR_ORDER: FreeAiPillarKey[] = [
  "Governance",
  "Protection",
  "Assurance",
  "Infrastructure",
  "Policy",
  "Capacity",
];
