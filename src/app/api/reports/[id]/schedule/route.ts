import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, notFound, noContent, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const ScheduleSchema = z.object({
  frequency: z.enum(["DAILY","WEEKLY","MONTHLY"]),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  sendTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("09:00"),
  recipients: z.array(z.string().email()).min(1).max(50),
  isActive: z.boolean().default(true),
});

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Next run time in UTC. Days 29–31 fall back to the last day of shorter months. */
function computeNextRun(frequency: string, dayOfWeek: number|null, dayOfMonth: number|null, sendTime: string): Date {
  const [h, m] = sendTime.split(":").map(Number);
  const now = new Date();
  const at = (y: number, mo: number, d: number) => new Date(Date.UTC(y, mo, d, h, m, 0, 0));
  const y = now.getUTCFullYear(), mo = now.getUTCMonth(), d = now.getUTCDate();

  if (frequency === "DAILY") {
    const t = at(y, mo, d);
    return t > now ? t : at(y, mo, d + 1);
  }
  if (frequency === "WEEKLY") {
    const dow = dayOfWeek ?? 1;
    const diff = (dow - now.getUTCDay() + 7) % 7;
    const t = at(y, mo, d + diff);
    return t > now ? t : at(y, mo, d + diff + 7);
  }
  const dom = dayOfMonth ?? 1;
  const thisMonth = at(y, mo, Math.min(dom, daysInMonth(y, mo)));
  if (thisMonth > now) return thisMonth;
  const ny = mo === 11 ? y + 1 : y, nm = (mo + 1) % 12;
  return at(ny, nm, Math.min(dom, daysInMonth(ny, nm)));
}

async function reportInOrg(reportId: string, organizationId: string) {
  return prisma.report.findFirst({ where: { id: reportId, organizationId }, select: { id: true } });
}

export const GET = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    if (!(await reportInOrg(params.id, organizationId))) return notFound("Report");
    const schedules = await prisma.reportSchedule.findMany({ where: { reportId: params.id } });
    return ok(schedules);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    const report = await reportInOrg(params.id, organizationId);
    if (!report) return notFound("Report");
    const body = await req.json();
    const parsed = ScheduleSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const { frequency, dayOfWeek, dayOfMonth, sendTime, recipients, isActive } = parsed.data;
    const nextRunAt = computeNextRun(frequency, dayOfWeek??null, dayOfMonth??null, sendTime);
    // Upsert: one schedule per report
    const [, schedule] = await prisma.$transaction([
      prisma.reportSchedule.deleteMany({ where: { reportId: report.id } }),
      prisma.reportSchedule.create({
        data: { reportId: report.id, frequency, dayOfWeek, dayOfMonth, sendTime, recipients, isActive, nextRunAt },
      }),
    ]);
    return created(schedule);
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");

export const DELETE = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    if (!(await reportInOrg(params.id, organizationId))) return notFound("Report");
    await prisma.reportSchedule.deleteMany({ where: { reportId: params.id } });
    return noContent();
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");
