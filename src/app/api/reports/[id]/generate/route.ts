import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req: NextRequest, { params }) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: params.id } }).catch(() => null);
    if (!report) return notFound("Report");

    const filters = (report.filters as Record<string, string>) ?? {};
    const fromDate = filters.from ? new Date(filters.from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const toDate = filters.to ? new Date(filters.to) : new Date();
    const dateFilter = { createdAt: { gte: fromDate, lte: toDate } };

    let data: Record<string, unknown> = {};

    if (report.type === "EXECUTIVE_SUMMARY") {
      const [models, latestRisks, complianceSummary, recentAudit, agentCount] = await Promise.all([
        prisma.aIModel.findMany({ select: { type: true, status: true, department: true, isPiiProcessing: true, isCritical: true } }),
        prisma.riskAssessment.findMany({ distinct: ["modelId"], orderBy: { createdAt: "desc" }, select: { riskLevel: true, overallScore: true, modelId: true } }),
        prisma.complianceControl.groupBy({ by: ["status"], _count: { status: true } }).catch(() => []),
        prisma.auditLog.count({ where: dateFilter }).catch(() => 0),
        prisma.agent.count().catch(() => 0),
      ]);
      const byType = models.reduce((a: Record<string,number>, m) => { a[m.type] = (a[m.type]||0)+1; return a; }, {});
      const byStatus = models.reduce((a: Record<string,number>, m) => { a[m.status] = (a[m.status]||0)+1; return a; }, {});
      const byRisk = latestRisks.reduce((a: Record<string,number>, r) => { a[r.riskLevel] = (a[r.riskLevel]||0)+1; return a; }, {});
      const avgRisk = latestRisks.length ? latestRisks.reduce((s,r) => s+r.overallScore, 0)/latestRisks.length : 0;
      const total = complianceSummary.reduce((s,c) => s+c._count.status, 0);
      const passing = complianceSummary.find(c => c.status==="PASS")?._count.status ?? 0;
      data = { totalModels: models.length, activeModels: byStatus["ACTIVE"]||0, agentCount, byType, byStatus, byRisk, avgRiskScore: Math.round(avgRisk*10)/10, complianceScore: total ? Math.round(passing/total*100) : 0, complianceSummary: complianceSummary.map(c=>({status:c.status,count:c._count.status})), recentAuditEvents: recentAudit, piiModels: models.filter(m=>m.isPiiProcessing).length, criticalModels: models.filter(m=>m.isCritical).length };
    }

    if (report.type === "RISK_ASSESSMENT") {
      const assessments = await prisma.riskAssessment.findMany({
        where: dateFilter,
        include: { model: { select: { id: true, name: true, type: true, status: true, department: true } }, assessor: { select: { name: true } } },
        orderBy: { overallScore: "desc" },
      });
      const byRisk = assessments.reduce((a: Record<string,number>, r) => { a[r.riskLevel]=(a[r.riskLevel]||0)+1; return a; }, {});
      const avgScore = assessments.length ? assessments.reduce((s,r)=>s+r.overallScore,0)/assessments.length : 0;
      data = { assessments, byRisk, avgScore: Math.round(avgScore*10)/10, total: assessments.length };
    }

    if (report.type === "COMPLIANCE_STATUS") {
      const controls = await prisma.complianceControl.findMany({
        include: { model: { select: { id: true, name: true, type: true } } },
        orderBy: [{ framework: "asc" }, { status: "asc" }],
      }).catch(() => []);
      const byFramework: Record<string, { PASS:number; FAIL:number; PARTIAL:number; PENDING_REVIEW:number; NOT_APPLICABLE:number }> = {};
      controls.forEach(c => {
        if (!byFramework[c.framework]) byFramework[c.framework] = { PASS:0, FAIL:0, PARTIAL:0, PENDING_REVIEW:0, NOT_APPLICABLE:0 };
        byFramework[c.framework][c.status as keyof typeof byFramework[string]] = (byFramework[c.framework][c.status as keyof typeof byFramework[string]]||0)+1;
      });
      const total = controls.length;
      const passing = controls.filter(c=>c.status==="PASS").length;
      data = { controls, byFramework, total, passing, score: total ? Math.round(passing/total*100) : 0 };
    }

    if (report.type === "AI_INVENTORY") {
      const models = await prisma.aIModel.findMany({
        where: dateFilter,
        include: {
          owner: { select: { name: true } },
          approver: { select: { name: true } },
          riskAssessments: { orderBy: { createdAt: "desc" }, take: 1, select: { riskLevel: true, overallScore: true } },
          _count: { select: { agents: true, promptLogs: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      data = { models, total: models.length };
    }

    if (report.type === "ISO42005_ASSESSMENT") {
      const assessments = await prisma.impactAssessment.findMany({
        include: { model: { select: { id: true, name: true, type: true, status: true } } },
      }).catch(() => []);
      data = { assessments, total: assessments.length };
    }

    return ok({ report, data, generatedAt: new Date().toISOString() });
  } catch (err) { return serverError(err); }
});
