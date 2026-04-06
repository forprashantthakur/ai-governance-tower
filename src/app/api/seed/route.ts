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

    // Hash passwords
    const adminHash = await bcrypt.hash("Admin@123456", 12);
    const riskHash = await bcrypt.hash("Risk@123456", 12);
    const auditorHash = await bcrypt.hash("Audit@123456", 12);

    // Create users
    const admin = await prisma.user.create({
      data: {
        email: "admin@aigovernance.com",
        name: "Admin User",
        role: "ADMIN",
        passwordHash: adminHash,
        isActive: true,
        department: "IT Governance",
        jobTitle: "System Administrator",
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
        jobTitle: "Chief Risk Officer",
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
        jobTitle: "Senior Auditor",
      },
    });

    // Create data assets
    const da1 = await prisma.dataAsset.create({
      data: {
        name: "Customer PII Database",
        type: "DATABASE",
        classification: "CONFIDENTIAL",
        description: "Primary customer personal data store",
        owner: admin.id,
        location: "AWS RDS us-east-1",
        retentionDays: 1095,
        encryptionEnabled: true,
        accessControlled: true,
        dataSubjects: ["customers", "prospects"],
        legalBasis: "CONTRACT",
        consentRequired: true,
      },
    });

    const da2 = await prisma.dataAsset.create({
      data: {
        name: "Transaction Logs",
        type: "DATABASE",
        classification: "INTERNAL",
        description: "Financial transaction records",
        owner: riskOfficer.id,
        location: "Azure SQL",
        retentionDays: 2555,
        encryptionEnabled: true,
        accessControlled: true,
        dataSubjects: ["customers"],
        legalBasis: "LEGAL_OBLIGATION",
        consentRequired: false,
      },
    });

    const da3 = await prisma.dataAsset.create({
      data: {
        name: "Employee Records",
        type: "DOCUMENT_STORE",
        classification: "RESTRICTED",
        description: "HR employee data repository",
        owner: admin.id,
        location: "SharePoint Online",
        retentionDays: 3650,
        encryptionEnabled: true,
        accessControlled: true,
        dataSubjects: ["employees"],
        legalBasis: "CONTRACT",
        consentRequired: false,
      },
    });

    // Create AI models
    const m1 = await prisma.aIModel.create({
      data: {
        name: "Credit Risk Scorer",
        version: "2.1.0",
        type: "PREDICTIVE",
        status: "PRODUCTION",
        description: "ML model for credit risk assessment",
        owner: riskOfficer.id,
        vendor: "Internal",
        useCase: "Credit scoring for loan applications",
        riskLevel: "HIGH",
        department: "Risk Management",
        accuracy: 0.94,
        biasScore: 0.07,
        driftScore: 0.03,
        lastEvaluated: new Date(),
        metadata: { framework: "XGBoost", version: "1.7" },
      },
    });

    const m2 = await prisma.aIModel.create({
      data: {
        name: "Fraud Detection Engine",
        version: "3.0.1",
        type: "ANOMALY_DETECTION",
        status: "PRODUCTION",
        description: "Real-time transaction fraud detection",
        owner: riskOfficer.id,
        vendor: "Internal",
        useCase: "Detect fraudulent transactions in real-time",
        riskLevel: "CRITICAL",
        department: "Financial Crime",
        accuracy: 0.97,
        biasScore: 0.04,
        driftScore: 0.02,
        lastEvaluated: new Date(),
        metadata: { framework: "TensorFlow", version: "2.12" },
      },
    });

    const m3 = await prisma.aIModel.create({
      data: {
        name: "Customer Churn Predictor",
        version: "1.4.2",
        type: "PREDICTIVE",
        status: "STAGING",
        description: "Predicts customer churn probability",
        owner: admin.id,
        vendor: "Internal",
        useCase: "Retention campaign targeting",
        riskLevel: "MEDIUM",
        department: "Marketing",
        accuracy: 0.88,
        biasScore: 0.11,
        driftScore: 0.06,
        lastEvaluated: new Date(),
        metadata: { framework: "scikit-learn", version: "1.3" },
      },
    });

    const m4 = await prisma.aIModel.create({
      data: {
        name: "NLP Document Classifier",
        version: "1.0.0",
        type: "NLP",
        status: "DEVELOPMENT",
        description: "Classifies regulatory documents automatically",
        owner: auditor.id,
        vendor: "OpenAI",
        useCase: "Automated compliance document classification",
        riskLevel: "LOW",
        department: "Compliance",
        accuracy: 0.91,
        biasScore: 0.05,
        driftScore: 0.01,
        lastEvaluated: new Date(),
        metadata: { baseModel: "gpt-4", finetuned: true },
      },
    });

    const m5 = await prisma.aIModel.create({
      data: {
        name: "Employee Sentiment Analyzer",
        version: "1.1.0",
        type: "NLP",
        status: "RETIRED",
        description: "Analyzes employee feedback sentiment",
        owner: admin.id,
        vendor: "Internal",
        useCase: "HR engagement measurement",
        riskLevel: "MEDIUM",
        department: "Human Resources",
        accuracy: 0.85,
        biasScore: 0.13,
        driftScore: 0.09,
        lastEvaluated: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        metadata: { framework: "HuggingFace", version: "4.30" },
      },
    });

    // Link models to data assets
    await prisma.modelDataAsset.createMany({
      data: [
        { modelId: m1.id, dataAssetId: da1.id, accessType: "READ" },
        { modelId: m1.id, dataAssetId: da2.id, accessType: "READ" },
        { modelId: m2.id, dataAssetId: da2.id, accessType: "READ" },
        { modelId: m3.id, dataAssetId: da1.id, accessType: "READ" },
        { modelId: m4.id, dataAssetId: da3.id, accessType: "READ" },
      ],
    });

    // Create risk assessments
    await prisma.riskAssessment.createMany({
      data: [
        {
          modelId: m1.id,
          assessorId: riskOfficer.id,
          riskScore: 78,
          likelihood: "LIKELY",
          impact: "HIGH",
          category: "BIAS",
          findings: "Potential age bias detected in credit scoring model",
          recommendations: "Implement fairness constraints and regular bias audits",
          mitigationPlan: "Quarterly bias testing with diverse test datasets",
          status: "IN_PROGRESS",
          reviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        {
          modelId: m2.id,
          assessorId: riskOfficer.id,
          riskScore: 85,
          likelihood: "POSSIBLE",
          impact: "CRITICAL",
          category: "ACCURACY",
          findings: "High false positive rate during peak transaction periods",
          recommendations: "Retrain with recent transaction data, add temporal features",
          mitigationPlan: "Monthly model retraining pipeline",
          status: "OPEN",
          reviewDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        },
        {
          modelId: m3.id,
          assessorId: auditor.id,
          riskScore: 45,
          likelihood: "POSSIBLE",
          impact: "MEDIUM",
          category: "DATA_PRIVACY",
          findings: "Model uses PII data without explicit consent tracking",
          recommendations: "Implement consent management integration",
          mitigationPlan: "Add consent check layer before model inference",
          status: "RESOLVED",
          reviewDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
        {
          modelId: m4.id,
          assessorId: admin.id,
          riskScore: 25,
          likelihood: "UNLIKELY",
          impact: "LOW",
          category: "EXPLAINABILITY",
          findings: "Black-box model lacks interpretability for regulatory review",
          recommendations: "Add LIME/SHAP explanations to model outputs",
          mitigationPlan: "Integrate explainability library in Q3",
          status: "OPEN",
          reviewDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
        {
          modelId: m5.id,
          assessorId: riskOfficer.id,
          riskScore: 62,
          likelihood: "LIKELY",
          impact: "MEDIUM",
          category: "DRIFT",
          findings: "Significant model drift detected, accuracy dropped 15%",
          recommendations: "Retire or retrain model with current data",
          mitigationPlan: "Model retired pending retraining decision",
          status: "RESOLVED",
          reviewDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        },
      ],
    });

    // Create compliance controls
    await prisma.complianceControl.createMany({
      data: [
        {
          controlId: "DPDP-1.1",
          framework: "DPDP",
          title: "Lawful Basis for Processing",
          description: "Ensure lawful basis is established for all personal data processing",
          category: "Data Protection",
          status: "COMPLIANT",
          priority: "CRITICAL",
          assignedTo: admin.id,
          reviewedAt: new Date(),
          evidence: "Privacy policy updated, consent forms implemented",
          remediationSteps: null,
          dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        {
          controlId: "DPDP-2.1",
          framework: "DPDP",
          title: "Data Minimization",
          description: "Collect only data necessary for specified purposes",
          category: "Data Protection",
          status: "COMPLIANT",
          priority: "HIGH",
          assignedTo: riskOfficer.id,
          reviewedAt: new Date(),
          evidence: "Data inventory reviewed, unnecessary fields removed",
          remediationSteps: null,
          dueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        },
        {
          controlId: "DPDP-3.1",
          framework: "DPDP",
          title: "Data Subject Rights",
          description: "Implement mechanisms for data subject access and deletion requests",
          category: "Data Rights",
          status: "IN_PROGRESS",
          priority: "HIGH",
          assignedTo: admin.id,
          reviewedAt: null,
          evidence: null,
          remediationSteps: "Build self-service portal for data subject requests",
          dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
        {
          controlId: "ISO42001-4.1",
          framework: "ISO_42001",
          title: "AI Risk Assessment Process",
          description: "Establish formal AI risk assessment methodology",
          category: "Risk Management",
          status: "COMPLIANT",
          priority: "CRITICAL",
          assignedTo: riskOfficer.id,
          reviewedAt: new Date(),
          evidence: "Risk assessment framework documented and approved",
          remediationSteps: null,
          dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        {
          controlId: "ISO42001-5.1",
          framework: "ISO_42001",
          title: "AI System Documentation",
          description: "Maintain comprehensive documentation for all AI systems",
          category: "Documentation",
          status: "PARTIALLY_COMPLIANT",
          priority: "MEDIUM",
          assignedTo: auditor.id,
          reviewedAt: null,
          evidence: "3 of 5 models fully documented",
          remediationSteps: "Complete documentation for NLP and Sentiment models",
          dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        },
        {
          controlId: "ISO42001-6.1",
          framework: "ISO_42001",
          title: "AI Incident Response",
          description: "Define and test AI incident response procedures",
          category: "Incident Management",
          status: "NON_COMPLIANT",
          priority: "HIGH",
          assignedTo: riskOfficer.id,
          reviewedAt: null,
          evidence: null,
          remediationSteps: "Draft incident response playbook, conduct tabletop exercise",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        {
          controlId: "ISO42001-7.1",
          framework: "ISO_42001",
          title: "Human Oversight of AI",
          description: "Ensure human oversight for high-risk AI decisions",
          category: "Governance",
          status: "COMPLIANT",
          priority: "CRITICAL",
          assignedTo: admin.id,
          reviewedAt: new Date(),
          evidence: "Human-in-the-loop process implemented for credit decisions",
          remediationSteps: null,
          dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        {
          controlId: "GDPR-1.1",
          framework: "GDPR",
          title: "Privacy by Design",
          description: "Embed privacy principles into system design",
          category: "Privacy",
          status: "COMPLIANT",
          priority: "HIGH",
          assignedTo: admin.id,
          reviewedAt: new Date(),
          evidence: "PIA conducted for all new AI systems",
          remediationSteps: null,
          dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        {
          controlId: "GDPR-2.1",
          framework: "GDPR",
          title: "Cross-Border Data Transfer",
          description: "Ensure adequate safeguards for international data transfers",
          category: "Data Transfer",
          status: "IN_PROGRESS",
          priority: "HIGH",
          assignedTo: riskOfficer.id,
          reviewedAt: null,
          evidence: null,
          remediationSteps: "Review SCCs for all third-party AI vendors",
          dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
        {
          controlId: "EU-AIA-1.1",
          framework: "EU_AI_ACT",
          title: "High-Risk AI Classification",
          description: "Classify AI systems according to EU AI Act risk categories",
          category: "Classification",
          status: "COMPLIANT",
          priority: "CRITICAL",
          assignedTo: riskOfficer.id,
          reviewedAt: new Date(),
          evidence: "Credit Risk Scorer classified as High-Risk per Annex III",
          remediationSteps: null,
          dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        {
          controlId: "EU-AIA-2.1",
          framework: "EU_AI_ACT",
          title: "Conformity Assessment",
          description: "Conduct conformity assessment for high-risk AI systems",
          category: "Assessment",
          status: "NON_COMPLIANT",
          priority: "CRITICAL",
          assignedTo: auditor.id,
          reviewedAt: null,
          evidence: null,
          remediationSteps: "Engage notified body for conformity assessment of Credit Risk Scorer",
          dueDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        },
        {
          controlId: "EU-AIA-3.1",
          framework: "EU_AI_ACT",
          title: "Technical Documentation",
          description: "Maintain technical documentation per EU AI Act Article 11",
          category: "Documentation",
          status: "PARTIALLY_COMPLIANT",
          priority: "HIGH",
          assignedTo: auditor.id,
          reviewedAt: null,
          evidence: "Partial documentation available for 2 high-risk systems",
          remediationSteps: "Complete technical documentation per Article 11 requirements",
          dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      ],
    });

    // Create AI agents
    const agent1 = await prisma.aIAgent.create({
      data: {
        name: "ComplianceBot",
        type: "AUTONOMOUS",
        status: "ACTIVE",
        description: "Automated compliance monitoring and alert generation",
        version: "2.0.0",
        owner: riskOfficer.id,
        permissions: ["read:compliance", "write:alerts", "read:models"],
        maxTokenBudget: 100000,
        usedTokenBudget: 45230,
        metadata: { model: "gpt-4", temperature: 0.2, maxRetries: 3 },
      },
    });

    const agent2 = await prisma.aIAgent.create({
      data: {
        name: "RiskAnalyzerAgent",
        type: "SUPERVISED",
        status: "ACTIVE",
        description: "AI-assisted risk assessment with human approval workflow",
        version: "1.2.0",
        owner: riskOfficer.id,
        permissions: ["read:risks", "write:assessments", "read:models"],
        maxTokenBudget: 50000,
        usedTokenBudget: 12400,
        metadata: { model: "claude-sonnet-4-6", temperature: 0.3 },
      },
    });

    // Create prompt logs
    await prisma.promptLog.createMany({
      data: [
        {
          agentId: agent1.id,
          prompt: "Analyze compliance status for DPDP framework and generate summary report",
          response: "DPDP compliance analysis complete. 3/4 controls compliant. Flagging DPDP-3.1 as requiring immediate attention.",
          tokensUsed: 1240,
          latencyMs: 2100,
          model: "gpt-4",
          approved: true,
          approvedBy: riskOfficer.id,
        },
        {
          agentId: agent1.id,
          prompt: "Check for new regulatory updates affecting AI governance",
          response: "EU AI Act implementation timeline updated. New conformity assessment deadline: August 2026.",
          tokensUsed: 890,
          latencyMs: 1800,
          model: "gpt-4",
          approved: true,
          approvedBy: riskOfficer.id,
        },
        {
          agentId: agent2.id,
          prompt: "Assess risk level for Credit Risk Scorer model based on latest performance metrics",
          response: "Risk assessment: HIGH. Bias score 0.07 exceeds threshold of 0.05. Recommend immediate review.",
          tokensUsed: 2100,
          latencyMs: 3400,
          model: "claude-sonnet-4-6",
          approved: false,
          approvedBy: null,
        },
        {
          agentId: agent2.id,
          prompt: "Generate mitigation recommendations for fraud detection model drift",
          response: "Recommended mitigations: 1) Retrain with Q4 2025 data, 2) Add temporal drift detection, 3) Implement shadow deployment for validation.",
          tokensUsed: 1750,
          latencyMs: 2900,
          model: "claude-sonnet-4-6",
          approved: true,
          approvedBy: admin.id,
        },
      ],
    });

    // Create alerts
    await prisma.alert.createMany({
      data: [
        {
          modelId: m1.id,
          type: "BIAS_DETECTED",
          severity: "HIGH",
          title: "Bias Score Exceeded Threshold",
          message: "Credit Risk Scorer bias score (0.07) exceeds acceptable threshold (0.05). Immediate review required.",
          isRead: false,
          isResolved: false,
          assignedTo: riskOfficer.id,
        },
        {
          modelId: m2.id,
          type: "PERFORMANCE_DEGRADATION",
          severity: "CRITICAL",
          title: "Fraud Detection Accuracy Drop",
          message: "Fraud Detection Engine accuracy dropped from 0.97 to 0.91 in last 24 hours. Possible model drift.",
          isRead: true,
          isResolved: false,
          assignedTo: riskOfficer.id,
        },
        {
          modelId: m5.id,
          type: "DRIFT_DETECTED",
          severity: "MEDIUM",
          title: "Model Drift Detected",
          message: "Employee Sentiment Analyzer drift score (0.09) indicates significant distribution shift.",
          isRead: true,
          isResolved: true,
          assignedTo: admin.id,
        },
        {
          modelId: m3.id,
          type: "COMPLIANCE_VIOLATION",
          severity: "LOW",
          title: "Missing Consent Records",
          message: "Customer Churn Predictor accessing PII without complete consent audit trail.",
          isRead: false,
          isResolved: false,
          assignedTo: auditor.id,
        },
      ],
    });

    // Create consent records
    await prisma.consentRecord.createMany({
      data: [
        {
          dataAssetId: da1.id,
          subjectId: "customer-001",
          subjectType: "CUSTOMER",
          purpose: "Credit assessment and loan eligibility determination",
          granted: true,
          grantedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          legalBasis: "CONSENT",
        },
        {
          dataAssetId: da1.id,
          subjectId: "customer-002",
          subjectType: "CUSTOMER",
          purpose: "Marketing personalization and churn prevention",
          granted: true,
          grantedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          legalBasis: "CONSENT",
        },
        {
          dataAssetId: da2.id,
          subjectId: "customer-001",
          subjectType: "CUSTOMER",
          purpose: "Fraud detection and financial crime prevention",
          granted: true,
          grantedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          expiresAt: null,
          legalBasis: "LEGITIMATE_INTEREST",
        },
      ],
    });

    // Create audit logs
    await prisma.auditLog.createMany({
      data: [
        {
          userId: admin.id,
          action: "MODEL_CREATED",
          resource: "AIModel",
          resourceId: m1.id,
          ipAddress: "10.0.0.1",
          userAgent: "Mozilla/5.0",
          metadata: { modelName: "Credit Risk Scorer", version: "2.1.0" },
        },
        {
          userId: riskOfficer.id,
          action: "RISK_ASSESSMENT_CREATED",
          resource: "RiskAssessment",
          resourceId: m1.id,
          ipAddress: "10.0.0.2",
          userAgent: "Mozilla/5.0",
          metadata: { riskScore: 78, category: "BIAS" },
        },
        {
          userId: auditor.id,
          action: "COMPLIANCE_REVIEW",
          resource: "ComplianceControl",
          resourceId: "ISO42001-4.1",
          ipAddress: "10.0.0.3",
          userAgent: "Mozilla/5.0",
          metadata: { framework: "ISO_42001", status: "COMPLIANT" },
        },
        {
          userId: admin.id,
          action: "USER_CREATED",
          resource: "User",
          resourceId: riskOfficer.id,
          ipAddress: "10.0.0.1",
          userAgent: "Mozilla/5.0",
          metadata: { role: "RISK_OFFICER" },
        },
        {
          userId: riskOfficer.id,
          action: "ALERT_RESOLVED",
          resource: "Alert",
          resourceId: m5.id,
          ipAddress: "10.0.0.2",
          userAgent: "Mozilla/5.0",
          metadata: { alertType: "DRIFT_DETECTED", modelName: "Employee Sentiment Analyzer" },
        },
      ],
    });

    // Create policy configs
    await prisma.policyConfig.createMany({
      data: [
        {
          key: "bias_threshold",
          value: "0.05",
          description: "Maximum acceptable bias score for production AI models",
          category: "RISK_THRESHOLDS",
          updatedBy: admin.id,
        },
        {
          key: "drift_threshold",
          value: "0.08",
          description: "Maximum acceptable drift score before model review is triggered",
          category: "RISK_THRESHOLDS",
          updatedBy: admin.id,
        },
        {
          key: "accuracy_minimum",
          value: "0.85",
          description: "Minimum acceptable accuracy for production AI models",
          category: "RISK_THRESHOLDS",
          updatedBy: riskOfficer.id,
        },
        {
          key: "data_retention_default_days",
          value: "365",
          description: "Default data retention period in days",
          category: "DATA_GOVERNANCE",
          updatedBy: admin.id,
        },
        {
          key: "consent_expiry_days",
          value: "730",
          description: "Default consent expiry period in days",
          category: "DATA_GOVERNANCE",
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
        complianceControls: 12,
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
