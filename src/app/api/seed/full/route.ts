import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Full comprehensive seed — 10 AI Projects + all linked data across every module.
 * GET /api/seed/full?secret=SEED_SECRET_2024
 * Safe to run on existing DB — upserts users, creates new projects/workflows/assessments.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== "SEED_SECRET_2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const counts: Record<string, number> = {};

  try {
    // ── 1. USERS (upsert) ───────────────────────────────────────────────────────
    const pw = await bcrypt.hash("Admin@123456", 10);
    const admin = await prisma.user.upsert({
      where: { email: "admin@aigovernance.com" },
      update: {},
      create: { email: "admin@aigovernance.com", name: "Priya Sharma", role: "ADMIN", passwordHash: pw, isActive: true, department: "IT Governance" },
    });
    const risk = await prisma.user.upsert({
      where: { email: "risk@aigovernance.com" },
      update: {},
      create: { email: "risk@aigovernance.com", name: "Rahul Verma", role: "RISK_OFFICER", passwordHash: pw, isActive: true, department: "Risk Management" },
    });
    const auditor = await prisma.user.upsert({
      where: { email: "auditor@aigovernance.com" },
      update: {},
      create: { email: "auditor@aigovernance.com", name: "Ananya Patel", role: "AUDITOR", passwordHash: pw, isActive: true, department: "Internal Audit" },
    });
    counts.users = 3;

    // ── 2. DATA ASSETS ──────────────────────────────────────────────────────────
    const existingAssets = await prisma.dataAsset.findMany({ take: 10 });
    let da1 = existingAssets.find((d) => d.name === "Customer PII Database");
    let da2 = existingAssets.find((d) => d.name === "Transaction Logs");
    let da3 = existingAssets.find((d) => d.name === "Employee Records");

    if (!da1) da1 = await prisma.dataAsset.create({ data: { name: "Customer PII Database", description: "Primary customer personal data store", source: "AWS RDS", dataType: "structured", sensitivity: "PII", hasPii: true, piiFields: ["name", "email", "phone", "aadhaar"], retentionDays: 1095, location: "AWS RDS ap-south-1", format: "SQL", owner: admin.id, tags: ["customers", "pii", "dpdp"] } });
    if (!da2) da2 = await prisma.dataAsset.create({ data: { name: "Transaction Logs", description: "Financial transaction records", source: "Azure SQL", dataType: "structured", sensitivity: "CONFIDENTIAL", hasPii: false, piiFields: [], retentionDays: 2555, location: "Azure SQL West Europe", format: "SQL", owner: risk.id, tags: ["finance", "transactions"] } });
    if (!da3) da3 = await prisma.dataAsset.create({ data: { name: "Employee Records", description: "HR employee data repository", source: "SharePoint Online", dataType: "unstructured", sensitivity: "RESTRICTED", hasPii: true, piiFields: ["name", "salary", "performance"], retentionDays: 3650, location: "SharePoint Online", format: "JSON", owner: admin.id, tags: ["hr", "employees"] } });

    const da4 = await prisma.dataAsset.create({ data: { name: "KYC Document Store", description: "Know Your Customer identity documents", source: "S3 Bucket", dataType: "unstructured", sensitivity: "RESTRICTED", hasPii: true, piiFields: ["pan", "aadhaar", "passport", "photo"], retentionDays: 2555, location: "S3 ap-south-1", format: "PDF/Image", owner: risk.id, tags: ["kyc", "identity", "dpdp"] } });
    const da5 = await prisma.dataAsset.create({ data: { name: "Market Data Feed", description: "Real-time and historical market prices", source: "Bloomberg API", dataType: "structured", sensitivity: "CONFIDENTIAL", hasPii: false, piiFields: [], retentionDays: 1825, location: "Bloomberg Terminal", format: "JSON", owner: admin.id, tags: ["market", "financial", "realtime"] } });
    const da6 = await prisma.dataAsset.create({ data: { name: "Claims History Database", description: "Insurance claims records and outcomes", source: "Oracle DB", dataType: "structured", sensitivity: "CONFIDENTIAL", hasPii: true, piiFields: ["name", "policy_number", "medical_info"], retentionDays: 3650, location: "Oracle DB on-prem", format: "SQL", owner: risk.id, tags: ["claims", "insurance"] } });
    counts.dataAssets = 6;

    // ── 3. AI MODELS ────────────────────────────────────────────────────────────
    const existingModels = await prisma.aIModel.findMany({ take: 20 });
    const getOrCreate = async (name: string, data: Parameters<typeof prisma.aIModel.create>[0]["data"]) => {
      return existingModels.find((m) => m.name === name) ?? await prisma.aIModel.create({ data });
    };

    const m1 = await getOrCreate("Credit Risk Scorer", { name: "Credit Risk Scorer", version: "2.1.0", type: "ML", status: "ACTIVE", description: "ML model for credit risk assessment using XGBoost", ownerId: risk.id, vendor: "Internal", framework: "XGBoost", department: "Risk Management", isPiiProcessing: true, isFinancial: true, isCritical: true, humanOversight: true, explainability: 65, trainingDataset: "Customer PII Database", accuracyScore: 0.89, tags: ["credit", "risk", "production"] });
    const m2 = await getOrCreate("Fraud Detection Engine", { name: "Fraud Detection Engine", version: "3.0.1", type: "ML", status: "ACTIVE", description: "Real-time transaction fraud detection", ownerId: risk.id, vendor: "Internal", framework: "TensorFlow", department: "Financial Crime", isPiiProcessing: true, isFinancial: true, isCritical: true, humanOversight: true, explainability: 45, trainingDataset: "Transaction Logs", accuracyScore: 0.94, tags: ["fraud", "realtime", "critical"] });
    const m3 = await getOrCreate("Customer Churn Predictor", { name: "Customer Churn Predictor", version: "1.4.2", type: "ML", status: "UNDER_REVIEW", description: "Predicts customer churn probability", ownerId: admin.id, vendor: "Internal", framework: "scikit-learn", department: "Marketing", isPiiProcessing: true, isFinancial: false, isCritical: false, humanOversight: true, explainability: 72, trainingDataset: "Customer PII Database", accuracyScore: 0.82, tags: ["churn", "marketing"] });
    const m4 = await getOrCreate("NLP Document Classifier", { name: "NLP Document Classifier", version: "1.0.0", type: "NLP", status: "ACTIVE", description: "Classifies regulatory documents automatically", ownerId: auditor.id, vendor: "OpenAI", framework: "GPT-4", department: "Compliance", isPiiProcessing: false, isFinancial: false, isCritical: false, humanOversight: true, explainability: 55, accuracyScore: 0.91, tags: ["nlp", "compliance", "documents"] });
    const m5 = await getOrCreate("Employee Sentiment Analyzer", { name: "Employee Sentiment Analyzer", version: "1.1.0", type: "NLP", status: "DEPRECATED", description: "Analyzes employee feedback sentiment", ownerId: admin.id, vendor: "Internal", framework: "HuggingFace", department: "Human Resources", isPiiProcessing: true, isFinancial: false, isCritical: false, humanOversight: false, explainability: 40, accuracyScore: 0.76, tags: ["hr", "nlp", "deprecated"] });
    const m6 = await prisma.aIModel.create({ data: { name: "KYC Identity Verifier", version: "1.2.0", type: "COMPUTER_VISION", status: "ACTIVE", description: "AI-powered identity document verification and face matching", ownerId: risk.id, vendor: "Internal", framework: "PyTorch", department: "Compliance", isPiiProcessing: true, isFinancial: true, isCritical: true, humanOversight: true, explainability: 38, trainingDataset: "KYC Document Store", accuracyScore: 0.96, tags: ["kyc", "vision", "identity", "critical"] } });
    const m7 = await prisma.aIModel.create({ data: { name: "Loan Underwriting AI", version: "2.0.0", type: "ML", status: "UNDER_REVIEW", description: "Automated loan underwriting and approval recommendation", ownerId: risk.id, vendor: "Internal", framework: "XGBoost", department: "Retail Banking", isPiiProcessing: true, isFinancial: true, isCritical: true, humanOversight: true, explainability: 60, trainingDataset: "Customer PII Database", accuracyScore: 0.87, tags: ["lending", "underwriting", "credit"] } });
    const m8 = await prisma.aIModel.create({ data: { name: "Market Risk Forecaster", version: "1.0.0", type: "ML", status: "ACTIVE", description: "Forecasts market risk using time-series models", ownerId: admin.id, vendor: "Internal", framework: "Prophet + LSTM", department: "Treasury", isPiiProcessing: false, isFinancial: true, isCritical: true, humanOversight: true, explainability: 50, trainingDataset: "Market Data Feed", accuracyScore: 0.79, tags: ["market", "forecasting", "treasury"] } });
    const m9 = await prisma.aIModel.create({ data: { name: "Claims Processing AI", version: "1.3.0", type: "NLP", status: "ACTIVE", description: "Automated insurance claims processing and decision support", ownerId: admin.id, vendor: "Internal", framework: "BERT", department: "Claims", isPiiProcessing: true, isFinancial: true, isCritical: false, humanOversight: true, explainability: 58, trainingDataset: "Claims History Database", accuracyScore: 0.88, tags: ["claims", "insurance", "nlp"] } });
    const m10 = await prisma.aIModel.create({ data: { name: "AML Transaction Monitor", version: "2.5.0", type: "ML", status: "ACTIVE", description: "Anti-money laundering transaction monitoring and alert generation", ownerId: risk.id, vendor: "Internal", framework: "Isolation Forest + GNN", department: "Financial Crime", isPiiProcessing: true, isFinancial: true, isCritical: true, humanOversight: true, explainability: 42, trainingDataset: "Transaction Logs", accuracyScore: 0.93, tags: ["aml", "compliance", "critical"] } });
    counts.aiModels = 10;

    // ── 4. MODEL ↔ DATA ASSET LINKS ─────────────────────────────────────────────
    const modelAssetLinks = [
      { modelId: m6.id, dataAssetId: da4.id, role: "input" },
      { modelId: m7.id, dataAssetId: da1.id, role: "input" },
      { modelId: m7.id, dataAssetId: da2.id, role: "input" },
      { modelId: m8.id, dataAssetId: da5.id, role: "input" },
      { modelId: m9.id, dataAssetId: da6.id, role: "input" },
      { modelId: m10.id, dataAssetId: da2.id, role: "input" },
    ];
    for (const link of modelAssetLinks) {
      await prisma.modelDataAsset.upsert({ where: { modelId_dataAssetId: { modelId: link.modelId, dataAssetId: link.dataAssetId } }, update: {}, create: link }).catch(() => {});
    }

    // ── 5. RISK ASSESSMENTS ─────────────────────────────────────────────────────
    const riskData = [
      { modelId: m6.id, riskLevel: "HIGH" as const, overallScore: 82, dataSensitivityScore: 95, modelComplexityScore: 75, explainabilityScore: 38, humanOversightScore: 85, regulatoryExposureScore: 90, findings: "Face recognition technology raises significant privacy concerns under DPDP Act. Potential for demographic bias.", mitigations: "Implement demographic parity testing. Add human-in-loop for all rejections. DPIA required." },
      { modelId: m7.id, riskLevel: "CRITICAL" as const, overallScore: 88, dataSensitivityScore: 90, modelComplexityScore: 80, explainabilityScore: 60, humanOversightScore: 75, regulatoryExposureScore: 95, findings: "Automated credit decisions with limited explainability. High regulatory exposure under RBI guidelines and DPDP.", mitigations: "Implement SHAP explanations for every decision. Establish appeal mechanism. Quarterly bias audits." },
      { modelId: m8.id, riskLevel: "MEDIUM" as const, overallScore: 55, dataSensitivityScore: 40, modelComplexityScore: 65, explainabilityScore: 50, humanOversightScore: 80, regulatoryExposureScore: 60, findings: "Model performance degrades during high volatility periods. Backtesting shows 15% accuracy drop in stress scenarios.", mitigations: "Add regime detection layer. Monthly revalidation against stress scenarios. Alert thresholds for low-confidence predictions." },
      { modelId: m9.id, riskLevel: "MEDIUM" as const, overallScore: 48, dataSensitivityScore: 65, modelComplexityScore: 55, explainabilityScore: 58, humanOversightScore: 85, regulatoryExposureScore: 50, findings: "NLP model may misclassify complex claims. Medical terminology coverage gaps identified.", mitigations: "Domain expert review for claims above ₹5L. Expand medical terminology training data. Monthly accuracy monitoring." },
      { modelId: m10.id, riskLevel: "HIGH" as const, overallScore: 79, dataSensitivityScore: 85, modelComplexityScore: 85, explainabilityScore: 42, humanOversightScore: 90, regulatoryExposureScore: 92, findings: "Graph neural network outputs not easily explainable to regulators. High false positive rate creates customer friction.", mitigations: "Develop regulator-facing explanation reports. Tune alert thresholds to reduce false positives by 20%." },
    ];
    for (const rd of riskData) {
      await prisma.riskAssessment.create({ data: { ...rd, assessorId: risk.id, reviewedAt: new Date(), nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }).catch(() => {});
    }
    counts.riskAssessments = 5;

    // ── 6. COMPLIANCE CONTROLS ──────────────────────────────────────────────────
    const controlsData = [
      { modelId: m6.id, framework: "DPDP", controlId: "DPDP-6.1", controlName: "Biometric Data Protection", description: "Special protections for biometric data processing", status: "PARTIAL" as const, notes: "Face matching implemented but consent logging incomplete" },
      { modelId: m6.id, framework: "ISO42001", controlId: "ISO42001-8.2", controlName: "Computer Vision Bias Testing", description: "Bias testing across demographic groups for CV models", status: "FAIL" as const, notes: "Demographic parity testing not yet implemented" },
      { modelId: m7.id, framework: "DPDP", controlId: "DPDP-7.1", controlName: "Automated Decision Explanation", description: "Provide explanations for automated credit decisions", status: "PARTIAL" as const, notes: "Basic SHAP implemented, not customer-facing yet" },
      { modelId: m7.id, framework: "ISO42001", controlId: "ISO42001-9.1", controlName: "Credit Model Validation", description: "Independent model validation before production deployment", status: "PENDING_REVIEW" as const, notes: "Awaiting third-party validation completion" },
      { modelId: m8.id, framework: "ISO42001", controlId: "ISO42001-10.1", controlName: "Market Risk Model Governance", description: "Governance framework for market risk models", status: "PASS" as const, evidence: "Model governance policy approved by board", notes: "Reviewed Q1 2026" },
      { modelId: m9.id, framework: "DPDP", controlId: "DPDP-8.1", controlName: "Medical Data Privacy", description: "Special handling for sensitive health data in claims", status: "PASS" as const, evidence: "Data minimization enforced, access controls in place", notes: "Compliant as of Jan 2026" },
      { modelId: m10.id, framework: "ISO42001", controlId: "ISO42001-11.1", controlName: "AML Alert Explainability", description: "Explain AML alerts to compliance officers", status: "PARTIAL" as const, notes: "Alert summaries generated but regulatory-grade explanations pending" },
      { modelId: m10.id, framework: "DPDP", controlId: "DPDP-9.1", controlName: "Financial Intelligence Sharing", description: "Controls for sharing flagged transaction data with FIU", status: "PASS" as const, evidence: "FIU data sharing agreement signed, controls implemented" },
    ];
    for (const ctrl of controlsData) {
      await prisma.complianceControl.upsert({
        where: { modelId_framework_controlId: { modelId: ctrl.modelId, framework: ctrl.framework, controlId: ctrl.controlId } },
        update: {},
        create: { ...ctrl, reviewedAt: new Date(), reviewedBy: risk.id },
      }).catch(() => {});
    }
    counts.complianceControls = 8;

    // ── 7. AGENTS ───────────────────────────────────────────────────────────────
    const agent3 = await prisma.agent.create({ data: { name: "KYC Verification Agent", description: "Automated KYC document verification with human escalation", modelId: m6.id, status: "RUNNING", systemPrompt: "You are a KYC verification agent. Verify identity documents and escalate to human reviewer when confidence < 0.85.", tools: ["verify_document", "face_match", "escalate_human", "update_kyc_status"], version: "1.0.0", maxTokens: 2000, temperature: 0.1 } }).catch(() => null);
    const agent4 = await prisma.agent.create({ data: { name: "AML Alert Analyst", description: "AI analyst for AML alert review and disposition", modelId: m10.id, status: "RUNNING", systemPrompt: "You are an AML analyst. Review transaction alerts, assess risk, and recommend PASS/REVIEW/BLOCK dispositions.", tools: ["read_transactions", "check_watchlist", "write_disposition", "escalate_sar"], version: "2.0.0", maxTokens: 3000, temperature: 0.2 } }).catch(() => null);
    counts.agents = 2;

    // ── 8. 10 AI PROJECTS ───────────────────────────────────────────────────────
    const projectDefs = [
      { name: "Credit Scoring AI Modernization", description: "Modernize legacy credit scoring with explainable ML models compliant with RBI and DPDP guidelines.", status: "ACTIVE" as const, currentPhase: "DEPLOYMENT" as const, healthScore: 78, healthStatus: "AT_RISK" as const, budget: 4500000, tags: ["credit", "rbi", "explainability"], modelId: m1.id },
      { name: "Fraud Detection ML Pipeline", description: "Build real-time fraud detection pipeline with <50ms latency for payment transactions.", status: "ACTIVE" as const, currentPhase: "MONITORING" as const, healthScore: 92, healthStatus: "HEALTHY" as const, budget: 6200000, tags: ["fraud", "realtime", "payments"], modelId: m2.id },
      { name: "Customer Churn Prediction Platform", description: "Predict customer churn 90 days in advance with actionable intervention recommendations.", status: "ACTIVE" as const, currentPhase: "TESTING_VALIDATION" as const, healthScore: 65, healthStatus: "AT_RISK" as const, budget: 2800000, tags: ["churn", "retention", "marketing"], modelId: m3.id },
      { name: "NLP Regulatory Document Analysis", description: "Automate analysis of regulatory circulars and compliance documentation using NLP.", status: "COMPLETED" as const, currentPhase: "MONITORING" as const, healthScore: 95, healthStatus: "HEALTHY" as const, budget: 1800000, tags: ["nlp", "compliance", "automation"], modelId: m4.id },
      { name: "Employee Sentiment Analysis Platform", description: "Understand workforce sentiment from surveys and communication platforms to drive HR decisions.", status: "ON_HOLD" as const, currentPhase: "MODEL_DEVELOPMENT" as const, healthScore: 40, healthStatus: "CRITICAL" as const, budget: 1200000, tags: ["hr", "nlp", "sentiment"], modelId: m5.id },
      { name: "AI-Powered KYC Verification", description: "End-to-end AI-powered KYC onboarding with document OCR, face matching, and liveness detection.", status: "ACTIVE" as const, currentPhase: "TESTING_VALIDATION" as const, healthScore: 82, healthStatus: "HEALTHY" as const, budget: 5500000, tags: ["kyc", "identity", "onboarding"], modelId: m6.id },
      { name: "Loan Underwriting Automation", description: "Automate retail loan underwriting decisions with SHAP-powered explanations for customers.", status: "ACTIVE" as const, currentPhase: "DATA_DISCOVERY" as const, healthScore: 70, healthStatus: "AT_RISK" as const, budget: 7000000, tags: ["lending", "underwriting", "explainability"], modelId: m7.id },
      { name: "Market Risk Assessment AI", description: "AI-driven market risk assessment and stress testing for treasury operations.", status: "DRAFT" as const, currentPhase: "BUSINESS_CASE" as const, healthScore: 100, healthStatus: "HEALTHY" as const, budget: 3500000, tags: ["market", "risk", "treasury"], modelId: m8.id },
      { name: "Claims Processing Intelligence", description: "Intelligent claims triaging, fraud detection, and automated decision support for insurance claims.", status: "ACTIVE" as const, currentPhase: "TESTING_VALIDATION" as const, healthScore: 75, healthStatus: "AT_RISK" as const, budget: 4200000, tags: ["claims", "insurance", "automation"], modelId: m9.id },
      { name: "Anti-Money Laundering Detection", description: "Next-gen AML using graph neural networks to detect complex money laundering typologies.", status: "ACTIVE" as const, currentPhase: "DEPLOYMENT" as const, healthScore: 88, healthStatus: "HEALTHY" as const, budget: 8500000, tags: ["aml", "compliance", "gnn"], modelId: m10.id },
    ];

    const phasesByProject: Record<string, { phase: string; progress: number; status: string }[]> = {
      "Credit Scoring AI Modernization": [
        { phase: "BUSINESS_CASE", progress: 100, status: "DONE" },
        { phase: "DATA_DISCOVERY", progress: 100, status: "DONE" },
        { phase: "MODEL_DEVELOPMENT", progress: 100, status: "DONE" },
        { phase: "TESTING_VALIDATION", progress: 100, status: "DONE" },
        { phase: "DEPLOYMENT", progress: 65, status: "IN_PROGRESS" },
        { phase: "MONITORING", progress: 0, status: "BACKLOG" },
      ],
      "Fraud Detection ML Pipeline": [
        { phase: "BUSINESS_CASE", progress: 100, status: "DONE" },
        { phase: "DATA_DISCOVERY", progress: 100, status: "DONE" },
        { phase: "MODEL_DEVELOPMENT", progress: 100, status: "DONE" },
        { phase: "TESTING_VALIDATION", progress: 100, status: "DONE" },
        { phase: "DEPLOYMENT", progress: 100, status: "DONE" },
        { phase: "MONITORING", progress: 80, status: "IN_PROGRESS" },
      ],
      "Customer Churn Prediction Platform": [
        { phase: "BUSINESS_CASE", progress: 100, status: "DONE" },
        { phase: "DATA_DISCOVERY", progress: 100, status: "DONE" },
        { phase: "MODEL_DEVELOPMENT", progress: 100, status: "DONE" },
        { phase: "TESTING_VALIDATION", progress: 45, status: "IN_PROGRESS" },
        { phase: "DEPLOYMENT", progress: 0, status: "BACKLOG" },
        { phase: "MONITORING", progress: 0, status: "BACKLOG" },
      ],
      "NLP Regulatory Document Analysis": [
        { phase: "BUSINESS_CASE", progress: 100, status: "DONE" },
        { phase: "DATA_DISCOVERY", progress: 100, status: "DONE" },
        { phase: "MODEL_DEVELOPMENT", progress: 100, status: "DONE" },
        { phase: "TESTING_VALIDATION", progress: 100, status: "DONE" },
        { phase: "DEPLOYMENT", progress: 100, status: "DONE" },
        { phase: "MONITORING", progress: 100, status: "DONE" },
      ],
      "Employee Sentiment Analysis Platform": [
        { phase: "BUSINESS_CASE", progress: 100, status: "DONE" },
        { phase: "DATA_DISCOVERY", progress: 100, status: "DONE" },
        { phase: "MODEL_DEVELOPMENT", progress: 30, status: "IN_PROGRESS" },
        { phase: "TESTING_VALIDATION", progress: 0, status: "BACKLOG" },
        { phase: "DEPLOYMENT", progress: 0, status: "BACKLOG" },
        { phase: "MONITORING", progress: 0, status: "BACKLOG" },
      ],
      "AI-Powered KYC Verification": [
        { phase: "BUSINESS_CASE", progress: 100, status: "DONE" },
        { phase: "DATA_DISCOVERY", progress: 100, status: "DONE" },
        { phase: "MODEL_DEVELOPMENT", progress: 100, status: "DONE" },
        { phase: "TESTING_VALIDATION", progress: 70, status: "IN_PROGRESS" },
        { phase: "DEPLOYMENT", progress: 0, status: "BACKLOG" },
        { phase: "MONITORING", progress: 0, status: "BACKLOG" },
      ],
      "Loan Underwriting Automation": [
        { phase: "BUSINESS_CASE", progress: 100, status: "DONE" },
        { phase: "DATA_DISCOVERY", progress: 55, status: "IN_PROGRESS" },
        { phase: "MODEL_DEVELOPMENT", progress: 0, status: "BACKLOG" },
        { phase: "TESTING_VALIDATION", progress: 0, status: "BACKLOG" },
        { phase: "DEPLOYMENT", progress: 0, status: "BACKLOG" },
        { phase: "MONITORING", progress: 0, status: "BACKLOG" },
      ],
      "Market Risk Assessment AI": [
        { phase: "BUSINESS_CASE", progress: 40, status: "IN_PROGRESS" },
        { phase: "DATA_DISCOVERY", progress: 0, status: "BACKLOG" },
        { phase: "MODEL_DEVELOPMENT", progress: 0, status: "BACKLOG" },
        { phase: "TESTING_VALIDATION", progress: 0, status: "BACKLOG" },
        { phase: "DEPLOYMENT", progress: 0, status: "BACKLOG" },
        { phase: "MONITORING", progress: 0, status: "BACKLOG" },
      ],
      "Claims Processing Intelligence": [
        { phase: "BUSINESS_CASE", progress: 100, status: "DONE" },
        { phase: "DATA_DISCOVERY", progress: 100, status: "DONE" },
        { phase: "MODEL_DEVELOPMENT", progress: 100, status: "DONE" },
        { phase: "TESTING_VALIDATION", progress: 60, status: "IN_PROGRESS" },
        { phase: "DEPLOYMENT", progress: 0, status: "BACKLOG" },
        { phase: "MONITORING", progress: 0, status: "BACKLOG" },
      ],
      "Anti-Money Laundering Detection": [
        { phase: "BUSINESS_CASE", progress: 100, status: "DONE" },
        { phase: "DATA_DISCOVERY", progress: 100, status: "DONE" },
        { phase: "MODEL_DEVELOPMENT", progress: 100, status: "DONE" },
        { phase: "TESTING_VALIDATION", progress: 100, status: "DONE" },
        { phase: "DEPLOYMENT", progress: 85, status: "IN_PROGRESS" },
        { phase: "MONITORING", progress: 0, status: "BACKLOG" },
      ],
    };

    const createdProjects = [];
    for (const pd of projectDefs) {
      const { modelId, ...projectData } = pd;
      const project = await prisma.project.create({
        data: {
          ...projectData,
          ownerId: admin.id,
          startDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
          targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          completedAt: pd.status === "COMPLETED" ? new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) : undefined,
        },
      });
      createdProjects.push(project);

      // Phase records
      const phases = phasesByProject[pd.name] ?? [];
      for (const ph of phases) {
        await prisma.projectPhaseRecord.create({
          data: {
            projectId: project.id,
            phase: ph.phase as "BUSINESS_CASE" | "DATA_DISCOVERY" | "MODEL_DEVELOPMENT" | "TESTING_VALIDATION" | "DEPLOYMENT" | "MONITORING",
            status: ph.status as "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED",
            progress: ph.progress,
            plannedDays: 30,
            actualDays: ph.status === "DONE" ? 28 : undefined,
            completedAt: ph.status === "DONE" ? new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) : undefined,
          },
        }).catch(() => {});
      }

      // Tasks (3 per project)
      const taskTitles = [
        [`Define ${pd.name} governance requirements`, "Complete data requirements analysis", "Submit project charter for approval"],
        [`Develop ${modelId ? "model" : "pipeline"} architecture`, "Implement bias testing framework", "Conduct security review"],
        ["Deploy to staging environment", "Execute UAT with business users", "Prepare production deployment runbook"],
      ];
      const taskPhases: ("BUSINESS_CASE" | "DATA_DISCOVERY" | "MODEL_DEVELOPMENT")[] = ["BUSINESS_CASE", "DATA_DISCOVERY", "MODEL_DEVELOPMENT"];
      for (let t = 0; t < 3; t++) {
        await prisma.projectTask.create({
          data: {
            projectId: project.id,
            phase: taskPhases[t],
            title: taskTitles[t][0],
            description: `Task for ${pd.name} — ${taskTitles[t][0]}`,
            status: t === 0 ? "DONE" : t === 1 ? "IN_PROGRESS" : "BACKLOG",
            priority: t === 0 ? "HIGH" : "MEDIUM",
            assigneeId: t % 2 === 0 ? admin.id : risk.id,
            reporterId: auditor.id,
            dueDate: new Date(Date.now() + (t + 1) * 14 * 24 * 60 * 60 * 1000),
            estimatedHrs: 40,
            actualHrs: t === 0 ? 38 : undefined,
            completedAt: t === 0 ? new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) : undefined,
          },
        }).catch(() => {});
      }

      // Milestones (2 per project)
      await prisma.milestone.createMany({
        data: [
          { projectId: project.id, phase: "DATA_DISCOVERY", name: "Data Readiness Sign-off", description: "All data sources validated and access confirmed", targetDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000), isGate: true },
          { projectId: project.id, phase: "DEPLOYMENT", name: "Production Go-Live", description: "Model deployed to production and monitoring active", targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), isGate: true },
        ],
      }).catch(() => {});

      // Resources (link all 3 users)
      for (const [userId, role] of [[admin.id, "LEAD"], [risk.id, "REVIEWER"], [auditor.id, "STAKEHOLDER"]] as const) {
        await prisma.projectResource.upsert({
          where: { projectId_userId: { projectId: project.id, userId } },
          update: {},
          create: { projectId: project.id, userId, role, allocationPct: role === "LEAD" ? 80 : 30, startDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) },
        }).catch(() => {});
      }

      // Link model to project
      if (modelId) {
        await prisma.projectAIModel.upsert({
          where: { projectId_modelId: { projectId: project.id, modelId } },
          update: {},
          create: { projectId: project.id, modelId, role: "output", notes: "Primary AI model for this project" },
        }).catch(() => {});
      }
    }
    counts.projects = createdProjects.length;

    // ── 9. IMPACT ASSESSMENTS (ISO 42005) ───────────────────────────────────────
    const assessmentData = [
      { modelId: m6.id, intendedUses: ["KYC onboarding", "Document verification", "Identity confirmation"], unintendedUses: ["Surveillance", "Law enforcement identification", "Age verification for restricted content"], algorithmType: "Convolutional Neural Network", algorithmDescription: "Multi-stage pipeline: OCR for document text extraction, face detection, face matching using ArcFace embeddings, liveness detection using depth estimation.", developmentApproach: "Transfer learning from pre-trained ResNet-50, fine-tuned on 2M KYC document samples", geographicScope: ["India", "UAE", "Singapore"], deploymentLanguages: ["English", "Hindi"], environmentDescription: "Cloud-hosted on AWS with on-premise fallback. Integrated with core banking system and CKYC registry.", accountability: "Head of Digital Banking accountable. All rejections logged with reason codes and escalation paths to human reviewers.", transparency: "Customers informed of AI-based verification at onboarding. Rejection reasons disclosed. Manual review option available.", fairness: "Demographic parity testing across gender and age groups. Bias score 0.04 — within threshold. Quarterly testing schedule.", privacy: "Biometric data encrypted at rest (AES-256) and in transit (TLS 1.3). DPIA completed. Data retained for 7 years per RBI guidelines.", reliability: "99.5% uptime SLA. Fallback to manual KYC on model failure. Load testing completed up to 10,000 concurrent sessions.", safety: "Liveness detection prevents spoofing attacks. Human override available at any stage. Automatic escalation for low-confidence predictions.", explainabilityDoc: "LIME explanations generated for each decision. Explanation summary provided to compliance team. Customer-facing reason codes defined.", environmentalImpact: "GPU inference cluster — estimated 2.4 tonnes CO2/year. Optimization roadmap to reduce by 30% via model quantization.", failureMisuse: "Spoofing attempts detected and logged. Rate limiting on failed attempts. FIR filed for proven fraud attempts per policy." },
      { modelId: m7.id, intendedUses: ["Retail loan eligibility assessment", "Credit limit determination", "Risk-based pricing"], unintendedUses: ["Employment screening", "Insurance underwriting", "Discriminatory lending practices"], algorithmType: "Gradient Boosted Trees (XGBoost)", algorithmDescription: "Ensemble model with 500 trees. Features: income, credit bureau data, banking history, DTI ratio. SHAP values computed for all predictions.", developmentApproach: "Supervised learning on 5 years of loan origination data. Stratified sampling to address class imbalance. 80/20 train-test split.", geographicScope: ["India"], deploymentLanguages: ["English", "Hindi", "Tamil", "Marathi"], environmentDescription: "Deployed on private cloud with API gateway. Integrated with CBS, credit bureau APIs (CIBIL, Experian), and mobile banking app.", accountability: "Chief Risk Officer accountable for model. Credit committee reviews model performance quarterly. All decisions logged with full audit trail.", transparency: "SHAP-based explanation generated for every loan decision. Customer receives top 3 factors influencing decision. RBI mandated disclosure implemented.", fairness: "Tested across gender, age, geography, and income groups. FICO parity score: 0.91. No discriminatory features in model. Annual independent audit.", privacy: "Only consented data processed. Data minimization enforced. DPDP consent obtained at application. Data deleted after 3 years from rejection.", reliability: "SLA: <200ms p95 latency. 99.9% availability. Circuit breaker implemented for bureau API failures. Decision cached for 30 days.", safety: "Human review mandatory for borderline decisions (score 580-620). Maximum loan amount capped at ₹10L for fully automated decisions.", explainabilityDoc: "SHAP TreeExplainer used. Monthly shapley value drift monitoring. Regulatory reporting package available for RBI inspection.", environmentalImpact: "CPU-based inference — minimal energy footprint. Estimated 0.3 tonnes CO2/year.", failureMisuse: "Adversarial input detection implemented. Rate limiting on API. Fraud attempts flagged to FIU. Model locked during suspicious access patterns." },
      { modelId: m10.id, intendedUses: ["Transaction monitoring for AML", "Suspicious activity detection", "SAR generation support"], unintendedUses: ["Customer profiling for marketing", "Credit decisioning", "Tax authority reporting without legal basis"], algorithmType: "Graph Neural Network + Isolation Forest", algorithmDescription: "Two-stage model: Isolation Forest for anomaly detection on individual transactions, GNN to analyze transaction network topology and detect complex money laundering typologies.", developmentApproach: "Semi-supervised learning on labeled SAR cases + unsupervised anomaly detection. Graph constructed from account relationships.", geographicScope: ["India", "Global cross-border transactions"], deploymentLanguages: ["English"], environmentDescription: "Real-time stream processing on Kafka. Model inference on GPU cluster. Integrated with CBS, SWIFT, and FIU reporting system.", accountability: "Chief Compliance Officer accountable. MLRO reviews all model-generated SARs before filing. Board-level quarterly AML report.", transparency: "Compliance officers receive alert summary with key suspicious indicators. Customer not informed (tipping-off prohibition). Regulator access to full audit trail.", fairness: "Transaction typology tested for geographic bias. Low-income customer false positive rate monitored monthly. No demographic features in model.", privacy: "Data shared with FIU only as legally required under PMLA. Customer data accessed under regulatory obligation. DPDP exemption for AML processing.", reliability: "Real-time processing with <100ms alert generation. 99.99% uptime requirement. Hot standby deployment.", safety: "Conservative tuning to minimize missed SAR filings. Human review for all high-risk alerts. Automatic account freeze capability with dual authorization.", explainabilityDoc: "Alert narratives auto-generated with transaction timeline and network visualization. Regulator-ready explanation report produced per SAR.", environmentalImpact: "High compute intensity — estimated 8.2 tonnes CO2/year. Migration to more efficient GNN architecture planned for 2027.", failureMisuse: "Access strictly role-based. All alert dispositions logged. Tampering detection via blockchain audit trail. Annual penetration testing." },
    ];
    for (const ad of assessmentData) {
      await prisma.impactAssessment.upsert({ where: { modelId: ad.modelId }, update: ad, create: ad }).catch(() => {});
    }
    counts.impactAssessments = assessmentData.length;

    // ── 10. INTERESTED PARTIES ──────────────────────────────────────────────────
    const partiesData = [
      { modelId: m6.id, name: "UIDAI (Aadhaar Authority)", role: "REGULATOR" as const, interest: "Compliance with Aadhaar authentication guidelines and data localisation requirements", consulted: true, consultedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
      { modelId: m6.id, name: "Bank Customers", role: "DATA_SUBJECT" as const, interest: "Accurate identity verification, data privacy, right to manual review", consulted: false },
      { modelId: m7.id, name: "RBI (Reserve Bank of India)", role: "REGULATOR" as const, interest: "Fair lending practices, explainable AI in credit decisions, FLDG guidelines compliance", consulted: true, consultedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      { modelId: m7.id, name: "Loan Applicants", role: "DATA_SUBJECT" as const, interest: "Fair and unbiased credit decisions, explanation of rejection, right to appeal", consulted: false },
      { modelId: m10.id, name: "Financial Intelligence Unit (FIU-IND)", role: "REGULATOR" as const, interest: "PMLA compliance, SAR quality, detection typology coverage", consulted: true, consultedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      { modelId: m10.id, name: "Compliance Officers", role: "USER" as const, interest: "Actionable alerts, low false positive rate, audit trail completeness", consulted: true, consultedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
    ];
    for (const p of partiesData) {
      await prisma.interestedParty.create({ data: p }).catch(() => {});
    }
    counts.interestedParties = partiesData.length;

    // ── 11. APPROVAL WORKFLOWS (new tables — skip if not created yet) ─────────
    try {
      const wf1 = await (prisma as any).approvalWorkflow.create({
        data: {
          title: "KYC Identity Verifier — Production Deployment Approval",
          description: "Multi-stakeholder approval for production deployment of biometric KYC model. High-risk AI system requiring legal, ethics, and executive sign-off.",
          status: "PENDING",
          requestedBy: admin.id,
          modelId: m6.id,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          notes: "DPIA completed. UIDAI guidelines reviewed. Pending Risk Officer and Legal clearance.",
          steps: {
            create: [
              { stepType: "RISK_OFFICER", label: "Risk Officer Review", assigneeId: risk.id, stepOrder: 1, status: "APPROVED", comments: "Risk assessment completed. Overall score 82/100. Mitigations documented. Approved with conditions.", decidedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
              { stepType: "LEGAL", label: "Legal & Compliance Review", assigneeId: auditor.id, stepOrder: 2, status: "PENDING", dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
              { stepType: "ETHICS", label: "Ethics Committee Review", stepOrder: 3, status: "PENDING", dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
              { stepType: "EXECUTIVE", label: "CTO Final Approval", stepOrder: 4, status: "PENDING" },
            ],
          },
        },
      });

      await (prisma as any).approvalWorkflow.create({
        data: {
          title: "Loan Underwriting AI — Model Validation Approval",
          description: "Approval for Loan Underwriting AI model after third-party validation. Required before testing phase can proceed.",
          status: "APPROVED",
          requestedBy: risk.id,
          modelId: m7.id,
          completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          steps: {
            create: [
              { stepType: "RISK_OFFICER", label: "Risk Officer Sign-off", assigneeId: risk.id, stepOrder: 1, status: "APPROVED", comments: "Model validation report reviewed. Performance metrics acceptable. SHAP implementation confirmed.", decidedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
              { stepType: "LEGAL", label: "RBI Compliance Review", assigneeId: auditor.id, stepOrder: 2, status: "APPROVED", comments: "RBI guidelines on algorithmic credit decisioning reviewed and satisfied.", decidedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
              { stepType: "EXECUTIVE", label: "Chief Risk Officer Approval", stepOrder: 3, status: "APPROVED", comments: "Approved for testing phase. Full production approval required separately.", decidedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
            ],
          },
        },
      });

      await (prisma as any).approvalWorkflow.create({
        data: {
          title: "AML Transaction Monitor — Phase 2 Deployment",
          description: "Approval for AML model deployment expansion to international wire transfers.",
          status: "ESCALATED",
          requestedBy: admin.id,
          modelId: m10.id,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          steps: {
            create: [
              { stepType: "RISK_OFFICER", label: "Risk Officer Review", assigneeId: risk.id, stepOrder: 1, status: "APPROVED", comments: "AML risk controls satisfactory. Recommend proceeding.", decidedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
              { stepType: "LEGAL", label: "Legal Review — PMLA Compliance", assigneeId: auditor.id, stepOrder: 2, status: "ESCALATED", comments: "Cross-border data sharing requires additional FIU approval. Escalated to MLRO for guidance.", decidedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
              { stepType: "EXECUTIVE", label: "MLRO Final Decision", stepOrder: 3, status: "PENDING" },
            ],
          },
        },
      });
      counts.approvalWorkflows = 3;
    } catch {
      counts.approvalWorkflows = 0; // Table not created yet
    }

    // ── 12. MISUSE SCENARIOS ────────────────────────────────────────────────────
    try {
      const misuseData = [
        { modelId: m6.id, title: "Surveillance System Repurposing", description: "KYC face matching system could be repurposed for mass surveillance by law enforcement without legal basis.", likelihood: 3, severity: 5, harmCategory: "AUTONOMY_VIOLATION", affectedGroups: ["All citizens", "Political dissidents", "Minorities"], mitigations: "Strict access controls, legal framework review, data deletion policies, audit logging of all access" },
        { modelId: m6.id, title: "Biometric Data Breach", description: "Facial biometric data could be compromised in a breach, enabling identity theft or deepfake fraud.", likelihood: 3, severity: 5, harmCategory: "PRIVACY_VIOLATION", affectedGroups: ["All customers"], mitigations: "Encrypted biometric templates, no raw image storage, zero-knowledge proof alternatives being evaluated" },
        { modelId: m7.id, title: "Discriminatory Lending via Proxy Variables", description: "Model may use socioeconomic proxies (postal code, employer) that correlate with protected characteristics, leading to discriminatory loan decisions.", likelihood: 4, severity: 4, harmCategory: "DISCRIMINATION", affectedGroups: ["Low-income applicants", "Rural residents", "Minority communities"], mitigations: "Regular fairness audits, remove high-correlation proxy features, establish appeal process with human review" },
        { modelId: m7.id, title: "Gaming of Credit Score", description: "Sophisticated applicants could reverse-engineer SHAP explanations to artificially inflate their credit profile without genuine creditworthiness improvement.", likelihood: 3, severity: 3, harmCategory: "FINANCIAL_HARM", affectedGroups: ["Lenders", "Genuine borrowers"], mitigations: "Monitor for unusual application patterns, add noise to SHAP outputs, periodic model retraining" },
        { modelId: m10.id, title: "False Positive Discrimination", description: "AML model disproportionately flags transactions from certain communities or businesses, causing account freezes and financial harm.", likelihood: 4, severity: 4, harmCategory: "DISCRIMINATION", affectedGroups: ["SMEs", "Cash-intensive businesses", "Certain ethnic communities"], mitigations: "Monthly false positive rate by segment, human review before account freeze, redress mechanism for false positives" },
        { modelId: m10.id, title: "Tipping Off via Alert Patterns", description: "Money launderers could infer AML detection patterns by systematically testing transactions and observing which trigger alerts.", likelihood: 2, severity: 5, harmCategory: "SECURITY_HARM", affectedGroups: ["Financial system integrity"], mitigations: "Randomized threshold variation, alert suppression for high-risk patterns, regular typology updates" },
        { modelId: m1.id, title: "Age-Based Discriminatory Scoring", description: "Credit scoring model may penalise younger applicants or elderly customers using age as a proxy, violating fair lending principles.", likelihood: 4, severity: 3, harmCategory: "DISCRIMINATION", affectedGroups: ["Young adults (18-25)", "Elderly (65+)"], mitigations: "Remove age as direct feature, test for age-based disparate impact, introduce age-neutral income proxies", isAddressed: true },
        { modelId: m2.id, title: "Merchant Category Profiling", description: "Fraud detection may over-flag legitimate transactions at certain merchant categories, causing genuine customers to face declined payments.", likelihood: 4, severity: 3, harmCategory: "FINANCIAL_HARM", affectedGroups: ["Small merchants", "Customers of specific business types"], mitigations: "Merchant-level calibration, customer notification for declines, expedited dispute resolution" },
      ];
      for (const ms of misuseData) {
        await (prisma as any).misuseScenario.create({ data: ms }).catch(() => {});
      }
      counts.misuseScenarios = misuseData.length;
    } catch {
      counts.misuseScenarios = 0;
    }

    // ── 13. MORE MONITORING LOGS ────────────────────────────────────────────────
    const existingAgents = await prisma.agent.findMany({ take: 5 });
    const existingModelsList = await prisma.aIModel.findMany({ take: 10 });
    const now = Date.now();
    const DAY = 86400000;
    const logsToInsert = [];
    const logSamples = [
      { prompt: "Verify KYC documents for customer ID C-38291", response: "KYC verification complete. Document: PASS (confidence 0.97). Face match: PASS (score 0.94). Liveness: PASS. Status: VERIFIED.", latencyMs: 1200, inputTokens: 320, outputTokens: 180, toxicityScore: 0.01, accuracyScore: 0.97, biasScore: 0.01, flagged: false },
      { prompt: "Analyze loan application LA-2024-8821 for credit risk", response: "Credit risk assessment: APPROVED. Score: 720/850. DTI ratio: 28% (acceptable). Key factors: stable income +, low existing debt +, short credit history -. Recommended limit: ₹5,00,000.", latencyMs: 890, inputTokens: 480, outputTokens: 290, toxicityScore: 0.01, accuracyScore: 0.95, biasScore: 0.02, flagged: false },
      { prompt: "Flag suspicious transaction TXN-98431 for AML review", response: "AML alert generated. Transaction pattern: multiple small transfers to new beneficiary within 24hrs (structuring typology). Risk score: HIGH (0.89). Recommended action: BLOCK and file SAR.", latencyMs: 2100, inputTokens: 650, outputTokens: 420, toxicityScore: 0.02, accuracyScore: 0.93, biasScore: 0.02, flagged: true, flagReason: "High-risk AML alert requires compliance review" },
      { prompt: "Process insurance claim CLM-44521 for motor accident", response: "Claim assessment: APPROVE. Damage estimate: ₹85,000. Policy coverage: ₹2,00,000. Fraud indicators: NONE detected. Settlement recommendation: Full claim amount.", latencyMs: 1650, inputTokens: 520, outputTokens: 310, toxicityScore: 0.01, accuracyScore: 0.91, biasScore: 0.01, flagged: false },
      { prompt: "Predict churn probability for customer segment PREMIUM-Q1", response: "Churn risk analysis: 23% of premium segment at HIGH risk of churn in next 90 days. Top drivers: last login >30 days, declined card usage, support tickets pending.", latencyMs: 3200, inputTokens: 890, outputTokens: 540, toxicityScore: 0.01, accuracyScore: 0.88, biasScore: 0.03, flagged: false },
      { prompt: "Classify regulatory document: RBI Circular DPSS.CO.PD.2025/14", response: "Document classified as: PAYMENT SYSTEMS REGULATION (confidence: 0.96). Applicable to: Credit card issuers, payment aggregators. Action required by: 30 June 2026.", latencyMs: 780, inputTokens: 380, outputTokens: 220, toxicityScore: 0.01, accuracyScore: 0.96, biasScore: 0.01, flagged: false },
      { prompt: "Generate fraud risk score for credit card transaction of ₹1,24,000 at international merchant", response: "Fraud risk: MEDIUM (score 0.62). Factors: large amount +, international merchant +, first transaction at this merchant +, normal spending pattern -. Action: Send OTP verification.", latencyMs: 450, inputTokens: 280, outputTokens: 160, toxicityScore: 0.01, accuracyScore: 0.94, biasScore: 0.01, flagged: false },
      { prompt: "Check if customer data processing complies with DPDP consent requirements", response: "DPDP compliance check: PARTIAL. Consent obtained for data processing: YES. Purpose limitation documented: YES. Consent for AI decision-making: NOT FOUND. Action: Obtain AI decision consent before next loan cycle.", latencyMs: 1100, inputTokens: 420, outputTokens: 270, toxicityScore: 0.01, accuracyScore: 0.97, biasScore: 0.01, flagged: false },
      { prompt: "Assess market risk for portfolio P-TREASURY-Q2 under stress scenario", response: "Market risk stress test: VaR (99%, 1-day): ₹2.3 crore. Stress scenario (2008 crisis replay): ₹8.7 crore loss. Current risk within approved limits. Monitor USD/INR closely.", latencyMs: 4200, inputTokens: 1100, outputTokens: 680, toxicityScore: 0.01, accuracyScore: 0.83, biasScore: 0.02, flagged: false },
      { prompt: "Generate explanation for loan rejection LR-2024-3319", response: "Loan rejection explanation: Primary factors: (1) Debt-to-income ratio 58% exceeds threshold of 45% — 45% weight. (2) Credit score 612 below minimum 650 — 35% weight. (3) Employment tenure 8 months below 12-month requirement — 20% weight. Customer may reapply after 90 days.", latencyMs: 1350, inputTokens: 490, outputTokens: 310, toxicityScore: 0.01, accuracyScore: 0.96, biasScore: 0.02, flagged: false },
      { prompt: "Detect anomalies in employee expense claims for Q1 2026", response: "Anomaly detection: 3 suspicious claims identified. Claim EX-1823: ₹45,000 restaurant receipt (10x average) — REVIEW. Claim EX-1891: Duplicate vendor invoice — INVESTIGATE. Claim EX-1934: Weekend international travel without approval — REVIEW.", latencyMs: 2800, inputTokens: 750, outputTokens: 480, toxicityScore: 0.03, accuracyScore: 0.89, biasScore: 0.04, flagged: true, flagReason: "Potential policy violation detected in expense claims" },
      { prompt: "Generate AML SAR narrative for case AML-2026-0892", response: "SAR Narrative: Customer exhibits structuring behavior — 14 transactions of ₹48,000-₹49,500 over 21 days, each just below ₹50,000 CTR threshold. Total: ₹6.8 lakh. Beneficiary network analysis reveals 3 previously flagged accounts. Recommend immediate SAR filing.", latencyMs: 5100, inputTokens: 1380, outputTokens: 920, toxicityScore: 0.02, accuracyScore: 0.91, biasScore: 0.02, flagged: true, flagReason: "High-confidence SAR recommendation requires MLRO review" },
    ];

    for (let day = 13; day >= 0; day--) {
      const numLogs = 2 + Math.floor(Math.random() * 3); // 2-4 logs per day
      for (let l = 0; l < numLogs; l++) {
        const sample = logSamples[(day * 3 + l) % logSamples.length];
        const model = existingModelsList[(day + l) % existingModelsList.length];
        const agent = existingAgents.length > 0 ? existingAgents[(day + l) % existingAgents.length] : null;
        const user = [admin, risk, auditor][(day + l) % 3];
        logsToInsert.push({
          modelId: model.id,
          userId: user.id,
          agentId: agent?.id ?? undefined,
          prompt: sample.prompt,
          response: sample.response,
          latencyMs: sample.latencyMs + Math.floor(Math.random() * 200 - 100),
          inputTokens: sample.inputTokens,
          outputTokens: sample.outputTokens,
          toxicityScore: sample.toxicityScore,
          accuracyScore: sample.accuracyScore,
          biasScore: sample.biasScore,
          flagged: sample.flagged ?? false,
          flagReason: sample.flagged ? (sample as {flagReason?: string}).flagReason : undefined,
          isHallucination: false,
          isPolicyViolation: false,
          environment: "production",
          createdAt: new Date(now - day * DAY + l * 3600000),
        });
      }
    }
    await prisma.promptLog.createMany({ data: logsToInsert }).catch(() => {});
    counts.promptLogs = logsToInsert.length;

    // ── 14. ALERTS ──────────────────────────────────────────────────────────────
    await prisma.alert.createMany({
      data: [
        { title: "KYC Model Demographic Bias Detected", message: "KYC Identity Verifier shows 12% higher rejection rate for age group 60-75. Bias testing triggered. Human review recommended for all rejections in this cohort.", severity: "ERROR", modelId: m6.id, isRead: false, metadata: { biasScore: 0.08, affectedGroup: "age_60_75", rejectionRate: 0.23 } },
        { title: "Loan Model Below Accuracy Threshold", message: "Loan Underwriting AI accuracy dropped to 0.83 in last 7 days (threshold: 0.85). Possible data drift. Model review scheduled.", severity: "WARNING", modelId: m7.id, isRead: false, metadata: { currentAccuracy: 0.83, threshold: 0.85 } },
        { title: "AML SAR Filing Spike", message: "AML Transaction Monitor generated 47 SAR recommendations in last 24 hours — 3x normal rate. Manual review backlog building. Additional compliance resource required.", severity: "CRITICAL", modelId: m10.id, isRead: false, metadata: { sarCount: 47, normalRate: 15 } },
        { title: "KYC System Latency Degradation", message: "KYC Identity Verifier p95 latency increased to 4.2s (SLA: 3s). Scaling triggered. Monitoring closely.", severity: "WARNING", modelId: m6.id, isRead: true, metadata: { p95Latency: 4200, slaMs: 3000 } },
        { title: "Claims AI Low Confidence Batch", message: "23 claims in batch CLM-BATCH-20260414 received confidence score < 0.70. Routed to manual review queue automatically.", severity: "INFO", modelId: m9.id, isRead: true, metadata: { lowConfidenceCount: 23, batchId: "CLM-BATCH-20260414" } },
      ],
    }).catch(() => {});
    counts.alerts = 5;

    // ── 15. CONSENT RECORDS ─────────────────────────────────────────────────────
    await prisma.consentRecord.createMany({
      data: [
        { dataAssetId: da4.id, subjectId: "customer-kyc-001", consentType: "DATA_PROCESSING", status: "GRANTED", grantedAt: new Date(Date.now() - 90 * DAY), expiresAt: new Date(Date.now() + 275 * DAY), ipAddress: "103.21.48.10", metadata: { purpose: "KYC verification and identity confirmation" } },
        { dataAssetId: da4.id, subjectId: "customer-kyc-002", consentType: "AI_DECISION", status: "GRANTED", grantedAt: new Date(Date.now() - 45 * DAY), expiresAt: new Date(Date.now() + 320 * DAY), ipAddress: "103.21.48.11", metadata: { purpose: "AI-based KYC assessment" } },
        { dataAssetId: da1.id, subjectId: "customer-loan-001", consentType: "AI_DECISION", status: "GRANTED", grantedAt: new Date(Date.now() - 30 * DAY), expiresAt: new Date(Date.now() + 335 * DAY), ipAddress: "49.205.10.22", metadata: { purpose: "Automated loan underwriting decision" } },
        { dataAssetId: da6.id, subjectId: "customer-clm-001", consentType: "DATA_PROCESSING", status: "GRANTED", grantedAt: new Date(Date.now() - 60 * DAY), expiresAt: new Date(Date.now() + 305 * DAY), ipAddress: "103.55.80.1", metadata: { purpose: "Insurance claims processing" } },
        { dataAssetId: da1.id, subjectId: "customer-005", consentType: "DATA_SHARING", status: "REVOKED", grantedAt: new Date(Date.now() - 200 * DAY), revokedAt: new Date(Date.now() - 10 * DAY), ipAddress: "49.205.10.30", metadata: { purpose: "Third party data sharing", revokedReason: "Customer request" } },
      ],
    }).catch(() => {});
    counts.consentRecords = 5;

    // ── 16. AUDIT LOGS ──────────────────────────────────────────────────────────
    const auditEntries = [
      { userId: admin.id, action: "CREATE" as const, resource: "AIModel", resourceId: m6.id, modelId: m6.id, metadata: { modelName: "KYC Identity Verifier", version: "1.2.0", riskLevel: "HIGH" } },
      { userId: risk.id, action: "CREATE" as const, resource: "RiskAssessment", resourceId: m7.id, modelId: m7.id, metadata: { riskScore: 88, riskLevel: "CRITICAL", framework: "ISO42001" } },
      { userId: auditor.id, action: "APPROVE" as const, resource: "ComplianceControl", resourceId: m8.id, metadata: { controlId: "ISO42001-10.1", status: "PASS", framework: "ISO42001" } },
      { userId: risk.id, action: "UPDATE" as const, resource: "AIModel", resourceId: m7.id, modelId: m7.id, before: { status: "ACTIVE" }, after: { status: "UNDER_REVIEW" }, metadata: { reason: "Bias testing triggered" } },
      { userId: admin.id, action: "CREATE" as const, resource: "Project", resourceId: createdProjects[0]?.id, metadata: { projectName: "Credit Scoring AI Modernization", phase: "DEPLOYMENT" } },
      { userId: risk.id, action: "ESCALATE" as const, resource: "Alert", resourceId: m10.id, modelId: m10.id, metadata: { alertType: "AML_SAR_SPIKE", sarCount: 47 } },
      { userId: auditor.id, action: "EXPORT" as const, resource: "Report", metadata: { reportType: "COMPLIANCE_STATUS", framework: "ISO42001", period: "Q1-2026" } },
      { userId: admin.id, action: "CREATE" as const, resource: "Project", resourceId: createdProjects[5]?.id, metadata: { projectName: "AI-Powered KYC Verification", phase: "TESTING_VALIDATION" } },
      { userId: risk.id, action: "UPDATE" as const, resource: "ComplianceControl", metadata: { controlId: "DPDP-6.1", oldStatus: "PENDING_REVIEW", newStatus: "PARTIAL" } },
      { userId: auditor.id, action: "CREATE" as const, resource: "RiskAssessment", resourceId: m10.id, modelId: m10.id, metadata: { riskScore: 79, riskLevel: "HIGH" } },
    ];
    for (const entry of auditEntries) {
      await prisma.auditLog.create({ data: { ...entry, ipAddress: "10.0.0.1", userAgent: "Mozilla/5.0 (AI Governance Control Tower)" } }).catch(() => {});
    }
    counts.auditLogs = auditEntries.length;

    // ── 17. REPORTS ─────────────────────────────────────────────────────────────
    await prisma.report.createMany({
      data: [
        { name: "Q1 2026 AI Governance Executive Summary", description: "Board-level AI governance overview for Q1 2026", type: "EXECUTIVE_SUMMARY", sections: ["risk_overview", "compliance_status", "incidents", "upcoming_reviews"], createdBy: admin.id },
        { name: "ISO 42001 Compliance Status — April 2026", description: "Full ISO 42001 control status across all AI models", type: "COMPLIANCE_STATUS", filters: { framework: "ISO42001" } as never, sections: ["control_summary", "gaps", "remediation_plan"], createdBy: risk.id },
        { name: "AI Model Risk Assessment Report", description: "Risk scores and findings for all production AI models", type: "RISK_ASSESSMENT", sections: ["risk_matrix", "high_risk_models", "mitigations"], createdBy: risk.id },
        { name: "AI Inventory — April 2026", description: "Complete inventory of all AI models and their governance status", type: "AI_INVENTORY", sections: ["model_list", "lifecycle_status", "ownership"], createdBy: auditor.id },
        { name: "ISO 42005 Impact Assessment Summary", description: "Impact assessment completion status across all AI systems", type: "ISO42005_ASSESSMENT", sections: ["assessment_coverage", "impact_dimensions", "misuse_scenarios"], createdBy: risk.id },
      ],
    }).catch(() => {});
    counts.reports = 5;

    return NextResponse.json({
      success: true,
      message: "Full sample data seeded successfully across all modules",
      counts,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message, counts }, { status: 500 });
  }
}
