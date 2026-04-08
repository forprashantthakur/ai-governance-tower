"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectTask, Milestone } from "@/types";
import { addDays, differenceInDays, format, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from "date-fns";

const PHASE_COLORS: Record<string, string> = {
  BUSINESS_CASE: "#6366f1",
  DATA_DISCOVERY: "#0ea5e9",
  MODEL_DEVELOPMENT: "#8b5cf6",
  TESTING_VALIDATION: "#f59e0b",
  DEPLOYMENT: "#10b981",
  MONITORING: "#06b6d4",
};

const STATUS_OPACITY: Record<string, number> = {
  DONE: 1,
  IN_PROGRESS: 0.85,
  REVIEW: 0.75,
  TODO: 0.55,
  BACKLOG: 0.4,
  BLOCKED: 0.8,
};

const ZOOM_LEVELS = [
  { label: "Month", daysVisible: 90, dayPx: 8 },
  { label: "Week", daysVisible: 42, dayPx: 20 },
  { label: "Day", daysVisible: 14, dayPx: 60 },
];

interface GanttTask extends ProjectTask {
  startDateParsed: Date;
  endDateParsed: Date;
}

const LABEL_W = 220;
const ROW_H = 38;
const HEADER_H = 54;

export default function GanttPage() {
  const params = useParams<{ id: string }>();
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [zoomIdx, setZoomIdx] = useState(1);
  const [viewStart, setViewStart] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoom = ZOOM_LEVELS[zoomIdx];

  useEffect(() => {
    const token = JSON.parse(localStorage.getItem("ai-governance-auth") ?? "{}").state?.token ?? "";
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`/api/projects/${params.id}/tasks`, { headers: h }),
      fetch(`/api/projects/${params.id}/milestones`, { headers: h }),
    ])
      .then(([r1, r2]) => Promise.all([r1.json(), r2.json()]))
      .then(([t, m]) => {
        const raw: ProjectTask[] = t.data ?? [];
        const parsed: GanttTask[] = raw.map((task) => {
          const start = task.startDate ? new Date(task.startDate) : new Date();
          const end = task.dueDate
            ? new Date(task.dueDate)
            : addDays(start, Math.max(1, Math.ceil((task.estimatedHrs ?? 8) / 8)));
          return { ...task, startDateParsed: start, endDateParsed: end };
        });
        setTasks(parsed);
        setMilestones(m.data ?? []);

        // Set viewStart to earliest task or today
        if (parsed.length > 0) {
          const earliest = parsed.reduce((a, b) =>
            a.startDateParsed < b.startDateParsed ? a : b
          );
          setViewStart(startOfMonth(earliest.startDateParsed));
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const viewEnd = addDays(viewStart, zoom.daysVisible);
  const totalW = zoom.daysVisible * zoom.dayPx;

  function dateToX(d: Date) {
    const diff = differenceInDays(d, viewStart);
    return LABEL_W + diff * zoom.dayPx;
  }

  const months = eachMonthOfInterval({ start: viewStart, end: viewEnd });
  const days = eachDayOfInterval({ start: viewStart, end: viewEnd });
  const today = new Date();
  const totalHeight = HEADER_H + tasks.length * ROW_H + 20;

  return (
    <div className="p-4 h-full flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          {ZOOM_LEVELS.map((z, i) => (
            <button
              key={z.label}
              onClick={() => setZoomIdx(i)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                i === zoomIdx ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8"
          onClick={() => setViewStart((d) => addDays(d, -zoom.daysVisible / 2))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {format(viewStart, "MMM d")} — {format(viewEnd, "MMM d, yyyy")}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8"
          onClick={() => setViewStart((d) => addDays(d, zoom.daysVisible / 2))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="ml-auto text-xs h-8"
          onClick={() => setViewStart(startOfMonth(new Date()))}>
          Today
        </Button>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex-1 bg-card border border-border rounded-xl animate-pulse" />
      ) : (
        <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card relative">
          {/* Fixed label column */}
          <div className="absolute left-0 top-0 bottom-0 w-[220px] z-10 bg-card border-r border-border">
            {/* Label header */}
            <div className="h-[54px] flex items-end px-3 pb-2 border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task</span>
            </div>
            {/* Label rows */}
            {tasks.map((task, i) => (
              <div
                key={task.id}
                className="flex items-center px-3 border-b border-border/40"
                style={{ height: ROW_H, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}
              >
                <div
                  className="w-2 h-2 rounded-sm mr-2 shrink-0"
                  style={{ background: PHASE_COLORS[task.phase] ?? "#64748b" }}
                />
                <span className="text-xs truncate text-foreground/80">{task.title}</span>
              </div>
            ))}
          </div>

          {/* Scrollable chart area */}
          <div ref={scrollRef} className="overflow-x-auto ml-[220px] h-full">
            <svg
              width={totalW}
              height={totalHeight}
              style={{ display: "block", minWidth: totalW }}
            >
              {/* Month headers */}
              {months.map((m) => {
                const x = dateToX(m) - LABEL_W;
                const nextM = addDays(endOfMonth(m), 1);
                const w = Math.min(
                  differenceInDays(nextM, m) * zoom.dayPx,
                  totalW - x
                );
                return (
                  <g key={m.toISOString()}>
                    <rect x={x} y={0} width={w} height={28} fill="rgba(255,255,255,0.03)" />
                    <line x1={x} y1={0} x2={x} y2={HEADER_H} stroke="rgba(255,255,255,0.08)" />
                    <text x={x + 8} y={18} fontSize={11} fill="rgba(255,255,255,0.5)" fontWeight={600}>
                      {format(m, "MMM yyyy")}
                    </text>
                  </g>
                );
              })}

              {/* Day ticks */}
              {days.map((d) => {
                const x = dateToX(d) - LABEL_W;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = differenceInDays(d, today) === 0;
                return (
                  <g key={d.toISOString()}>
                    {isWeekend && (
                      <rect x={x} y={28} width={zoom.dayPx} height={HEADER_H - 28 + totalHeight}
                        fill="rgba(255,255,255,0.01)" />
                    )}
                    <line x1={x} y1={28} x2={x} y2={HEADER_H} stroke="rgba(255,255,255,0.05)" />
                    {zoom.dayPx >= 20 && (
                      <text x={x + zoom.dayPx / 2} y={44} fontSize={9} textAnchor="middle"
                        fill={isToday ? "#60a5fa" : "rgba(255,255,255,0.3)"}>
                        {format(d, "d")}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Alternating row backgrounds */}
              {tasks.map((_, i) => (
                <rect
                  key={i}
                  x={0} y={HEADER_H + i * ROW_H}
                  width={totalW} height={ROW_H}
                  fill={i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)"}
                />
              ))}

              {/* Grid vertical lines */}
              {days.map((d) => {
                const x = dateToX(d) - LABEL_W;
                return (
                  <line key={`vl-${d.toISOString()}`}
                    x1={x} y1={HEADER_H} x2={x} y2={totalHeight}
                    stroke="rgba(255,255,255,0.04)" />
                );
              })}

              {/* Today line */}
              {(() => {
                const x = dateToX(today) - LABEL_W;
                if (x < 0 || x > totalW) return null;
                return (
                  <g>
                    <line x1={x} y1={0} x2={x} y2={totalHeight}
                      stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
                    <text x={x + 4} y={22} fontSize={9} fill="#60a5fa" fontWeight={600}>TODAY</text>
                  </g>
                );
              })()}

              {/* Task bars */}
              {tasks.map((task, i) => {
                const x = dateToX(task.startDateParsed) - LABEL_W;
                const w = Math.max(
                  6,
                  differenceInDays(task.endDateParsed, task.startDateParsed) * zoom.dayPx
                );
                const y = HEADER_H + i * ROW_H + 8;
                const barH = ROW_H - 16;
                const color = PHASE_COLORS[task.phase] ?? "#64748b";
                const opacity = STATUS_OPACITY[task.status] ?? 0.6;

                return (
                  <g key={task.id}>
                    {/* Background bar */}
                    <rect x={x} y={y} width={w} height={barH} rx={4}
                      fill={color} opacity={opacity * 0.3} />
                    {/* Progress fill */}
                    <rect x={x} y={y} width={task.status === "DONE" ? w : w * 0.5} height={barH} rx={4}
                      fill={color} opacity={opacity} />
                    {/* Label inside bar */}
                    {w > 50 && (
                      <text x={x + 6} y={y + barH / 2 + 4} fontSize={10} fill="white" opacity={0.9}>
                        {task.title.slice(0, Math.floor(w / 8))}
                      </text>
                    )}
                    {/* Status indicator */}
                    {task.status === "BLOCKED" && (
                      <text x={x + w - 14} y={y + barH / 2 + 4} fontSize={10} fill="#ef4444">⚠</text>
                    )}
                  </g>
                );
              })}

              {/* Milestone diamonds */}
              {milestones.map((m) => {
                const d = new Date(m.targetDate);
                if (d < viewStart || d > viewEnd) return null;
                const x = dateToX(d) - LABEL_W;
                const cy = HEADER_H - 12;
                const size = 7;
                const isDone = !!m.completedAt;
                return (
                  <g key={m.id}>
                    <polygon
                      points={`${x},${cy - size} ${x + size},${cy} ${x},${cy + size} ${x - size},${cy}`}
                      fill={isDone ? "#10b981" : "#f59e0b"}
                      stroke={isDone ? "#10b981" : "#f59e0b"}
                      strokeWidth={1}
                    />
                    {zoom.dayPx >= 8 && (
                      <text x={x + size + 4} y={cy + 4} fontSize={9} fill={isDone ? "#34d399" : "#fbbf24"}>
                        {m.name.slice(0, 18)}
                      </text>
                    )}
                    <line x1={x} y1={cy + size} x2={x} y2={totalHeight}
                      stroke={isDone ? "#10b981" : "#f59e0b"} strokeWidth={1}
                      strokeDasharray="3 3" opacity={0.4} />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
        {Object.entries(PHASE_COLORS).map(([phase, color]) => (
          <span key={phase} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
            {phase.replace(/_/g, " ")}
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-4">
          <span className="text-amber-400">◆</span> Milestone
        </span>
      </div>
    </div>
  );
}
