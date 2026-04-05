"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store/ui.store";
import { cn } from "@/lib/utils";
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: "border-green-500/50 bg-green-500/10 text-green-400",
  error: "border-red-500/50 bg-red-500/10 text-red-400",
  warning: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
  info: "border-blue-500/50 bg-blue-500/10 text-blue-400",
};

export function NotificationCenter() {
  const { notifications, removeNotification } = useUIStore();

  useEffect(() => {
    const timers = notifications.map((n) =>
      setTimeout(() => removeNotification(n.id), 5000)
    );
    return () => timers.forEach(clearTimeout);
  }, [notifications, removeNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {notifications.map((n) => {
        const Icon = ICONS[n.type];
        return (
          <div
            key={n.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-fade-in",
              COLORS[n.type]
            )}
          >
            <Icon className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{n.title}</p>
              {n.message && (
                <p className="text-xs opacity-80 mt-0.5 truncate">{n.message}</p>
              )}
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
