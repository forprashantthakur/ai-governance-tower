import { NextRequest, NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { addDays } from "date-fns";

const SECRET = "gTower2026Reset!";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const email = req.nextUrl.searchParams.get("email");

  if (secret !== SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!email) return NextResponse.json({ error: "email param required" }, { status: 400 });

  // ── Find user + org ─────────────────────────────────────────────────────────
  const user = await withRetry(() =>
    prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          where: { isActive: true },
          include: { organization: true },
          orderBy: { joinedAt: "asc" },
        },
      },
    })
  );

  if (!user) return NextResponse.json({ error: `User not found: ${email}` }, { status: 404 });

  const membership = user.memberships[0];
  if (!membership) return NextResponse.json({ error: "User has no active org membership" }, { status: 400 });

  const orgId = membership.organizationId;
  const userId = user.id;
  const now = new Date();

  const results: Record<string, number> = {};

  // ── 1. DATA ASSETS ───────────────────────────────────────────────────────────
  const dataAssets = await Promise.all([
    prisma.dataAsset.upsert({
      where: { id: `da-kyc-${orgId.slice(0, 8)}` },
      update: {},
      create: {
        id: `da-kyc-${orgId.slice(0, 8)}`,
        organizationId: orgId,
        name: "KYC Document Store",
        description: "Aadhaar, PAN, passport scans and identity verification documents",
        source: "KYC Onboarding Portal",
        dataType: "unstructured",
        sensitivity: "RESTRICTED",
        hasPii: true,
        piiFields: ["aadhaar_number", "pan_number", "passport_number", "photo"],
        retentionDays: 1825,
        location: "s3://kyc-documents/verified/",
        format: "PDF/JPEG",
        owner: "Compliance Team",
        tags: ["kyc", "dpdp", "restricted", "aadhaar"],
      },
    }),
    prisma.dataAsset.upsert({
      where: { id: `da-cust-${orgId.slice(0, 8)}` },
      update: {},
      create: {
        id: `da-cust-${orgId.slice(0, 8)}`,
        organizationId: orgId,
        name: "Customer PII Database",
        description: "Customer profiles: name, email, phone, address, income bracket",
        source: "CRM System (Salesforce)",
        dataType: "structured",
        sensitivity: "PII",
        hasPii: true,
        piiFields: ["name", "email", "phone", "address", "aadhaar_hash", "pan_hash"],
        retentionDays: 365,
        location: "postgres://crm-db/customers",
        format: "PostgreSQL",
        owner: "Customer Success Team",
        tags: ["crm", "dpdp", "pii"],
      },
    }),
    prisma.dataAsset.upsert({
      where: { id: `da-txn-${orgId.slice(0, 8)}` },
      update: {},
      create: {
        id: `da-txn-${orgId.slice(0, 8)}`,
        organizationId: orgId,
        name: "Transaction Logs",
        description: "Financial transaction records for AML and fraud detection",
        source: "Core Banking System",
        dataType: "structured",
        sensitivity: "RESTRICTED",
        hasPii: true,
        piiFields: ["account_number", "ifsc_code", "pan_hash"],
        retentionDays: 2555,
        location: "postgres://banking-db/transactions",
        format: "PostgreSQL",
        owner: "Finance Operations",
        tags: ["financial", "rbi", "aml", "audit"],
      },
    }),
    prisma.dataAsset.upsert({
      where: { id: `da-claims-${orgId.slice(0, 8)}` },
      update: {},
      create: {
        id: `da-claims-${orgId.slice(0, 8)}`,
        organizationId: orgId,
        name: "Claims History Database",
        description: "Insurance claims with medical info, policy details, loss assessments",
        source: "Claims Management System",
        dataType: "structured",
        sensitivity: "CONFIDENTIAL",
        hasPii: true,
        piiFields: ["policy_number", "medical_info", "beneficiary_name"],
        retentionDays: 3650,
        location: "oracle://claims-db/claims",
        format: "Oracle DB",
        owner: "Claims Processing Team",
        tags: ["insurance", "irdai", "confidential"],
      },
    }),
    prisma.dataAsset.upsert({
      where: { id: `da-emp-${orgId.slice(0, 8)}` },
      update: {},
      create: {
        id: `da-emp-${orgId.slice(0, 8)}`,
        organizationId: orgId,
        name: "Employee Records",
        description: "HR records: salary, performance ratings, personal details",
        source: "HRMS (SAP SuccessFactors)",
        dataType: "structured",
        sensitivity: "RESTRICTED",
        hasPii: true,
        piiFields: ["employee_id", "salary", "aadhaar_number", "bank_account"],
        retentionDays: 2555,
        location: "s3://hr-data/employees/",
        format: "CSV/Parquet",
        owner: "HR Department",
        tags: ["hr", "restricted", "internal"],
      },
    }),
    prisma.dataAsset.upsert({
      where: { id: `da-market-${orgId.slice(0, 8)}` },
      update: {},
      create: {
        id: `da-market-${orgId.slice(0, 8)}`,
        organizationId: orgId,
        name: "Market Data Feed",
        description: "Real-time market prices, indices, and financial instrument data",
        source: "Bloomberg / NSE Data Feed",
        dataType: "structured",
        sensitivity: "PUBLIC",
        hasPii: false,
        piiFields: [],
        retentionDays: 365,
        location: "kafka://market-stream/prices",
        format: "JSON/Avro",
        owner: "Quant Research Team",
        tags: ["market", "sebi", "public"],
      },
    }),
  ]);
  results.dataAssets = dataAssets.length;

  // ── 2. AI MODELS ─────────────────────────────────────────────────────────────
  const modelDefs = [
    {
      id: `m-credit-${orgId.slice(0, 8)}`,
      name: "Credit Risk Scorer",
      version: "3.2.1",
      description: "XGBoost model scoring loan applicant credit risk using bureau data and transaction history",
      type: "ML" as const,
      status: "ACTIVE" as const,
      department: "Risk Management",
      vendor: "Internal",
      framework: "XGBoost / MLflow",
      tags: ["credit", "financial", "rbi", "critical"],
      isPiiProcessing: true, isFinancial: true, isCritical: true, humanOversight: true, explainability: 68,
      risk: { level: "HIGH" as const, score: 78, dataSens: 85, complexity: 72, explainability: 68, oversight: 70, regulatory: 88 },
    },
    {
      id: `m-fraud-${orgId.slice(0, 8)}`,
      name: "Fraud Detection Engine",
      version: "5.1.0",
      description: "Real-time TensorFlow model detecting fraudulent transactions using graph neural networks",
      type: "ML" as const,
      status: "ACTIVE" as const,
      department: "Risk Management",
      vendor: "Internal",
      framework: "TensorFlow / Vertex AI",
      tags: ["fraud", "real-time", "financial", "critical"],
      isPiiProcessing: true, isFinancial: true, isCritical: true, humanOversight: false, explainability: 45,
      risk: { level: "CRITICAL" as const, score: 85, dataSens: 90, complexity: 88, explainability: 45, oversight: 30, regulatory: 95 },
    },
    {
      id: `m-kyc-${orgId.slice(0, 8)}`,
      name: "KYC Identity Verifier",
      version: "2.0.4",
      description: "Computer vision model verifying Aadhaar, PAN, passport authenticity and face matching",
      type: "COMPUTER_VISION" as const,
      status: "ACTIVE" as const,
      department: "Compliance",
      vendor: "Internal",
      framework: "PyTorch / OpenCV",
      tags: ["kyc", "identity", "dpdp", "aadhaar"],
      isPiiProcessing: true, isFinancial: false, isCritical: true, humanOversight: true, explainability: 38,
      risk: { level: "HIGH" as const, score: 82, dataSens: 95, complexity: 75, explainability: 38, oversight: 75, regulatory: 90 },
    },
    {
      id: `m-aml-${orgId.slice(0, 8)}`,
      name: "AML Transaction Monitor",
      version: "4.3.2",
      description: "Graph neural network monitoring transaction patterns for anti-money laundering",
      type: "ML" as const,
      status: "ACTIVE" as const,
      department: "Compliance",
      vendor: "NICE Actimize (customised)",
      framework: "Graph Neural Network / PyG",
      tags: ["aml", "compliance", "rbi", "sebi"],
      isPiiProcessing: true, isFinancial: true, isCritical: true, humanOversight: true, explainability: 55,
      risk: { level: "HIGH" as const, score: 79, dataSens: 80, complexity: 85, explainability: 55, oversight: 80, regulatory: 92 },
    },
    {
      id: `m-loan-${orgId.slice(0, 8)}`,
      name: "Loan Underwriting AI",
      version: "1.5.0",
      description: "Ensemble model automating loan approval decisions using 200+ features",
      type: "ML" as const,
      status: "UNDER_REVIEW" as const,
      department: "Retail Lending",
      vendor: "Internal",
      framework: "Scikit-learn / SHAP",
      tags: ["lending", "underwriting", "rbi", "critical"],
      isPiiProcessing: true, isFinancial: true, isCritical: true, humanOversight: false, explainability: 30,
      risk: { level: "CRITICAL" as const, score: 88, dataSens: 88, complexity: 82, explainability: 30, oversight: 25, regulatory: 95 },
      requiresReassessment: true,
      reassessmentReason: "Explainability score below RBI threshold. Human oversight missing for high-value loans.",
    },
    {
      id: `m-market-${orgId.slice(0, 8)}`,
      name: "Market Risk Forecaster",
      version: "2.8.0",
      description: "LSTM model forecasting market volatility and VaR for trading desk risk management",
      type: "ML" as const,
      status: "ACTIVE" as const,
      department: "Treasury & Markets",
      vendor: "Internal",
      framework: "Keras / LSTM",
      tags: ["market-risk", "sebi", "trading", "var"],
      isPiiProcessing: false, isFinancial: true, isCritical: true, humanOversight: true, explainability: 62,
      risk: { level: "MEDIUM" as const, score: 65, dataSens: 40, complexity: 78, explainability: 62, oversight: 85, regulatory: 70 },
    },
    {
      id: `m-claims-${orgId.slice(0, 8)}`,
      name: "Claims Processing AI",
      version: "3.1.0",
      description: "NLP model auto-processing insurance claims, detecting duplicates and estimating payouts",
      type: "NLP" as const,
      status: "ACTIVE" as const,
      department: "Insurance Operations",
      vendor: "Internal",
      framework: "HuggingFace / BERT",
      tags: ["insurance", "irdai", "nlp", "claims"],
      isPiiProcessing: true, isFinancial: true, isCritical: false, humanOversight: true, explainability: 55,
      risk: { level: "MEDIUM" as const, score: 60, dataSens: 70, complexity: 55, explainability: 55, oversight: 80, regulatory: 65 },
    },
    {
      id: `m-churn-${orgId.slice(0, 8)}`,
      name: "Customer Churn Predictor",
      version: "1.9.2",
      description: "Logistic regression + gradient boosting ensemble predicting 30-day churn probability",
      type: "ML" as const,
      status: "ACTIVE" as const,
      department: "Customer Insights",
      vendor: "Internal",
      framework: "Scikit-learn / LightGBM",
      tags: ["customer", "retention", "marketing"],
      isPiiProcessing: true, isFinancial: false, isCritical: false, humanOversight: true, explainability: 75,
      risk: { level: "LOW" as const, score: 35, dataSens: 50, complexity: 40, explainability: 75, oversight: 90, regulatory: 30 },
    },
    {
      id: `m-nlp-${orgId.slice(0, 8)}`,
      name: "NLP Document Classifier",
      version: "2.2.0",
      description: "BERT-based classifier categorising legal and compliance documents for regulatory reporting",
      type: "NLP" as const,
      status: "ACTIVE" as const,
      department: "Legal & Compliance",
      vendor: "Internal",
      framework: "HuggingFace Transformers",
      tags: ["nlp", "compliance", "legal", "document"],
      isPiiProcessing: false, isFinancial: false, isCritical: false, humanOversight: true, explainability: 70,
      risk: { level: "LOW" as const, score: 28, dataSens: 30, complexity: 35, explainability: 70, oversight: 95, regulatory: 25 },
    },
    {
      id: `m-sentiment-${orgId.slice(0, 8)}`,
      name: "Employee Sentiment Analyzer",
      version: "1.3.0",
      description: "LLM-powered sentiment analysis of employee survey responses and HR feedback channels",
      type: "LLM" as const,
      status: "ACTIVE" as const,
      department: "Human Resources",
      vendor: "OpenAI",
      framework: "GPT-4 / LangChain",
      tags: ["hr", "sentiment", "employee", "pii"],
      isPiiProcessing: true, isFinancial: false, isCritical: false, humanOversight: true, explainability: 60,
      risk: { level: "MEDIUM" as const, score: 58, dataSens: 75, complexity: 50, explainability: 60, oversight: 85, regulatory: 45 },
    },
  ];

  const createdModels: { id: string; name: string }[] = [];
  for (const m of modelDefs) {
    const model = await prisma.aIModel.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        organizationId: orgId,
        name: m.name,
        version: m.version,
        description: m.description,
        type: m.type,
        status: m.status,
        ownerId: userId,
        department: m.department,
        vendor: m.vendor,
        framework: m.framework,
        tags: m.tags,
        isPiiProcessing: m.isPiiProcessing,
        isFinancial: m.isFinancial,
        isCritical: m.isCritical,
        humanOversight: m.humanOversight,
        explainability: m.explainability,
        requiresReassessment: (m as any).requiresReassessment ?? false,
        reassessmentReason: (m as any).reassessmentReason ?? null,
      },
    });
    createdModels.push({ id: model.id, name: model.name });

    // Risk assessment for each model
    await prisma.riskAssessment.upsert({
      where: { id: `ra-${m.id}` },
      update: {},
      create: {
        id: `ra-${m.id}`,
        modelId: model.id,
        assessorId: userId,
        riskLevel: m.risk.level,
        overallScore: m.risk.score,
        dataSensitivityScore: m.risk.dataSens,
        modelComplexityScore: m.risk.complexity,
        explainabilityScore: m.risk.explainability,
        humanOversightScore: m.risk.oversight,
        regulatoryExposureScore: m.risk.regulatory,
        findings: `Automated risk assessment completed. Key findings: data sensitivity ${m.risk.dataSens}/100, regulatory exposure ${m.risk.regulatory}/100.`,
        mitigations: m.risk.level === "CRITICAL" ? "Immediate human oversight required. Schedule explainability audit. Engage compliance team." : "Standard monitoring in place.",
        reviewedAt: addDays(now, -30),
        nextReviewDate: addDays(now, 60),
        severity: m.risk.level === "CRITICAL" ? 5 : m.risk.level === "HIGH" ? 4 : m.risk.level === "MEDIUM" ? 3 : 2,
        likelihood: m.risk.level === "CRITICAL" ? 4 : m.risk.level === "HIGH" ? 3 : 2,
      },
    });
  }
  results.aiModels = createdModels.length;

  // ── 3. COMPLIANCE CONTROLS ────────────────────────────────────────────────────
  const complianceTemplates = [
    { framework: "DPDP", controlId: "DPDP-6.1", name: "Consent Management", status: "PASS" as const, evidence: "Consent records captured for all PII-processing models" },
    { framework: "DPDP", controlId: "DPDP-7.2", name: "Data Minimisation", status: "PARTIAL" as const, evidence: "Partial — 3 models collecting more fields than required" },
    { framework: "DPDP", controlId: "DPDP-8.1", name: "Data Subject Rights", status: "PARTIAL" as const, evidence: "Erasure workflow in development; access requests handled manually" },
    { framework: "DPDP", controlId: "DPDP-9.1", name: "Data Localisation", status: "PASS" as const, evidence: "All data stored on AWS Mumbai (ap-south-1)" },
    { framework: "ISO42001", controlId: "ISO42001-5.2", name: "AI Policy Statement", status: "PASS" as const, evidence: "AI Governance Policy v2.1 approved by board" },
    { framework: "ISO42001", controlId: "ISO42001-6.1", name: "AI Risk Assessment Process", status: "PASS" as const, evidence: "Quarterly risk assessments completed for all critical models" },
    { framework: "ISO42001", controlId: "ISO42001-7.1", name: "Human Oversight of AI", status: "FAIL" as const, evidence: "Loan Underwriting AI and Fraud Detection missing human review gates" },
    { framework: "ISO42001", controlId: "ISO42001-8.2", name: "Bias Testing & Fairness", status: "FAIL" as const, evidence: "KYC model not tested for demographic bias; no fairness metrics tracked" },
    { framework: "ISO42001", controlId: "ISO42001-9.1", name: "AI Performance Monitoring", status: "PASS" as const, evidence: "Model drift monitoring active via MLflow; weekly performance reports" },
    { framework: "ISO42001", controlId: "ISO42001-10.1", name: "Incident Response for AI", status: "FAIL" as const, evidence: "No AI-specific incident response playbook exists" },
    { framework: "EU_AI_ACT", controlId: "EUAIA-9.1", name: "High-Risk AI Documentation", status: "PARTIAL" as const, evidence: "Technical documentation incomplete for 4 high-risk models" },
    { framework: "EU_AI_ACT", controlId: "EUAIA-13.1", name: "Transparency & Explainability", status: "PARTIAL" as const, evidence: "SHAP explanations available for credit model only" },
    { framework: "RBI", controlId: "RBI-ML-3.1", name: "Model Validation & Testing", status: "PASS" as const, evidence: "Annual model validation by independent team completed" },
    { framework: "RBI", controlId: "RBI-ML-4.2", name: "Credit Decision Explainability", status: "FAIL" as const, evidence: "Loan Underwriting AI explainability score 30/100 — below RBI 60+ threshold" },
    { framework: "RBI", controlId: "RBI-ML-5.1", name: "Algorithmic Accountability", status: "PASS" as const, evidence: "Model registry maintained; ownership assigned for all models" },
    { framework: "RBI", controlId: "RBI-ML-6.1", name: "Consumer Protection Safeguards", status: "PARTIAL" as const, evidence: "Appeal mechanism for credit rejections partially implemented" },
  ];

  let controlCount = 0;
  // Apply controls to the first 3 critical models
  for (const modelRef of createdModels.slice(0, 3)) {
    for (const ctrl of complianceTemplates) {
      try {
        await prisma.complianceControl.upsert({
          where: { modelId_framework_controlId: { modelId: modelRef.id, framework: ctrl.framework, controlId: ctrl.controlId } },
          update: {},
          create: {
            modelId: modelRef.id,
            framework: ctrl.framework,
            controlId: ctrl.controlId,
            controlName: ctrl.name,
            description: `${ctrl.name} compliance control under ${ctrl.framework}`,
            status: ctrl.status,
            evidence: ctrl.evidence,
            reviewedAt: addDays(now, -14),
            reviewedBy: userId,
          },
        });
        controlCount++;
      } catch { /* skip duplicates */ }
    }
  }
  results.complianceControls = controlCount;

  // ── 4. CONSENT RECORDS ────────────────────────────────────────────────────────
  const consentData = [
    { assetIdx: 0, subjectId: "customer-001", type: "DATA_PROCESSING" as const, status: "GRANTED" as const, expires: addDays(now, 365) },
    { assetIdx: 0, subjectId: "customer-002", type: "AI_DECISION" as const, status: "GRANTED" as const, expires: addDays(now, 365) },
    { assetIdx: 1, subjectId: "customer-003", type: "DATA_PROCESSING" as const, status: "GRANTED" as const, expires: addDays(now, 180) },
    { assetIdx: 1, subjectId: "customer-004", type: "DATA_SHARING" as const, status: "REVOKED" as const, expires: null },
    { assetIdx: 2, subjectId: "customer-005", type: "DATA_PROCESSING" as const, status: "GRANTED" as const, expires: addDays(now, 300) },
    { assetIdx: 3, subjectId: "customer-006", type: "AI_DECISION" as const, status: "GRANTED" as const, expires: addDays(now, 730) },
    { assetIdx: 3, subjectId: "customer-007", type: "DATA_PROCESSING" as const, status: "GRANTED" as const, expires: addDays(now, 730) },
    { assetIdx: 4, subjectId: "employee-001", type: "DATA_PROCESSING" as const, status: "GRANTED" as const, expires: addDays(now, 365) },
  ];

  let consentCount = 0;
  for (const c of consentData) {
    const asset = dataAssets[c.assetIdx];
    if (!asset) continue;
    try {
      await prisma.consentRecord.create({
        data: {
          organizationId: orgId,
          dataAssetId: asset.id,
          subjectId: c.subjectId,
          consentType: c.type,
          status: c.status,
          grantedAt: c.status === "GRANTED" ? addDays(now, -30) : addDays(now, -90),
          revokedAt: c.status === "REVOKED" ? addDays(now, -5) : null,
          expiresAt: c.expires,
          ipAddress: "203.192.168.42",
          metadata: { source: "web_portal", version: "2.1", dpdp_compliant: true },
        },
      });
      consentCount++;
    } catch { /* skip if already exists */ }
  }
  results.consentRecords = consentCount;

  // ── 5. AI AGENTS ─────────────────────────────────────────────────────────────
  const agentDefs = [
    {
      id: `ag-aml-${orgId.slice(0, 8)}`,
      name: "AML Alert Analyst",
      description: "Autonomous agent reviewing AML transaction alerts, assessing risk and recommending PASS/BLOCK/ESCALATE",
      modelIdx: 3, // AML model
      status: "RUNNING" as const,
      tools: ["transaction_lookup", "sanctions_check", "risk_scoring", "alert_create"],
      systemPrompt: "You are an AML compliance analyst. Review flagged transactions and recommend action based on FATF guidelines and RBI circular RBI/2023-24/90.",
    },
    {
      id: `ag-kyc-${orgId.slice(0, 8)}`,
      name: "KYC Verification Agent",
      description: "Verifies identity documents, cross-references against UIDAI/NSDL, escalates to human if confidence < 85%",
      modelIdx: 2, // KYC model
      status: "RUNNING" as const,
      tools: ["uidai_verify", "nsdl_pan_verify", "face_match", "document_ocr", "human_escalate"],
      systemPrompt: "You are a KYC verification agent. Verify customer identity documents per PMLA requirements. Escalate any ambiguous cases to human reviewers.",
    },
    {
      id: `ag-risk-${orgId.slice(0, 8)}`,
      name: "RiskAnalyzerAgent",
      description: "On-demand agent generating automated risk assessment reports for new AI model deployments",
      modelIdx: 0, // Credit model
      status: "IDLE" as const,
      tools: ["model_registry_read", "risk_score", "compliance_check", "report_generate"],
      systemPrompt: "You are an AI risk analyst. Generate comprehensive risk assessments following ISO 42001 and RBI guidelines.",
    },
    {
      id: `ag-compliance-${orgId.slice(0, 8)}`,
      name: "ComplianceBot",
      description: "Monitors regulatory feeds (RBI, SEBI, IRDAI, MeitY) for DPDP/AI governance updates and generates alerts",
      modelIdx: 8, // NLP classifier
      status: "IDLE" as const,
      tools: ["regulatory_feed_read", "alert_create", "policy_compare", "email_notify"],
      systemPrompt: "You are a regulatory compliance monitor. Track changes in RBI, SEBI, IRDAI, and MeitY guidelines affecting AI governance. Alert stakeholders of material changes within 24 hours.",
    },
  ];

  for (const ag of agentDefs) {
    const modelId = createdModels[ag.modelIdx]?.id ?? createdModels[0].id;
    await prisma.agent.upsert({
      where: { id: ag.id },
      update: {},
      create: {
        id: ag.id,
        organizationId: orgId,
        name: ag.name,
        description: ag.description,
        modelId,
        status: ag.status,
        tools: ag.tools,
        systemPrompt: ag.systemPrompt,
        version: "1.0.0",
        maxTokens: 4096,
        temperature: 0.3,
      },
    });
  }
  results.agents = agentDefs.length;

  // ── 6. ALERTS ────────────────────────────────────────────────────────────────
  const alertDefs = [
    { title: "CRITICAL: Loan Underwriting AI — Explainability Below RBI Threshold", message: "Explainability score 30/100 is below RBI-mandated 60/100 threshold. Model must be suspended or remediated within 30 days. Immediate CISO and compliance head notification required.", severity: "CRITICAL" as const, modelIdx: 4 },
    { title: "CRITICAL: Fraud Detection Engine — No Human Oversight Gate", message: "Fraud Detection Engine is blocking transactions autonomously without human review. RBI circular mandates human-in-the-loop for decisions affecting >₹50,000 transactions.", severity: "CRITICAL" as const, modelIdx: 1 },
    { title: "HIGH: KYC Model — Bias Testing Not Completed", message: "KYC Identity Verifier has not undergone demographic bias testing. ISO 42001:8.2 compliance control is FAILING. Bias audit must be completed before next quarter.", severity: "ERROR" as const, modelIdx: 2 },
    { title: "HIGH: DPDP Data Subject Rights — Erasure Workflow Incomplete", message: "3 data subject erasure requests pending for >72 hours. DPDP Act mandates completion within 30 days. Manual intervention required.", severity: "ERROR" as const, modelIdx: null },
    { title: "WARNING: AML Monitor — Anomalous Alert Volume (+340% this week)", message: "AML Transaction Monitor generated 847 alerts this week vs 193 weekly average. Possible model drift or data quality issue. Engineering review recommended.", severity: "WARNING" as const, modelIdx: 3 },
  ];

  for (const al of alertDefs) {
    const modelId = al.modelIdx !== null ? (createdModels[al.modelIdx]?.id ?? null) : null;
    await prisma.alert.create({
      data: {
        organizationId: orgId,
        title: al.title,
        message: al.message,
        severity: al.severity,
        modelId,
        isRead: false,
        metadata: { source: "governance_engine", auto_generated: true },
      },
    });
  }
  results.alerts = alertDefs.length;

  // ── 7. AI PROJECTS ───────────────────────────────────────────────────────────
  const projectDefs = [
    {
      name: "DPDP Act Compliance Programme",
      description: "Enterprise-wide programme to achieve full DPDP Act 2023 compliance across all AI systems and data pipelines by Q3 2026",
      status: "ACTIVE" as const,
      currentPhase: "TESTING_VALIDATION" as const,
      healthScore: 72.0, healthStatus: "AT_RISK" as const,
      tags: ["dpdp", "compliance", "regulatory", "priority-1"],
      budget: 4500000,
      targetDaysFromNow: 120,
      tasks: [
        { title: "Map all PII data flows across AI systems", phase: "DATA_DISCOVERY" as const, priority: "CRITICAL" as const, status: "DONE" as const, estimatedHrs: 40 },
        { title: "Implement consent management framework", phase: "MODEL_DEVELOPMENT" as const, priority: "CRITICAL" as const, status: "DONE" as const, estimatedHrs: 80 },
        { title: "Build data subject rights portal (erasure/access)", phase: "MODEL_DEVELOPMENT" as const, priority: "HIGH" as const, status: "IN_PROGRESS" as const, estimatedHrs: 120 },
        { title: "DPDP compliance audit — external law firm", phase: "TESTING_VALIDATION" as const, priority: "HIGH" as const, status: "TODO" as const, estimatedHrs: 40 },
        { title: "Staff training on DPDP obligations", phase: "DEPLOYMENT" as const, priority: "MEDIUM" as const, status: "TODO" as const, estimatedHrs: 20 },
      ],
    },
    {
      name: "ISO 42001 AI Management System Certification",
      description: "Implement ISO 42001:2023 AI Management System and achieve certification through BDO India audit",
      status: "ACTIVE" as const,
      currentPhase: "MODEL_DEVELOPMENT" as const,
      healthScore: 65.0, healthStatus: "AT_RISK" as const,
      tags: ["iso42001", "certification", "governance"],
      budget: 2800000,
      targetDaysFromNow: 180,
      tasks: [
        { title: "Gap analysis against ISO 42001 controls", phase: "BUSINESS_CASE" as const, priority: "CRITICAL" as const, status: "DONE" as const, estimatedHrs: 60 },
        { title: "Develop AI governance policy documents", phase: "MODEL_DEVELOPMENT" as const, priority: "CRITICAL" as const, status: "DONE" as const, estimatedHrs: 80 },
        { title: "Implement bias testing framework for CV models", phase: "MODEL_DEVELOPMENT" as const, priority: "HIGH" as const, status: "IN_PROGRESS" as const, estimatedHrs: 100 },
        { title: "Set up AI incident response playbook", phase: "MODEL_DEVELOPMENT" as const, priority: "HIGH" as const, status: "TODO" as const, estimatedHrs: 40 },
        { title: "Pre-certification audit by BDO India", phase: "TESTING_VALIDATION" as const, priority: "CRITICAL" as const, status: "TODO" as const, estimatedHrs: 60 },
      ],
    },
    {
      name: "Fraud Detection Engine v6 — Explainability Upgrade",
      description: "Add SHAP-based post-hoc explanations to Fraud Detection Engine and implement human review queue for high-value transaction blocks",
      status: "ACTIVE" as const,
      currentPhase: "MODEL_DEVELOPMENT" as const,
      healthScore: 88.0, healthStatus: "HEALTHY" as const,
      tags: ["fraud", "explainability", "rbi-compliance"],
      budget: 1200000,
      targetDaysFromNow: 60,
      tasks: [
        { title: "Integrate SHAP explainability into FDE scoring pipeline", phase: "MODEL_DEVELOPMENT" as const, priority: "CRITICAL" as const, status: "IN_PROGRESS" as const, estimatedHrs: 80 },
        { title: "Build human review queue UI for ₹50K+ blocks", phase: "MODEL_DEVELOPMENT" as const, priority: "CRITICAL" as const, status: "TODO" as const, estimatedHrs: 60 },
        { title: "A/B test FDE v6 on 10% traffic slice", phase: "TESTING_VALIDATION" as const, priority: "HIGH" as const, status: "TODO" as const, estimatedHrs: 40 },
        { title: "RBI compliance sign-off and documentation", phase: "DEPLOYMENT" as const, priority: "HIGH" as const, status: "TODO" as const, estimatedHrs: 20 },
      ],
    },
    {
      name: "Credit Risk Model Refresh — Bureau Integration",
      description: "Refresh Credit Risk Scorer with CIBIL v4 bureau integration and add 45 new alternative data features",
      status: "ACTIVE" as const,
      currentPhase: "DATA_DISCOVERY" as const,
      healthScore: 91.0, healthStatus: "HEALTHY" as const,
      tags: ["credit", "bureau", "model-refresh", "rbi"],
      budget: 900000,
      targetDaysFromNow: 90,
      tasks: [
        { title: "Data agreement with CIBIL v4 API", phase: "DATA_DISCOVERY" as const, priority: "CRITICAL" as const, status: "DONE" as const, estimatedHrs: 20 },
        { title: "Feature engineering — 45 alternative data signals", phase: "DATA_DISCOVERY" as const, priority: "HIGH" as const, status: "IN_PROGRESS" as const, estimatedHrs: 120 },
        { title: "Model training and champion/challenger evaluation", phase: "MODEL_DEVELOPMENT" as const, priority: "CRITICAL" as const, status: "TODO" as const, estimatedHrs: 80 },
        { title: "Fairness and bias audit (gender/age/region)", phase: "TESTING_VALIDATION" as const, priority: "HIGH" as const, status: "TODO" as const, estimatedHrs: 40 },
      ],
    },
    {
      name: "AML System Modernisation — Graph AI Upgrade",
      description: "Migrate AML Transaction Monitor to graph neural network architecture with real-time SWIFT message analysis",
      status: "ACTIVE" as const,
      currentPhase: "DATA_DISCOVERY" as const,
      healthScore: 78.0, healthStatus: "HEALTHY" as const,
      tags: ["aml", "graph-ai", "rbi", "fatf"],
      budget: 3200000,
      targetDaysFromNow: 270,
      tasks: [
        { title: "Transaction graph data modelling (neo4j schema)", phase: "DATA_DISCOVERY" as const, priority: "CRITICAL" as const, status: "IN_PROGRESS" as const, estimatedHrs: 60 },
        { title: "Graph neural network model development (PyG)", phase: "MODEL_DEVELOPMENT" as const, priority: "CRITICAL" as const, status: "TODO" as const, estimatedHrs: 200 },
        { title: "FATF compliance validation and typology testing", phase: "TESTING_VALIDATION" as const, priority: "HIGH" as const, status: "TODO" as const, estimatedHrs: 80 },
      ],
    },
    {
      name: "KYC Bias Audit & Remediation",
      description: "Conduct demographic bias audit on KYC Identity Verifier and remediate disparate impact across age, gender and regional cohorts",
      status: "ACTIVE" as const,
      currentPhase: "BUSINESS_CASE" as const,
      healthScore: 55.0, healthStatus: "CRITICAL" as const,
      tags: ["kyc", "bias", "fairness", "iso42001", "urgent"],
      budget: 600000,
      targetDaysFromNow: 45,
      tasks: [
        { title: "Collect stratified test dataset across demographics", phase: "DATA_DISCOVERY" as const, priority: "CRITICAL" as const, status: "TODO" as const, estimatedHrs: 40 },
        { title: "Run disparate impact analysis (Aequitas / Fairlearn)", phase: "TESTING_VALIDATION" as const, priority: "CRITICAL" as const, status: "TODO" as const, estimatedHrs: 60 },
        { title: "Model retraining with reweighted training data", phase: "MODEL_DEVELOPMENT" as const, priority: "HIGH" as const, status: "TODO" as const, estimatedHrs: 100 },
        { title: "ISO 42001:8.2 compliance sign-off", phase: "DEPLOYMENT" as const, priority: "HIGH" as const, status: "TODO" as const, estimatedHrs: 20 },
      ],
    },
    {
      name: "AI Governance Dashboard — Internal Rollout",
      description: "Deploy AI Governance Control Tower to all 8 business units; train DPO, CISO and model owners on platform usage",
      status: "ACTIVE" as const,
      currentPhase: "DEPLOYMENT" as const,
      healthScore: 94.0, healthStatus: "HEALTHY" as const,
      tags: ["governance", "rollout", "training", "internal"],
      budget: 500000,
      targetDaysFromNow: 30,
      tasks: [
        { title: "Platform configuration for all 8 BUs", phase: "DEPLOYMENT" as const, priority: "HIGH" as const, status: "IN_PROGRESS" as const, estimatedHrs: 40 },
        { title: "Training sessions — DPO and CISO cohort (12 people)", phase: "DEPLOYMENT" as const, priority: "HIGH" as const, status: "TODO" as const, estimatedHrs: 16 },
        { title: "Onboard 47 model owners onto registry", phase: "DEPLOYMENT" as const, priority: "MEDIUM" as const, status: "TODO" as const, estimatedHrs: 20 },
        { title: "Go-live monitoring and hypercare support", phase: "MONITORING" as const, priority: "MEDIUM" as const, status: "TODO" as const, estimatedHrs: 40 },
      ],
    },
    {
      name: "Market Risk AI — SEBI Algorithmic Trading Compliance",
      description: "Ensure Market Risk Forecaster meets SEBI circular SEBI/HO/MRD/DP/CIR/2021/556 requirements for algorithmic and AI-assisted trading",
      status: "DRAFT" as const,
      currentPhase: "BUSINESS_CASE" as const,
      healthScore: 82.0, healthStatus: "HEALTHY" as const,
      tags: ["market-risk", "sebi", "algorithmic-trading", "compliance"],
      budget: 750000,
      targetDaysFromNow: 150,
      tasks: [
        { title: "SEBI circular gap analysis for Market Risk AI", phase: "BUSINESS_CASE" as const, priority: "CRITICAL" as const, status: "TODO" as const, estimatedHrs: 30 },
        { title: "Implement kill-switch and circuit-breaker mechanisms", phase: "MODEL_DEVELOPMENT" as const, priority: "CRITICAL" as const, status: "TODO" as const, estimatedHrs: 60 },
        { title: "SEBI empanelled auditor review", phase: "TESTING_VALIDATION" as const, priority: "HIGH" as const, status: "TODO" as const, estimatedHrs: 40 },
      ],
    },
  ];

  let projectCount = 0;
  for (const pd of projectDefs) {
    const targetDate = addDays(now, pd.targetDaysFromNow);
    const startDate = addDays(now, -30);

    const project = await prisma.project.create({
      data: {
        organizationId: orgId,
        ownerId: userId,
        name: pd.name,
        description: pd.description,
        status: pd.status,
        currentPhase: pd.currentPhase,
        healthScore: pd.healthScore,
        healthStatus: pd.healthStatus,
        tags: pd.tags,
        budget: pd.budget,
        startDate,
        targetDate,
      },
    });

    // Phase records
    const phases = ["BUSINESS_CASE", "DATA_DISCOVERY", "MODEL_DEVELOPMENT", "TESTING_VALIDATION", "DEPLOYMENT", "MONITORING"];
    await prisma.projectPhaseRecord.createMany({
      data: phases.map((phase) => ({
        projectId: project.id,
        phase: phase as never,
        status: "BACKLOG" as never,
      })),
    });

    // Tasks
    await prisma.projectTask.createMany({
      data: pd.tasks.map((t, i) => ({
        projectId: project.id,
        phase: t.phase,
        title: t.title,
        priority: t.priority,
        status: t.status,
        estimatedHrs: t.estimatedHrs,
        sortOrder: i,
        assigneeId: userId,
      })),
    });

    projectCount++;
  }
  results.projects = projectCount;

  // ── 8. AUDIT LOGS ────────────────────────────────────────────────────────────
  const auditActions = [
    { action: "CREATE", resource: "AIModel", message: "Credit Risk Scorer registered in model registry" },
    { action: "UPDATE", resource: "AIModel", message: "Loan Underwriting AI flagged for reassessment — explainability below threshold" },
    { action: "CREATE", resource: "RiskAssessment", message: "Risk assessment completed for Fraud Detection Engine (CRITICAL)" },
    { action: "CREATE", resource: "ComplianceControl", message: "ISO 42001:8.2 control marked FAIL — bias testing not completed" },
    { action: "LOGIN", resource: "User", message: "Admin login from IP 203.192.168.42" },
    { action: "CREATE", resource: "Alert", message: "CRITICAL alert generated — Loan Underwriting AI RBI non-compliance" },
    { action: "UPDATE", resource: "ConsentRecord", message: "customer-004 revoked DATA_SHARING consent — erasure workflow triggered" },
    { action: "CREATE", resource: "Agent", message: "AML Alert Analyst agent started — monitoring 2,400 transaction alerts" },
  ];

  for (const al of auditActions) {
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: al.action as never,
        resource: al.resource,
        resourceId: userId,
        metadata: { message: al.message, source: "seed" },
        ipAddress: "203.192.168.42",
      },
    });
  }
  results.auditLogs = auditActions.length;

  return NextResponse.json({
    ok: true,
    email,
    org: membership.organization.name,
    orgSlug: membership.organization.slug,
    seeded: results,
    totalRecords: Object.values(results).reduce((a, b) => a + b, 0),
  });
}
