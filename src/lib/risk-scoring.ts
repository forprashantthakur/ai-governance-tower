/**
 * AI Risk Scoring Engine
 * Produces a 0-100 composite risk score based on multiple dimensions.
 * Higher score = Higher risk.
 */

import { RiskLevel } from "@prisma/client";

export interface RiskInputs {
  dataSensitivity: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED" | "PII";
  modelType: "LLM" | "ML" | "AGENT" | "COMPUTER_VISION" | "NLP" | "RECOMMENDATION";
  explainability: number;       // 0–100, higher = more explainable
  humanOversight: boolean;
  isPiiProcessing: boolean;
  isFinancial: boolean;
  isCritical: boolean;
}

interface ScoreBreakdown {
  dataSensitivityScore: number;
  modelComplexityScore: number;
  explainabilityScore: number;
  humanOversightScore: number;
  regulatoryExposureScore: number;
  overallScore: number;
  riskLevel: RiskLevel;
}

const DATA_SENSITIVITY_WEIGHTS: Record<RiskInputs["dataSensitivity"], number> = {
  PUBLIC: 5,
  INTERNAL: 20,
  CONFIDENTIAL: 50,
  RESTRICTED: 75,
  PII: 100,
};

const MODEL_TYPE_WEIGHTS: Record<RiskInputs["modelType"], number> = {
  RECOMMENDATION: 20,
  ML: 35,
  NLP: 45,
  COMPUTER_VISION: 50,
  LLM: 70,
  AGENT: 90,
};

const DIMENSION_WEIGHTS = {
  dataSensitivity: 0.25,
  modelComplexity: 0.20,
  explainability: 0.20,
  humanOversight: 0.20,
  regulatoryExposure: 0.15,
};

export function calculateRiskScore(inputs: RiskInputs): ScoreBreakdown {
  // 1. Data Sensitivity
  const dataSensitivityScore = DATA_SENSITIVITY_WEIGHTS[inputs.dataSensitivity];

  // 2. Model Complexity
  const modelComplexityScore = MODEL_TYPE_WEIGHTS[inputs.modelType];

  // 3. Explainability (inverse — low explainability = high risk)
  const explainabilityScore = 100 - inputs.explainability;

  // 4. Human Oversight (no oversight = max risk)
  const humanOversightScore = inputs.humanOversight ? 20 : 100;

  // 5. Regulatory Exposure
  let regulatoryBase = 10;
  if (inputs.isPiiProcessing) regulatoryBase += 40;
  if (inputs.isFinancial) regulatoryBase += 30;
  if (inputs.isCritical) regulatoryBase += 20;
  const regulatoryExposureScore = Math.min(regulatoryBase, 100);

  // Weighted composite
  const overallScore =
    dataSensitivityScore * DIMENSION_WEIGHTS.dataSensitivity +
    modelComplexityScore * DIMENSION_WEIGHTS.modelComplexity +
    explainabilityScore * DIMENSION_WEIGHTS.explainability +
    humanOversightScore * DIMENSION_WEIGHTS.humanOversight +
    regulatoryExposureScore * DIMENSION_WEIGHTS.regulatoryExposure;

  const rounded = Math.round(overallScore * 10) / 10;

  return {
    dataSensitivityScore,
    modelComplexityScore,
    explainabilityScore,
    humanOversightScore,
    regulatoryExposureScore,
    overallScore: rounded,
    riskLevel: scoreToLevel(rounded),
  };
}

export function scoreToLevel(score: number): RiskLevel {
  if (score >= 75) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}
