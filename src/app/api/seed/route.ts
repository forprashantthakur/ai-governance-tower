import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// One-time seed endpoint — protected by a secret key
// Call: GET /api/seed?secret=SEED_SECRET_2024
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== "SEED_SECRET_2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if already seeded
    const existing = await prisma.user.count();
    if (existing > 0) {
      return NextResponse.json({ message: "Already seeded", users: existing });
    }

    // ── Users ──────────────────────────────────────────────────────────────────
    const adminHash = await bcrypt.hash("Admin@123456", 12);
    const riskHash  = await bcrypt.hash("Risk@123456",  12);
    const auditorHash = await bcrypt.hash("Audit@123456", 12);

    const admin = await prisma.user.create({
      data: {
        email: "admin@aigovernance.com",
        name: "Admin User",
        role: "ADMIN",
        passwordHash: adminHash,
        isActive: true,
        department: "IT Governance",
      },
    });

    const riskOfficer = await prisma.user.create({
      data: {
        email: "risk@aigovernance.com",
        name: "Risk Officer",
        role: "RISK_OFFICER",
        passwordHash: riskHash,
        isActive: true,
        department: "Risk Management",
      },
    });

    const auditor = await prisma.user.create({
      data: {
        email: "auditor@aigovernance.com",
        name: "Auditor User",
        role: "AUDITOR",
        passwordHash: auditorHash,
        isActive: true,
        department: "Internal Audit",
      },
    });

    // ── Data Assets ────────────────────────────────────────────────────────────
    const da1 = await prisma.dataAsset.create({
      data: {
        name: "Customer PII Database",
        description: "Primary customer personal data store",
        source: "AWS RDS",
        dataType: "structured",
        sensitivity: "PII",
        hasPii: true,
        piiFields: ["name", "email", "phone", "address"],
        retentionDays: 1095,
        location: "AWS RDS us-east-1",
        format: "SQL",
        owner: admin.id,
        tags: ["customers", "pii", "gdpr"],
      },
    });

    const da2 = await prisma.dataAsset.create({
      data: {
        name: "Transaction Logs",
        description: "Financial transaction records",
        source: "Azure SQL",
        dataType: "structured",
        sensitivity: "CONFIDENTIAL",
        hasPii: false,
        piiFields: [],
        retentionDays: 2555,
        location: "Azure SQL West Europe",
        format: "SQL",
        owner: riskOfficer.id,
        tags: ["finance", "transactions"],
      },
    });

    const da3 = await prisma.dataAsset.create({
      data: {
        name: "Employee Records",
        description: "HR employee data repository",
        source: "SharePoint Online",
        dataType: "unstructured",
        sensitivity: "RESTRICTED",
        hasPii: true,
        piiFields: ["name", "salary", "performance"],
        retentionDays: 3650,
        location: "SharePoint Online",
        format: "JSON",
        owner: admin.id,
        tags: ["hr", "employees", "restricted"],
      },
    });

    // ── AI Models ──────────────────────────────────────────────────────────────
    const m1 = await prisma.aIModel.create({
      data: {
        name: "Credit Risk Scorer",
        version: "2.1.0",
        type: "ML",
        status: "ACTIVE",
        description: "ML model for credit risk assessment",
        ownerId: riskOfficer.id,
        vendor: "Internal",
        framework: "XGBoost",
        department: "Risk Management",
        isPiiProcessing: true,
        isFinancial: true,
        isCritical: true,
        humanOversight: true,
        explainability: 65,
        tags: ["credit", "risk", "production"],
        metadata: { version: "1.7", trainedOn: "2024-Q4" },
      },
    });

    const m2 = await prisma.aIModel.create({
      data: {
        name: "Fraud Detection Engine",
        version: "3.0.1",
        type: "ML",
        status: "ACTIVE",
        description: "Real-time transaction fraud detection",
        ownerId: riskOfficer.id,
        vendor: "Internal",
        framework: "TensorFlow",
        department: "Financial Crime",
        isPiiProcessing: true,
        isFinancial: true,
        isCritical: true,
        humanOversight: true,
        explainability: 45,
        tags: ["fraud", "realtime", "critical"],
        metadata: { version: "2.12", latencyP99: "50ms" },
      },
    });

    const m3 = await prisma.aIModel.create({
      data: {
        name: "Customer Churn Predictor",
        version: "1.4.2",
        type: "ML",
        status: "UNDER_REVIEW",
        description: "Predicts customer churn probability",
        ownerId: admin.id,
        vendor: "Internal",
        framework: "scikit-learn",
        department: "Marketing",
        isPiiProcessing: true,
        isFinancial: false,
        isCritical: false,
        humanOversight: true,
        explainability: 72,
        tags: ["churn", "marketing"],
        metadata: { version: "1.3" },
      },
    });

    const m4 = await prisma.aIModel.create({
      data: {
        name: "NLP Document Classifier",
        version: "1.0.0",
        type: "NLP",
        status: "ACTIVE",
        description: "Classifies regulatory documents automatically",
        ownerId: auditor.id,
        vendor: "OpenAI",
        framework: "GPT-4",
        department: "Compliance",
        isPiiProcessing: false,
        isFinancial: false,
        isCritical: false,
        humanOversight: true,
        explainability: 55,
        tags: ["nlp", "compliance", "documents"],
        metadata: { baseModel: "gpt-4", finetuned: true },
      },
    });

    const m5 = await prisma.aIModel.create({
      data: {
        name: "Employee Sentiment Analyzer",
        version: "1.1.0",
        type: "NLP",
        status: "DEPRECATED",
        description: "Analyzes employee feedback sentiment",
        ownerId: admin.id,
        vendor: "Internal",
        framework: "HuggingFace",
        department: "Human Resources",
        isPiiProcessing: true,
        isFinancial: false,
        isCritical: false,
        humanOversight: false,
        explainability: 40,
        tags: ["hr", "nlp", "deprecated"],
        metadata: { version: "4.30" },
      },
    });

    // ── Model ↔ Data Asset Links ───────────────────────────────────────────────
    await prisma.modelDataAsset.createMany({
      data: [
        { modelId: m1.id, dataAssetId: da1.id, role: "input" },
        { modelId: m1.id, dataAssetId: da2.id, role: "input" },
        { modelId: m2.id, dataAssetId: da2.id, role: "input" },
        { modelId: m3.id, dataAssetId: da1.id, role: "input" },
        { modelId: m4.id, dataAssetId: da3.id, role: "input" },
      ],
    });

    // ── Risk Assessments ───────────────────────────────────────────────────────
    await prisma.riskAssessment.createMany({
      data: [
        {
          modelId: m1.id,
          assessorId: riskOfficer.id,
          riskLevel: "HIGH",
          overallScore: 78,
          dataSensitivityScore: 85,
          modelComplexityScore: 70,
          explainabilityScore: 65,
          humanOversightScore: 80,
          regulatoryExposureScore: 90,
          findings: "Potential age bias detected in credit scoring model. Bias score 0.07 exceeds threshold.",
          mitigations: "Implement fairness constraints. Quarterly bias testing with diverse datasets.",
          reviewedAt: new Date(),
          nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        {
          modelId: m2.id,
          assessorId: riskOfficer.id,
          riskLevel: "CRITICAL",
          overallScore: 85,
          dataSensitivityScore: 90,
          modelComplexityScore: 80,
          explainabilityScore: 45,
          humanOversightScore: 85,
          regulatoryExposureScore: 95,
          findings: "High false positive rate during peak transaction periods. Possible model drift.",
          mitigations: "Retrain with recent transaction data. Add temporal features. Monthly retraining pipeline.",
          reviewedAt: new Date(),
          nextReviewDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        },
        {
          modelId: m3.id,
          assessorId: auditor.id,
          riskLevel: "MEDIUM",
          overallScore: 45,
          dataSensitivityScore: 60,
          modelComplexityScore: 40,
          explainabilityScore: 72,
          humanOversightScore: 70,
          regulatoryExposureScore: 50,
          findings: "Model uses PII data without explicit consent tracking.",
          mitigations: "Implement consent management integration. Add consent check layer before inference.",
          reviewedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          nextReviewDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
        {
          modelId: m4.id,
          assessorId: admin.id,
          riskLevel: "LOW",
          overallScore: 25,
          dataSensitivityScore: 20,
          modelComplexityScore: 30,
          explainabilityScore: 55,
          humanOversightScore: 90,
          regulatoryExposureScore: 25,
          findings: "Black-box model lacks interpretability for regulatory review.",
          mitigations: "Add LIME/SHAP explanations. Integrate explainability library in Q3.",
          reviewedAt: null,
          nextReviewDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
        {
          modelId: m5.id,
          assessorId: riskOfficer.id,
          riskLevel: "HIGH",
          overallScore: 62,
          dataSensitivityScore: 70,
          modelComplexityScore: 55,
          explainabilityScore: 40,
          humanOversightScore: 30,
          regulatoryExposureScore: 65,
          findings: "Significant model drift detected, accuracy dropped 15%. No human oversight configured.",
          mitigations: "Model retired pending retraining decision. Enable human oversight before any reactivation.",
          reviewedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      ],
    });

    // ── Compliance Controls (tied to models) ───────────────────────────────────
    await prisma.complianceControl.createMany({
      data: [
        {
          modelId: m1.id,
          framework: "DPDP",
          controlId: "DPDP-1.1",
          controlName: "Lawful Basis for Processing",
          description: "Ensure lawful basis is established for all personal data processing",
          status: "PASS",
          evidence: "Privacy policy updated, consent forms implemented",
          notes: "Reviewed Q1 2026",
          reviewedAt: new Date(),
          reviewedBy: admin.id,
        },
        {
          modelId: m1.id,
          framework: "ISO_42001",
          controlId: "ISO42001-4.1",
          controlName: "AI Risk Assessment Process",
          description: "Establish formal AI risk assessment methodology",
          status: "PASS",
          evidence: "Risk assessment framework documented and approved",
          reviewedAt: new Date(),
          reviewedBy: riskOfficer.id,
        },
        {
          modelId: m1.id,
          framework: "EU_AI_ACT",
          controlId: "EU-AIA-1.1",
          controlName: "High-Risk AI Classification",
          description: "Classify AI systems according to EU AI Act risk categories",
          status: "PASS",
          evidence: "Credit Risk Scorer classified as High-Risk per Annex III",
          reviewedAt: new Date(),
          reviewedBy: riskOfficer.id,
        },
        {
          modelId: m2.id,
          framework: "DPDP",
          controlId: "DPDP-2.1",
          controlName: "Data Minimization",
          description: "Collect only data necessary for specified purposes",
          status: "PASS",
          evidence: "Data inventory reviewed, unnecessary fields removed",
          reviewedAt: new Date(),
          reviewedBy: riskOfficer.id,
        },
        {
          modelId: m2.id,
          framework: "ISO_42001",
          controlId: "ISO42001-6.1",
          controlName: "AI Incident Response",
          description: "Define and test AI incident response procedures",
          status: "FAIL",
          evidence: null,
          notes: "Incident response playbook not yet drafted",
          reviewedAt: null,
          reviewedBy: null,
        },
        {
          modelId: m3.id,
          framework: "DPDP",
          controlId: "DPDP-3.1",
          controlName: "Data Subject Rights",
          description: "Implement mechanisms for data subject access and deletion requests",
          status: "PARTIAL",
          evidence: null,
          notes: "Self-service portal under development",
          reviewedAt: null,
          reviewedBy: null,
        },
        {
          modelId: m4.id,
          framework: "ISO_42001",
          controlId: "ISO42001-5.1",
          controlName: "AI System Documentation",
          description: "Maintain comprehensive documentation for all AI systems",
          status: "PARTIAL",
          evidence: "Partial documentation available",
          notes: "Complete documentation pending for NLP model",
          reviewedAt: null,
          reviewedBy: null,
        },
        {
          modelId: m5.id,
          framework: "ISO_42001",
          controlId: "ISO42001-7.1",
          controlName: "Human Oversight of AI",
          description: "Ensure human oversight for high-risk AI decisions",
          status: "FAIL",
          evidence: null,
          notes: "No human oversight configured for this model",
          reviewedAt: null,
          reviewedBy: null,
        },
      ],
    });

    // ── Agents ─────────────────────────────────────────────────────────────────
    const agent1 = await prisma.agent.create({
      data: {
        name: "ComplianceBot",
        description: "Automated compliance monitoring and alert generation",
        modelId: m4.id,
        status: "IDLE",
        systemPrompt: "You are a compliance monitoring assistant. Analyze AI models for regulatory compliance.",
        tools: ["read_compliance", "write_alerts", "read_models"],
        version: "2.0.0",
        maxTokens: 4000,
        temperature: 0.2,
        metadata: { lastRun: new Date().toISOString() },
      },
    });

    const agent2 = await prisma.agent.create({
      data: {
        name: "RiskAnalyzerAgent",
        description: "AI-assisted risk assessment with human approval workflow",
        modelId: m1.id,
        status: "IDLE",
        systemPrompt: "You are a risk analysis assistant. Evaluate AI model risks and suggest mitigations.",
        tools: ["read_risks", "write_assessments", "read_models"],
        version: "1.2.0",
        maxTokens: 2000,
        temperature: 0.3,
        metadata: { requiresApproval: true },
      },
    });

    // ── Prompt Logs ────────────────────────────────────────────────────────────
    await prisma.promptLog.createMany({
      data: [
        {
          agentId: agent1.id,
          modelId: m4.id,
          userId: riskOfficer.id,
          prompt: "Analyze compliance status for DPDP framework and generate summary report",
          response: "DPDP compliance analysis complete. 3/4 controls compliant. Flagging DPDP-3.1 as requiring immediate attention.",
          inputTokens: 850,
          outputTokens: 390,
          latencyMs: 2100,
          isHallucination: false,
          isPolicyViolation: false,
          flagged: false,
          environment: "production",
        },
        {
          agentId: agent1.id,
          modelId: m4.id,
          userId: riskOfficer.id,
          prompt: "Check for new regulatory updates affecting AI governance",
          response: "EU AI Act implementation timeline updated. New conformity assessment deadline: August 2026.",
          inputTokens: 600,
          outputTokens: 290,
          latencyMs: 1800,
          isHallucination: false,
          isPolicyViolation: false,
          flagged: false,
          environment: "production",
        },
        {
          agentId: agent2.id,
          modelId: m1.id,
          userId: riskOfficer.id,
          prompt: "Assess risk level for Credit Risk Scorer based on latest performance metrics",
          response: "Risk assessment: HIGH. Bias score 0.07 exceeds threshold of 0.05. Recommend immediate review.",
          inputTokens: 1200,
          outputTokens: 900,
          latencyMs: 3400,
          isHallucination: false,
          isPolicyViolation: false,
          flagged: true,
          flagReason: "High risk score requires human review",
          environment: "production",
        },
        {
          agentId: agent2.id,
          modelId: m2.id,
          userId: admin.id,
          prompt: "Generate mitigation recommendations for fraud detection model drift",
          response: "Recommended mitigations: 1) Retrain with Q4 2025 data 2) Add temporal drift detection 3) Shadow deployment for validation.",
          inputTokens: 980,
          outputTokens: 770,
          latencyMs: 2900,
          isHallucination: false,
          isPolicyViolation: false,
          flagged: false,
          environment: "production",
        },
      ],
    });

    // ── Alerts ─────────────────────────────────────────────────────────────────
    await prisma.alert.createMany({
      data: [
        {
          title: "Bias Score Exceeded Threshold",
          message: "Credit Risk Scorer bias score (0.07) exceeds acceptable threshold (0.05). Immediate review required.",
          severity: "ERROR",
          modelId: m1.id,
          isRead: false,
          metadata: { biasScore: 0.07, threshold: 0.05, modelName: "Credit Risk Scorer" },
        },
        {
          title: "Fraud Detection Accuracy Drop",
          message: "Fraud Detection Engine accuracy dropped from 0.97 to 0.91 in last 24 hours. Possible model drift.",
          severity: "CRITICAL",
          modelId: m2.id,
          isRead: true,
          metadata: { previousAccuracy: 0.97, currentAccuracy: 0.91 },
        },
        {
          title: "Model Drift Detected",
          message: "Employee Sentiment Analyzer drift score indicates significant distribution shift. Model is deprecated.",
          severity: "WARNING",
          modelId: m5.id,
          isRead: true,
          resolvedAt: new Date(),
          metadata: { driftScore: 0.09 },
        },
        {
          title: "Missing Consent Records",
          message: "Customer Churn Predictor accessing PII without complete consent audit trail.",
          severity: "WARNING",
          modelId: m3.id,
          isRead: false,
          metadata: { missingConsents: 42 },
        },
      ],
    });

    // ── Consent Records ────────────────────────────────────────────────────────
    await prisma.consentRecord.createMany({
      data: [
        {
          dataAssetId: da1.id,
          subjectId: "customer-001",
          consentType: "DATA_PROCESSING",
          status: "GRANTED",
          grantedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          ipAddress: "192.168.1.101",
          metadata: { purpose: "Credit assessment" },
        },
        {
          dataAssetId: da1.id,
          subjectId: "customer-002",
          consentType: "AI_DECISION",
          status: "GRANTED",
          grantedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          ipAddress: "192.168.1.102",
          metadata: { purpose: "Marketing personalization" },
        },
        {
          dataAssetId: da2.id,
          subjectId: "customer-001",
          consentType: "DATA_PROCESSING",
          status: "GRANTED",
          grantedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          expiresAt: null,
          ipAddress: "192.168.1.101",
          metadata: { purpose: "Fraud detection" },
        },
      ],
    });

    // ── Audit Logs ─────────────────────────────────────────────────────────────
    await prisma.auditLog.createMany({
      data: [
        {
          userId: admin.id,
          action: "CREATE",
          resource: "AIModel",
          resourceId: m1.id,
          modelId: m1.id,
          ipAddress: "10.0.0.1",
          userAgent: "Mozilla/5.0",
          metadata: { modelName: "Credit Risk Scorer", version: "2.1.0" },
        },
        {
          userId: riskOfficer.id,
          action: "CREATE",
          resource: "RiskAssessment",
          resourceId: m1.id,
          modelId: m1.id,
          ipAddress: "10.0.0.2",
          userAgent: "Mozilla/5.0",
          metadata: { riskScore: 78, riskLevel: "HIGH" },
        },
        {
          userId: auditor.id,
          action: "UPDATE",
          resource: "ComplianceControl",
          resourceId: "ISO42001-4.1",
          ipAddress: "10.0.0.3",
          userAgent: "Mozilla/5.0",
          metadata: { framework: "ISO_42001", status: "PASS" },
        },
        {
          userId: admin.id,
          action: "CREATE",
          resource: "User",
          resourceId: riskOfficer.id,
          ipAddress: "10.0.0.1",
          userAgent: "Mozilla/5.0",
          metadata: { role: "RISK_OFFICER" },
        },
        {
          userId: riskOfficer.id,
          action: "APPROVE",
          resource: "Alert",
          resourceId: m5.id,
          modelId: m5.id,
          ipAddress: "10.0.0.2",
          userAgent: "Mozilla/5.0",
          metadata: { alertType: "DRIFT_DETECTED", modelName: "Employee Sentiment Analyzer" },
        },
      ],
    });

    // ── Policy Configs ─────────────────────────────────────────────────────────
    await prisma.policyConfig.createMany({
      data: [
        {
          key: "bias_threshold",
          value: 0.05,
          description: "Maximum acceptable bias score for production AI models",
          updatedBy: admin.id,
        },
        {
          key: "drift_threshold",
          value: 0.08,
          description: "Maximum acceptable drift score before model review is triggered",
          updatedBy: admin.id,
        },
        {
          key: "accuracy_minimum",
          value: 0.85,
          description: "Minimum acceptable accuracy for production AI models",
          updatedBy: riskOfficer.id,
        },
        {
          key: "data_retention_default_days",
          value: 365,
          description: "Default data retention period in days",
          updatedBy: admin.id,
        },
        {
          key: "consent_expiry_days",
          value: 730,
          description: "Default consent expiry period in days",
          updatedBy: admin.id,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      data: {
        users: 3,
        dataAssets: 3,
        aiModels: 5,
        riskAssessments: 5,
        complianceControls: 8,
        agents: 2,
        promptLogs: 4,
        alerts: 4,
        consentRecords: 3,
        auditLogs: 5,
        policyConfigs: 5,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
