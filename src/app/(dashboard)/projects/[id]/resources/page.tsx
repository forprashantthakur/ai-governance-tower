"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProjectResource, ResourceRole } from "@/types";

const ROLE_COLORS: Record<ResourceRole, string> = {
  LEAD: "text-amber-400 bg-amber-400/10",
  CONTRIBUTOR: "text-blue-400 bg-blue-400/10",
  REVIEWER: "text-purple-400 bg-purple-400/10",
  STAKEHOLDER: "text-teal-400 bg-teal-400/10",
  OBSERVER: "text-slate-400 bg-slate-400/10",
};

export default function ResourcesPage() {
  const params = useParams<{ id: string }>();
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [form, setForm] = useState({ userId: "", role: "CONTRIBUTOR" as ResourceRole, allocationPct: 50 });
  const [saving, setSaving] = useState(false);
  const getH = () => ({ Authorization: `Bearer ${JSON.parse(localStorage.getItem("ai-governance-auth") ?? "{}").state?.token ?? ""}` });

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${params.id}/resources`, { headers: getH() }),
      fetch("/api/auth/me", { headers: getH() }),
    ])
      .then(([r1, r2]) => Promise.all([r1.json(), r2.json()]))
      .then(([res, me]) => {
        setResources(res.data ?? []);
        setLoading(false);
      });

    // Fetch all users for picker (use models endpoint as proxy or auth/me)
    // For simplicity, show existing resources + manual userId input
  }, [params.id]);

  async function addResource() {
    if (!form.userId.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${params.id}/resources`, {
        method: "POST",
        headers: { ...getH(), "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.data) setResources((r) => [...r, data.data]);
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  }

  async function removeResource(rid: string) {
    await fetch(`/api/projects/${params.id}/resources/${rid}`, { method: "DELETE", headers: getH() });
    setResources((r) => r.filter((x) => x.id !== rid));
  }

  async function updateAllocation(rid: string, allocationPct: number) {
    await fetch(`/api/projects/${params.id}/resources/${rid}`, {
      method: "PATCH",
      headers: { ...getH(), "Content-Type": "application/json" },
      body: JSON.stringify({ allocationPct }),
    });
    setResources((r) => r.map((x) => (x.id === rid ? { ...x, allocationPct } : x)));
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold">Team Resources</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage team allocations across this project
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowAdd(true)}>
          <UserPlus className="h-4 w-4" /> Add Member
        </Button>
      </div>

      {/* Add member form */}
      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold">Add Team Member</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">User ID</Label>
              <Input
                placeholder="Paste user ID"
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <select
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as ResourceRole }))}
              >
                {["LEAD", "CONTRIBUTOR", "REVIEWER", "STAKEHOLDER", "OBSERVER"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Allocation %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.allocationPct}
                onChange={(e) => setForm((f) => ({ ...f, allocationPct: parseInt(e.target.value) }))}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addResource} disabled={saving}>
              {saving ? "Adding…" : "Add"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Resource table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No team members added yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {r.user?.name?.[0] ?? "?"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.user?.name ?? r.userId}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[r.role]}`}>
                    {r.role}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{r.user?.email}</div>
              </div>

              {/* Allocation */}
              <div className="flex items-center gap-3 min-w-[160px]">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Allocation</span>
                    <span className="font-medium">{r.allocationPct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${r.allocationPct}%` }}
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={r.allocationPct}
                  onChange={(e) => updateAllocation(r.id, parseInt(e.target.value))}
                  className="w-16 accent-primary"
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-400"
                onClick={() => removeResource(r.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
