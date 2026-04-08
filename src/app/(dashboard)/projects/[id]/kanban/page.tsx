"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Plus, AlertTriangle, Clock, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProjectTask, TaskStatus, TaskPriority } from "@/types";
import { useProjectStore } from "@/store/project.store";

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "BACKLOG", label: "Backlog", color: "text-slate-400" },
  { status: "TODO", label: "To Do", color: "text-blue-400" },
  { status: "IN_PROGRESS", label: "In Progress", color: "text-amber-400" },
  { status: "REVIEW", label: "Review", color: "text-purple-400" },
  { status: "DONE", label: "Done", color: "text-green-400" },
  { status: "BLOCKED", label: "Blocked", color: "text-red-400" },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "text-slate-400",
  MEDIUM: "text-blue-400",
  HIGH: "text-amber-400",
  CRITICAL: "text-red-400",
};

const PHASE_COLORS: Record<string, string> = {
  BUSINESS_CASE: "#6366f1",
  DATA_DISCOVERY: "#0ea5e9",
  MODEL_DEVELOPMENT: "#8b5cf6",
  TESTING_VALIDATION: "#f59e0b",
  DEPLOYMENT: "#10b981",
  MONITORING: "#06b6d4",
};

function TaskCard({
  task,
  onDragStart,
}: {
  task: ProjectTask;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className="bg-background border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all hover:shadow-md select-none"
    >
      {/* Phase stripe */}
      <div
        className="w-full h-0.5 rounded-full mb-2"
        style={{ background: PHASE_COLORS[task.phase] ?? "#64748b" }}
      />

      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <Flag className={`h-3 w-3 shrink-0 mt-0.5 ${PRIORITY_COLORS[task.priority]}`} />
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
        <span className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-sm"
            style={{ background: PHASE_COLORS[task.phase] ?? "#64748b" }}
          />
          {task.phase.replace(/_/g, " ")}
        </span>
        <div className="flex items-center gap-2">
          {task.estimatedHrs && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.estimatedHrs}h
            </span>
          )}
          {isOverdue && <AlertTriangle className="h-3 w-3 text-red-400" />}
        </div>
      </div>

      {task.dueDate && (
        <div className={`text-xs mt-1 ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>
          Due {new Date(task.dueDate).toLocaleDateString()}
        </div>
      )}
      {task.assignee && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
            {task.assignee.name[0]}
          </div>
          <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
        </div>
      )}
    </div>
  );
}

export default function KanbanPage() {
  const params = useParams<{ id: string }>();
  const { kanbanTasks, setKanbanTasks, updateTaskStatus } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  useEffect(() => {
    fetch(`/api/projects/${params.id}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setKanbanTasks(d.data ?? []);
        setLoading(false);
      });
  }, [params.id, token]);

  function onDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    if (!draggingId) return;
    const prev = kanbanTasks.find((t) => t.id === draggingId)?.status;
    if (prev === status) { setDraggingId(null); return; }

    updateTaskStatus(draggingId, status);
    setDraggingId(null);

    fetch(`/api/projects/${params.id}/tasks/${draggingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    }).catch(() => {
      if (prev) updateTaskStatus(draggingId!, prev); // revert on error
    });
  }

  async function addTask(status: TaskStatus) {
    if (!newTaskTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${params.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          status,
          phase: "MODEL_DEVELOPMENT",
          priority: "MEDIUM",
        }),
      });
      const data = await res.json();
      if (data.data) setKanbanTasks([...kanbanTasks, data.data]);
    } finally {
      setNewTaskTitle("");
      setAddingTo(null);
      setSaving(false);
    }
  }

  return (
    <div className="p-4 h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Kanban Board</h2>
        <span className="text-xs text-muted-foreground">{kanbanTasks.length} tasks</span>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLUMNS.map((c) => (
            <div key={c.status} className="w-64 shrink-0 h-64 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 flex-1 items-start">
          {COLUMNS.map((col) => {
            const colTasks = kanbanTasks.filter((t) => t.status === col.status);
            return (
              <div
                key={col.status}
                className="w-64 shrink-0 flex flex-col bg-card border border-border rounded-xl overflow-hidden"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, col.status)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                    <span className="text-xs bg-muted text-muted-foreground px-1.5 rounded-full">
                      {colTasks.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => { setAddingTo(col.status); setNewTaskTitle(""); }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px]">
                  {colTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onDragStart={onDragStart} />
                  ))}

                  {/* Add task inline */}
                  {addingTo === col.status && (
                    <div className="bg-background border border-primary/40 rounded-lg p-2 space-y-2">
                      <Input
                        autoFocus
                        placeholder="Task title…"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addTask(col.status);
                          if (e.key === "Escape") setAddingTo(null);
                        }}
                        className="h-7 text-xs"
                      />
                      <div className="flex gap-1">
                        <Button size="sm" className="h-6 text-xs" onClick={() => addTask(col.status)} disabled={saving}>
                          Add
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setAddingTo(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
