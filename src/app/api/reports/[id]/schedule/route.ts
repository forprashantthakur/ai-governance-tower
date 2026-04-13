import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, notFound, noContent, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const ScheduleSchema = z.object({
  frequency: z.enum(["DAILY","WEEKLY","MONTHLY"]),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  sendTime: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
  recipients: z.array(z.string().email()).min(1),
  isActive: z.boolean().default(true),
});

function computeNextRun(frequency: string, dayOfWeek: number|null, dayOfMonth: number|null, sendTime: string): Date {
  const [h, m] = sendTime.split(":").map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (frequency === "DAILY") { if (next <= now) next.setDate(next.getDate()+1); }
  else if (frequency === "WEEKLY") {
    const dow = dayOfWeek ?? 1;
    const diff = (dow - now.getDay() + 7) % 7 || 7;
    next.setDate(now.getDate()+diff); next.setHours(h,m,0,0);
  } else {
    const dom = dayOfMonth ?? 1;
    next.setDate(dom); if (next <= now) { next.setMonth(next.getMonth()+1); next.setDate(dom); }
    next.setHours(h,m,0,0);
  }
  return next;
}

export const GET = withAuth(async (_req: NextRequest, { params }) => {
  try {
    const schedules = await prisma.reportSchedule.findMany({ where: { reportId: params.id } }).catch(() => []);
    return ok(schedules);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, { params }) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: params.id } }).catch(() => null);
    if (!report) return notFound("Report");
    const body = await req.json();
    const parsed = ScheduleSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const { frequency, dayOfWeek, dayOfMonth, sendTime, recipients, isActive } = parsed.data;
    const nextRunAt = computeNextRun(frequency, dayOfWeek??null, dayOfMonth??null, sendTime);
    // Upsert: one schedule per report
    await prisma.reportSchedule.deleteMany({ where: { reportId: params.id } }).catch(() => {});
    const schedule = await prisma.reportSchedule.create({
      data: { reportId: params.id, frequency, dayOfWeek, dayOfMonth, sendTime, recipients, isActive, nextRunAt },
    });
    return created(schedule);
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");

export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
  try {
    await prisma.reportSchedule.deleteMany({ where: { reportId: params.id } }).catch(() => {});
    return noContent();
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");
