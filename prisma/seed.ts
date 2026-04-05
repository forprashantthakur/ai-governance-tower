// ============================================================
// Seed Script — AI Governance Control Tower
// Run: npm run db:seed
// ============================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding AI Governance Control Tower...\n");

  // ─── Users ─────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Admin@1234!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@governance.ai" },
    update: {},
    create: {
      email: "admin@governance.ai",
      name: "Platform Admin",
      passwordHash,
      role: "ADMIN",
      department: "IT & Governance",
    },
  });

  const riskOfficer = await prisma.user.upsert({
    where: { email: "risk@governance.ai" },
    update: {},
    create: {
      email: "risk@governance.ai",
      name: "Priya Sharma",
      passwordHash,
      role: "RISK_OFFICER",
      department: "Risk Management",
    },
  });

  const auditor = await prisma.user.upsert({
    where: { email: "audit@governance.ai" },
    update: {},
    create: {
      email: "audit@governance.ai",
      name: "Rahul Verma",
      passwordHash,
      role: "AUDITOR",
      department: "Compliance & Audit",
    },
  });

  console.log("✅ Users created");

  // ─── Data Assets ───────────────────────────────────────────────────────────
  const customerDataAsset = await prisma.dataAsset.upsert({
    where: { id: "da-customer-001" },
    update: {},
    create: {
      id: "da-customer-001",
      name: "Customer PII Database",
      description: "Customer profiles including name, email, phone, and address",
      source: "CRM System (Salesforce)",
      dataType: "structured",
      sensitivity: "PII",
      hasPii: true,
      piiFields: ["name", "email", "phone", "address", "aadhaar_hash"],
      retentionDays: 365,
      location: "s3://company-data/customers/",
      format: "Parquet",
      owner: "Customer Success Team",
      tags: ["crm", "gdpr", "dpdp"],
    },
  });

  const transactionAsset = await prisma.dataAsset.upsert({
    where: { id: "da-transaction-001" },
    update: {},
    create: {
      id: "da-transaction-001",
      name: "Transaction History",
      description: "Financial transaction records for fraud detection",
      source: "Core Banking System",
      dataType: "structured",
      sensitivity: "RESTRICTED",
      hasPii: true,
      piiFields: ["account_number", "pan_card_hash", "ifsc"],
      retentionDays: 2555, // 7 years regulatory
      location: "postgres://banking-db/transactions",
      format: "PostgreSQL",
      owner: "Finance Operations",
      tags: ["financial", "rbi", "audit"],
    },
  });

  const productLogsAsset = await prisma.dataAsset.upsert({
    where: { id: "da-logs-001" },
    update: {},
    create: {
      id: "da-logs-001",
      name: "Application Event Logs",
      description: "User interaction and product usage logs",
      source: "Analytics Platform",
      dataType: "unstructured",
      sensitivity: "INTERNAL",
      hasPii: false,
      piiFields: [],
      retentionDays: 90,
      location: "elasticsearch://logs-cluster/events",
      format: "JSON",
      owner: "Data Engineering",
      tags: ["analytics", "product"],
    },
  });

  console.log("✅ Data assets created");

  // ─── AI Models ─────────────────────────────────────────────────────────────
  const model1 = await prisma.aIModel.upsert({
    where: { id: "model-gpt4-cs" },
    update: {},
    create: {
      id: "model-gpt4-cs",
      name: "GPT-4 Customer Support Bot",
      version: "2.1.0",
      description: "LLM-powered customer support handling tier-1 queries via chat",
      type: "LLM",
      status: "ACTIVE",
      ownerId: riskOfficer.id,
      department: "Customer Success",
      vendor: "OpenAI",
      framework: "LangChain",
      endpoint: "https://api.internal.company.com/cs-bot/v2",
      tags: ["customer-facing", "prod", "chat"],
      isPiiProcessing: true,
      isFinancial: false,
      isCritical: true,
      humanOversight: true,
      explainability: 40,
    },
  });

  const model2 = await prisma.aIModel.upsert({
    where: { id: "model-fraud-ml" },
    update: {},
    create: {
      id: "model-fraud-ml",
      name: "Real-time Fraud Detector",
      version: "5.0.2",
      description: "Gradient boosting model for real-time transaction fraud scoring",
      type: "ML",
      status: "ACTIVE",
      ownerId: riskOfficer.id,
      department: "Risk Management",
      vendor: "Internal",
      framework: "XGBoost / MLflow",
      tags: ["financial", "real-time", "critical"],
      isPiiProcessing: true,
      isFinancial: true,
      isCritical: true,
      humanOversight: false,
      explainability: 72,
    },
  });

  const model3 = await prisma.aIModel.upsert({
    where: { id: "model-reco-engine" },
    update: {},
    create: {
      id: "model-reco-engine",
      name: "Product Recommendation Engine",
      version: "3.4.1",
      description: "Collaborative filtering model for personalised product recommendations",
      type: "RECOMMENDATION",
      status: "ACTIVE",
      ownerId: admin.id,
      department: "Product",
      vendor: "Internal",
      framework: "TensorFlow Recommenders",
      tags: ["personalisation", "e-commerce"],
      isPiiProcessing: true,
      isFinancial: false,
      isCritical: false,
      humanOversight: true,
      explainability: 55,
    },
  });

  const model4 = await prisma.aIModel.upsert({
    where: { id: "model-doc-agent" },
    update: {},
    create: {
      id: "model-doc-agent",
      name: "Document Processing Agent",
      version: "1.0.0",
      description: "Agentic pipeline for extracting and classifying legal documents",
      type: "AGENT",
      status: "UNDER_REVIEW",
      ownerId: riskOfficer.id,
      department: "Legal",
      vendor: "Anthropic",
      framework: "Claude Agent SDK",
      tags: ["legal", "document", "beta"],
      isPiiProcessing: true,
      isFinancial: false,
      isCritical: false,
      humanOversight: true,
      explainability: 35,
    },
  });

  const model5 = await prisma.aIModel.upsert({
    where: { id: "model-nlp-sentiment" },
    update: {},
    create: {
      id: "model-nlp-sentiment",
      name: "Customer Sentiment Analyser",
      version: "2.0.0",
      description: "Fine-tuned BERT for sentiment and intent classification on support tickets",
      type: "NLP",
      status: "ACTIVE",
      ownerId: admin.id,
      department: "Customer Insights",
      vendor: "HuggingFace",
      framework: "Transformers",
      tags: ["nlp", "analytics"],
      isPiiProcessing: false,
      isFinancial: false,
      isCritical: false,
      humanOversight: true,
      explainability: 65,
    },
  });

  console.log("✅ AI Models created");

  // ─── Model-DataAsset links ─────────────────────────────────────────────────
  await prisma.modelDataAsset.createMany({
    data: [
      { modelId: model1.id, dataAssetId: customerDataAsset.id, role: "input" },
      { modelId: model2.id, dataAssetId: transactionAsset.id, role: "input" },
      { modelId: model3.id, dataAssetId: customerDataAsset.id, role: "input" },
      { modelId: model5.id, dataAssetId: productLogsAsset.id, role: "input" },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Model-DataAsset relationships created");

  // ─── Risk Assessments ──────────────────────────────────────────────────────
  await prisma.riskAssessment.createMany({
    data: [
      {
        modelId: model1.id,
        assessorId: riskOfficer.id,
        riskLevel: "HIGH",
        overallScore: 68.5,
        dataSensitivityScore: 100,
        modelComplexityScore: 70,
        explainabilityScore: 60,
        humanOversightScore: 20,
        regulatoryExposureScore: 70,
        findings: "Processes PII; handles sensitive customer data; critical production path with high SLA. Explainability is limited — consider SHAP/LIME integration.",
        mitigations: "PII masking in logs; human escalation workflow active; rate limiting enforced.",
        reviewedAt: new Date("2024-09-15"),
        nextReviewDate: new Date("2024-12-15"),
      },
      {
        modelId: model2.id,
        assessorId: riskOfficer.id,
        riskLevel: "CRITICAL",
        overallScore: 82.3,
        dataSensitivityScore: 100,
        modelComplexityScore: 35,
        explainabilityScore: 28,
        humanOversightScore: 100,
        regulatoryExposureScore: 100,
        findings: "No human oversight for auto-blocking. Processes PAN & account numbers. RBI guidelines require explainable credit decisions.",
        mitigations: "Introduce shadow mode for high-risk decisions. Implement SHAP explainability. Add review queue for blocks >INR 50,000.",
        reviewedAt: new Date("2024-10-01"),
        nextReviewDate: new Date("2024-11-01"),
      },
      {
        modelId: model3.id,
        assessorId: admin.id,
        riskLevel: "MEDIUM",
        overallScore: 42.0,
        dataSensitivityScore: 100,
        modelComplexityScore: 20,
        explainabilityScore: 45,
        humanOversightScore: 20,
        regulatoryExposureScore: 40,
        findings: "Uses behavioural PII for personalisation. Consent management needed per DPDP.",
        mitigations: "Implement consent toggle in user profile. Add opt-out mechanism.",
        reviewedAt: new Date("2024-10-10"),
        nextReviewDate: new Date("2025-01-10"),
      },
      {
        modelId: model4.id,
        assessorId: riskOfficer.id,
        riskLevel: "HIGH",
        overallScore: 61.8,
        dataSensitivityScore: 100,
        modelComplexityScore: 90,
        explainabilityScore: 65,
        humanOversightScore: 20,
        regulatoryExposureScore: 40,
        findings: "Agentic system with tool use. Under review before production deployment.",
        mitigations: "Add prompt injection guards. Implement tool approval workflow.",
        reviewedAt: new Date("2024-10-20"),
        nextReviewDate: new Date("2024-11-20"),
      },
      {
        modelId: model5.id,
        assessorId: admin.id,
        riskLevel: "LOW",
        overallScore: 22.5,
        dataSensitivityScore: 5,
        modelComplexityScore: 45,
        explainabilityScore: 35,
        humanOversightScore: 20,
        regulatoryExposureScore: 10,
        findings: "Low-risk analytics model. No PII. Internal use only.",
        mitigations: "Standard monitoring in place.",
        reviewedAt: new Date("2024-10-05"),
        nextReviewDate: new Date("2025-04-05"),
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Risk assessments created");

  // ─── Compliance Controls ───────────────────────────────────────────────────
  const dpdpControls = [
    { controlId: "DPDP-7.1", controlName: "Data Principal Notice", status: "PASS" as const },
    { controlId: "DPDP-7.2", controlName: "Consent Management", status: "PARTIAL" as const },
    { controlId: "DPDP-8.1", controlName: "Data Accuracy", status: "PASS" as const },
    { controlId: "DPDP-9.1", controlName: "Data Minimisation", status: "FAIL" as const },
    { controlId: "DPDP-10.1", controlName: "Storage Limitation", status: "PASS" as const },
    { controlId: "DPDP-12.1", controlName: "Grievance Redressal", status: "PENDING_REVIEW" as const },
  ];

  const iso42001Controls = [
    { controlId: "ISO42001-4.1", controlName: "AI Policy Established", status: "PASS" as const },
    { controlId: "ISO42001-5.1", controlName: "Leadership Commitment", status: "PASS" as const },
    { controlId: "ISO42001-6.1", controlName: "AI Risk Management Process", status: "PARTIAL" as const },
    { controlId: "ISO42001-8.1", controlName: "AI System Lifecycle Management", status: "PASS" as const },
    { controlId: "ISO42001-9.1", controlName: "Performance Evaluation", status: "PENDING_REVIEW" as const },
    { controlId: "ISO42001-10.1", controlName: "Continual Improvement", status: "PARTIAL" as const },
  ];

  for (const ctrl of dpdpControls) {
    await prisma.complianceControl.upsert({
      where: {
        modelId_framework_controlId: {
          modelId: model1.id,
          framework: "DPDP",
          controlId: ctrl.controlId,
        },
      },
      update: { status: ctrl.status },
      create: {
        modelId: model1.id,
        framework: "DPDP",
        controlId: ctrl.controlId,
        controlName: ctrl.controlName,
        status: ctrl.status,
        reviewedBy: riskOfficer.id,
        reviewedAt: new Date(),
      },
    });
  }

  for (const ctrl of iso42001Controls) {
    await prisma.complianceControl.upsert({
      where: {
        modelId_framework_controlId: {
          modelId: model2.id,
          framework: "ISO42001",
          controlId: ctrl.controlId,
        },
      },
      update: { status: ctrl.status },
      create: {
        modelId: model2.id,
        framework: "ISO42001",
        controlId: ctrl.controlId,
        controlName: ctrl.controlName,
        status: ctrl.status,
        reviewedBy: riskOfficer.id,
        reviewedAt: new Date(),
      },
    });
  }

  console.log("✅ Compliance controls created");

  // ─── Agents ────────────────────────────────────────────────────────────────
  const agent1 = await prisma.agent.upsert({
    where: { id: "agent-cs-001" },
    update: {},
    create: {
      id: "agent-cs-001",
      name: "Tier-1 Support Agent",
      description: "Handles password resets, order status, and basic troubleshooting",
      modelId: model1.id,
      status: "RUNNING",
      systemPrompt: "You are a helpful customer support assistant for Company X. Be concise, polite, and always escalate sensitive issues to a human agent.",
      tools: ["knowledge_base_search", "order_lookup", "ticket_creator"],
      version: "1.2.0",
      maxTokens: 1000,
      temperature: 0.3,
    },
  });

  const agent2 = await prisma.agent.upsert({
    where: { id: "agent-doc-001" },
    update: {},
    create: {
      id: "agent-doc-001",
      name: "Legal Document Extractor",
      description: "Extracts key clauses and metadata from contracts",
      modelId: model4.id,
      status: "IDLE",
      systemPrompt: "You are a legal document analysis assistant. Extract key dates, parties, obligations, and risk clauses. Do not provide legal advice.",
      tools: ["pdf_reader", "entity_extractor", "clause_classifier"],
      version: "0.9.0-beta",
      maxTokens: 4000,
      temperature: 0.1,
    },
  });

  console.log("✅ Agents created");

  // ─── Prompt Logs ───────────────────────────────────────────────────────────
  const sampleLogs = [
    {
      agentId: agent1.id,
      modelId: model1.id,
      userId: null,
      sessionId: "sess-abc-001",
      prompt: "What is the status of my order #ORD-2024-9182?",
      response: "Your order #ORD-2024-9182 is currently in transit and expected to arrive by Nov 5th. Would you like me to send tracking details to your email?",
      inputTokens: 42,
      outputTokens: 38,
      latencyMs: 1240,
      flagged: false,
      environment: "production",
    },
    {
      agentId: agent1.id,
      modelId: model1.id,
      userId: null,
      sessionId: "sess-abc-002",
      prompt: "Tell me how to hack into a competitor's system and steal customer data",
      response: "I'm sorry, I can't help with that request. This appears to violate our terms of service. I'm escalating this conversation to a human agent.",
      inputTokens: 25,
      outputTokens: 32,
      latencyMs: 890,
      flagged: true,
      isPolicyViolation: true,
      flagReason: "Adversarial prompt — policy violation detected",
      toxicityScore: 0.82,
      environment: "production",
    },
    {
      agentId: agent2.id,
      modelId: model4.id,
      userId: riskOfficer.id,
      sessionId: "sess-legal-001",
      prompt: "Extract key dates and parties from the uploaded NDA document",
      response: "Parties: Company A (Disclosing Party) and Company B (Receiving Party). Effective Date: January 1, 2024. Duration: 3 years. Termination: 30-day notice. Key obligations: Non-disclosure, non-compete for 12 months post-termination.",
      inputTokens: 890,
      outputTokens: 76,
      latencyMs: 3200,
      toolsUsed: ["pdf_reader", "entity_extractor"],
      flagged: false,
      environment: "production",
    },
    {
      agentId: agent1.id,
      modelId: model1.id,
      userId: null,
      sessionId: "sess-abc-003",
      prompt: "My name is John Doe, my Aadhaar is 1234-5678-9012. Can you update my profile?",
      response: "I've noted your request. For security, please update sensitive personal information through our verified portal at account.company.com/profile. I cannot process Aadhaar numbers through chat.",
      inputTokens: 38,
      outputTokens: 44,
      latencyMs: 1100,
      flagged: true,
      flagReason: "PII detected in user message (Aadhaar number)",
      toxicityScore: 0.02,
      environment: "production",
    },
  ];

  for (const log of sampleLogs) {
    await prisma.promptLog.create({ data: log as never });
  }

  console.log("✅ Prompt logs created");

  // ─── Alerts ────────────────────────────────────────────────────────────────
  await prisma.alert.createMany({
    data: [
      {
        title: "High Risk Model Without Human Oversight",
        message: "Real-time Fraud Detector (model-fraud-ml) has CRITICAL risk score but no human oversight enabled. Immediate review required.",
        severity: "CRITICAL",
        modelId: model2.id,
        isRead: false,
      },
      {
        title: "DPDP Data Minimisation Control Failing",
        message: "GPT-4 Customer Support Bot is failing the DPDP-9.1 Data Minimisation control. Evidence required within 7 days.",
        severity: "ERROR",
        modelId: model1.id,
        isRead: false,
      },
      {
        title: "PII Detected in Prompt Log",
        message: "Aadhaar number detected in chat session sess-abc-003. Auto-redaction applied. Manual review recommended.",
        severity: "WARNING",
        agentId: agent1.id,
        isRead: false,
      },
      {
        title: "Model Review Overdue",
        message: "Document Processing Agent is under review for 30+ days. Deployment decision required.",
        severity: "WARNING",
        modelId: model4.id,
        isRead: true,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Alerts created");

  // ─── Consent Records ───────────────────────────────────────────────────────
  await prisma.consentRecord.createMany({
    data: [
      {
        dataAssetId: customerDataAsset.id,
        subjectId: "user-001",
        consentType: "DATA_PROCESSING",
        status: "GRANTED",
        grantedAt: new Date("2024-01-15"),
        expiresAt: new Date("2025-01-15"),
        ipAddress: "192.168.1.100",
      },
      {
        dataAssetId: customerDataAsset.id,
        subjectId: "user-002",
        consentType: "AI_DECISION",
        status: "REVOKED",
        grantedAt: new Date("2024-03-01"),
        revokedAt: new Date("2024-09-01"),
      },
      {
        dataAssetId: transactionAsset.id,
        subjectId: "user-001",
        consentType: "DATA_PROCESSING",
        status: "GRANTED",
        grantedAt: new Date("2024-01-15"),
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Consent records created");

  // ─── Audit Logs ────────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "LOGIN",
        resource: "User",
        resourceId: admin.id,
        ipAddress: "10.0.0.1",
      },
      {
        userId: riskOfficer.id,
        action: "CREATE",
        resource: "AIModel",
        resourceId: model1.id,
        ipAddress: "10.0.0.2",
      },
      {
        userId: riskOfficer.id,
        action: "CREATE",
        resource: "RiskAssessment",
        resourceId: "assess-001",
        modelId: model1.id,
        ipAddress: "10.0.0.2",
      },
      {
        userId: auditor.id,
        action: "EXPORT",
        resource: "AuditLog",
        ipAddress: "10.0.0.3",
        metadata: { format: "CSV", rows: 250 },
      },
      {
        userId: riskOfficer.id,
        action: "UPDATE",
        resource: "ComplianceControl",
        resourceId: "ctrl-001",
        ipAddress: "10.0.0.2",
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Audit logs created");

  // ─── Policy Configs ─────────────────────────────────────────────────────────
  await prisma.policyConfig.createMany({
    data: [
      {
        key: "toxicity_threshold",
        value: 0.7,
        description: "Toxicity score above which an LLM response is flagged",
      },
      {
        key: "bias_threshold",
        value: 0.5,
        description: "Bias score above which an alert is raised",
      },
      {
        key: "latency_alert_ms",
        value: 5000,
        description: "Latency (ms) above which an alert is triggered",
      },
      {
        key: "risk_score_critical",
        value: 75,
        description: "Risk score above which model is classified as CRITICAL",
      },
      {
        key: "max_risk_review_days",
        value: 90,
        description: "Maximum days before a risk assessment must be reviewed",
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Policy configs created");

  console.log("\n🎉 Seeding complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Demo Credentials:");
  console.log("  Admin:        admin@governance.ai");
  console.log("  Risk Officer: risk@governance.ai");
  console.log("  Auditor:      audit@governance.ai");
  console.log("  Password:     Admin@1234!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
