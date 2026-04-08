import { create } from "zustand";
import type { Project, ProjectTask, TaskStatus } from "@/types";

interface ProjectState {
  activeProjectId: string | null;
  activeProject: Project | null;
  kanbanTasks: ProjectTask[];
  ganttZoom: "day" | "week" | "month";
  setActiveProject: (p: Project) => void;
  clearActiveProject: () => void;
  setGanttZoom: (z: "day" | "week" | "month") => void;
  setKanbanTasks: (tasks: ProjectTask[]) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  activeProjectId: null,
  activeProject: null,
  kanbanTasks: [],
  ganttZoom: "week",

  setActiveProject: (p) =>
    set({ activeProject: p, activeProjectId: p.id }),

  clearActiveProject: () =>
    set({ activeProject: null, activeProjectId: null, kanbanTasks: [] }),

  setGanttZoom: (z) => set({ ganttZoom: z }),

  setKanbanTasks: (tasks) => set({ kanbanTasks: tasks }),

  updateTaskStatus: (taskId, status) =>
    set((state) => ({
      kanbanTasks: state.kanbanTasks.map((t) =>
        t.id === taskId ? { ...t, status } : t
      ),
    })),
}));
