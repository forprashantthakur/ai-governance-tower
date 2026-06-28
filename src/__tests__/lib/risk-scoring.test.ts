/**
 * Unit tests — src/lib/risk-scoring.ts
 * Tests the calculateRiskScore() engine and scoreToLevel() classifier.
 * No mocks needed — pure functions.
 */

import { calculateRiskScore, scoreToLevel, type RiskInputs } from "@/lib/risk-scoring";

// ─── Fixtures ──────────────────────────────────────────────────────────────
const LOW_RISK_INPUTS: RiskInputs = {
  dataSensitivity: "PUBLIC",
  modelType: "RECOMMENDATION",
  explainability: 95,
  humanOversight: true,
  isPiiProcessing: false,
  isFinancial: false,
  isCritical: false,
};

const CRITICAL_INPUTS: RiskInputs = {
  dataSensitivity: "PII",
  modelType: "AGENT",
  explainability: 5,
  humanOversight: false,
  isPiiProcessing: true,
  isFinancial: true,
  isCritical: true,
};

const LOAN_UNDERWRITING_INPUTS: RiskInputs = {
  dataSensitivity: "RESTRICTED",
  modelType: "ML",
  explainability: 25,
  humanOversight: false,
  isPiiProcessing: true,
  isFinancial: true,
  isCritical: true,
};

// ─── scoreToLevel() ────────────────────────────────────────────────────────
describe("scoreToLevel()", () => {
  it("returns LOW for score < 35", () => {
    expect(scoreToLevel(0)).toBe("LOW");
    expect(scoreToLevel(34.9)).toBe("LOW");
    expect(scoreToLevel(1)).toBe("LOW");
  });

  it("returns MEDIUM for score 35–54.9", () => {
    expect(scoreToLevel(35)).toBe("MEDIUM");
    expect(scoreToLevel(54.9)).toBe("MEDIUM");
    expect(scoreToLevel(45)).toBe("MEDIUM");
  });

  it("returns HIGH for score 55–74.9", () => {
    expect(scoreToLevel(55)).toBe("HIGH");
    expect(scoreToLevel(74.9)).toBe("HIGH");
    expect(scoreToLevel(65)).toBe("HIGH");
  });

  it("returns CRITICAL for score >= 75", () => {
    expect(scoreToLevel(75)).toBe("CRITICAL");
    expect(scoreToLevel(100)).toBe("CRITICAL");
    expect(scoreToLevel(88)).toBe("CRITICAL");
  });

  // Boundary exact values
  it("boundary: exactly 35 is MEDIUM not LOW", () => {
    expect(scoreToLevel(35)).toBe("MEDIUM");
  });

  it("boundary: exactly 55 is HIGH not MEDIUM", () => {
    expect(scoreToLevel(55)).toBe("HIGH");
  });

  it("boundary: exactly 75 is CRITICAL not HIGH", () => {
    expect(scoreToLevel(75)).toBe("CRITICAL");
  });

  // Edge: negative score treated as LOW
  it("negative score is LOW", () => {
    expect(scoreToLevel(-1)).toBe("LOW");
  });

  // Edge: score above 100 is CRITICAL
  it("score above 100 is CRITICAL", () => {
    expect(scoreToLevel(150)).toBe("CRITICAL");
  });
});

// ─── calculateRiskScore() — dimension scores ──────────────────────────────
describe("calculateRiskScore() — individual dimension scores", () => {
  describe("dataSensitivityScore", () => {
    const cases: Array<[RiskInputs["dataSensitivity"], number]> = [
      ["PUBLIC", 5],
      ["INTERNAL", 20],
      ["CONFIDENTIAL", 50],
      ["RESTRICTED", 75],
      ["PII", 100],
    ];
    it.each(cases)("%s → %i", (sensitivity, expected) => {
      const result = calculateRiskScore({ ...LOW_RISK_INPUTS, dataSensitivity: sensitivity });
      expect(result.dataSensitivityScore).toBe(expected);
    });
  });

  describe("modelComplexityScore", () => {
    const cases: Array<[RiskInputs["modelType"], number]> = [
      ["RECOMMENDATION", 20],
      ["ML", 35],
      ["NLP", 45],
      ["COMPUTER_VISION", 50],
      ["LLM", 70],
      ["AGENT", 90],
    ];
    it.each(cases)("%s → %i", (modelType, expected) => {
      const result = calculateRiskScore({ ...LOW_RISK_INPUTS, modelType });
      expect(result.modelComplexityScore).toBe(expected);
    });
  });

  describe("explainabilityScore (inverted)", () => {
    it("explainability=0 → explainabilityScore=100 (max risk)", () => {
      const result = calculateRiskScore({ ...LOW_RISK_INPUTS, explainability: 0 });
      expect(result.explainabilityScore).toBe(100);
    });

    it("explainability=100 → explainabilityScore=0 (no risk)", () => {
      const result = calculateRiskScore({ ...LOW_RISK_INPUTS, explainability: 100 });
      expect(result.explainabilityScore).toBe(0);
    });

    it("explainability=50 → explainabilityScore=50", () => {
      const result = calculateRiskScore({ ...LOW_RISK_INPUTS, explainability: 50 });
      expect(result.explainabilityScore).toBe(50);
    });
  });

  describe("humanOversightScore", () => {
    it("humanOversight=true → score=20 (low risk)", () => {
      const result = calculateRiskScore({ ...LOW_RISK_INPUTS, humanOversight: true });
      expect(result.humanOversightScore).toBe(20);
    });

    it("humanOversight=false → score=100 (max risk)", () => {
      const result = calculateRiskScore({ ...LOW_RISK_INPUTS, humanOversight: false });
      expect(result.humanOversightScore).toBe(100);
    });
  });

  describe("regulatoryExposureScore", () => {
    it("no flags → base 10", () => {
      const result = calculateRiskScore({
        ...LOW_RISK_INPUTS,
        isPiiProcessing: false,
        isFinancial: false,
        isCritical: false,
      });
      expect(result.regulatoryExposureScore).toBe(10);
    });

    it("isPiiProcessing only → 10+40=50", () => {
      const result = calculateRiskScore({
        ...LOW_RISK_INPUTS,
        isPiiProcessing: true,
        isFinancial: false,
        isCritical: false,
      });
      expect(result.regulatoryExposureScore).toBe(50);
    });

    it("isFinancial only → 10+30=40", () => {
      const result = calculateRiskScore({
        ...LOW_RISK_INPUTS,
        isPiiProcessing: false,
        isFinancial: true,
        isCritical: false,
      });
      expect(result.regulatoryExposureScore).toBe(40);
    });

    it("isCritical only → 10+20=30", () => {
      const result = calculateRiskScore({
        ...LOW_RISK_INPUTS,
        isPiiProcessing: false,
        isFinancial: false,
        isCritical: true,
      });
      expect(result.regulatoryExposureScore).toBe(30);
    });

    it("all flags → 10+40+30+20=100 (capped)", () => {
      const result = calculateRiskScore({
        ...LOW_RISK_INPUTS,
        isPiiProcessing: true,
        isFinancial: true,
        isCritical: true,
      });
      expect(result.regulatoryExposureScore).toBe(100);
    });

    it("does not exceed 100 (cap)", () => {
      const result = calculateRiskScore(CRITICAL_INPUTS);
      expect(result.regulatoryExposureScore).toBeLessThanOrEqual(100);
    });
  });
});

// ─── calculateRiskScore() — overall score & risk level ────────────────────
describe("calculateRiskScore() — overall score & risk level", () => {
  it("minimum-risk inputs produce LOW risk level", () => {
    const result = calculateRiskScore(LOW_RISK_INPUTS);
    // dataSensitivity=5*0.25 + complexity=20*0.20 + explainability=5*0.20 + oversight=20*0.20 + regulatory=10*0.15
    // = 1.25 + 4 + 1 + 4 + 1.5 = 11.75, but Math.round(117.5)/10 = 11.8 (JS half-up)
    expect(result.overallScore).toBe(11.8);
    expect(result.riskLevel).toBe("LOW");
  });

  it("maximum-risk inputs produce CRITICAL risk level", () => {
    const result = calculateRiskScore(CRITICAL_INPUTS);
    // dataSensitivity=100*0.25 + complexity=90*0.20 + explainability=95*0.20 + oversight=100*0.20 + regulatory=100*0.15
    // = 25 + 18 + 19 + 20 + 15 = 97
    expect(result.overallScore).toBeGreaterThanOrEqual(75);
    expect(result.riskLevel).toBe("CRITICAL");
  });

  it("loan underwriting (real production model) is CRITICAL (>=75)", () => {
    const result = calculateRiskScore(LOAN_UNDERWRITING_INPUTS);
    // dataSensitivity=75*0.25 + ML=35*0.20 + explainability=75*0.20 + oversight=100*0.20 + regulatory=100*0.15
    // = 18.75 + 7 + 15 + 20 + 15 = 75.75
    expect(result.overallScore).toBeGreaterThanOrEqual(75);
    expect(result.riskLevel).toBe("CRITICAL");
  });

  it("overallScore is rounded to one decimal place", () => {
    const result = calculateRiskScore(LOW_RISK_INPUTS);
    const decimalPart = (result.overallScore * 10) % 1;
    expect(decimalPart).toBe(0); // one decimal = 10× is integer
  });

  it("overallScore stays within 0–100 range for all combinations", () => {
    const sensitivityTypes: RiskInputs["dataSensitivity"][] = [
      "PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED", "PII"
    ];
    const modelTypes: RiskInputs["modelType"][] = [
      "RECOMMENDATION", "ML", "NLP", "COMPUTER_VISION", "LLM", "AGENT"
    ];

    for (const dataSensitivity of sensitivityTypes) {
      for (const modelType of modelTypes) {
        for (const humanOversight of [true, false]) {
          const result = calculateRiskScore({
            dataSensitivity,
            modelType,
            explainability: 50,
            humanOversight,
            isPiiProcessing: true,
            isFinancial: true,
            isCritical: true,
          });
          expect(result.overallScore).toBeGreaterThanOrEqual(0);
          expect(result.overallScore).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("returns all 6 breakdown fields", () => {
    const result = calculateRiskScore(LOW_RISK_INPUTS);
    expect(result).toHaveProperty("dataSensitivityScore");
    expect(result).toHaveProperty("modelComplexityScore");
    expect(result).toHaveProperty("explainabilityScore");
    expect(result).toHaveProperty("humanOversightScore");
    expect(result).toHaveProperty("regulatoryExposureScore");
    expect(result).toHaveProperty("overallScore");
    expect(result).toHaveProperty("riskLevel");
  });
});

// ─── Fuzz: random inputs ───────────────────────────────────────────────────
describe("calculateRiskScore() — fuzz tests", () => {
  const sensitivities: RiskInputs["dataSensitivity"][] = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED", "PII"];
  const modelTypes: RiskInputs["modelType"][] = ["RECOMMENDATION", "ML", "NLP", "COMPUTER_VISION", "LLM", "AGENT"];

  it("never throws for any valid combination (200 random samples)", () => {
    for (let i = 0; i < 200; i++) {
      const inputs: RiskInputs = {
        dataSensitivity: sensitivities[Math.floor(Math.random() * sensitivities.length)],
        modelType: modelTypes[Math.floor(Math.random() * modelTypes.length)],
        explainability: Math.floor(Math.random() * 101), // 0–100
        humanOversight: Math.random() > 0.5,
        isPiiProcessing: Math.random() > 0.5,
        isFinancial: Math.random() > 0.5,
        isCritical: Math.random() > 0.5,
      };
      expect(() => calculateRiskScore(inputs)).not.toThrow();
    }
  });

  it("explainability at boundary values 0 and 100 produce valid scores", () => {
    [0, 100].forEach((explainability) => {
      const result = calculateRiskScore({ ...CRITICAL_INPUTS, explainability });
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).toContain(result.riskLevel);
    });
  });
});
