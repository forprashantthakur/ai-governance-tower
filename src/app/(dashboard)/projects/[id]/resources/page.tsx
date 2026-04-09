"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UserPlus, Trash2, Search } from "lucide-react";
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

type UserOption = { id: string; name: string; email: string; role: string; department?: string };

export default function ResourcesPage() {
  const params = useParams<{ id: string }>();
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [form, setForm] = useState({ role: "CONTRIBUTOR" as ResourceRole, allocationPct: 50 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const getH = () => ({
    Authorization: `Bearer ${JSON.parse(localStorage.getItem("ai-governance-auth") ?? "{}").state?.token ?? ""}`,
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${params.id}/resources`, { headers: getH() }),
      fetch("/api/users", { headers: getH() }),
    ])
      .then(([r1, r2]) => Promise.all([r1.json(), r2.json()]))
      .then(([res, usersRes]) => {
        setResources(res.data ?? []);
        setUsers(usersRes.data ?? []);
        setLoading(false);
      });
  }, [params.id]);

  const filteredUsers = users.filter(
    (u) =>
      !resources.some((r) => r.userId === u.id) &&
      (u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  async function addResource() {
    if (!selectedUser) {
      setError("Please select a team member");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${params.id}/resources`, {
        method: "POST",
        headers: { ...getH(), "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, role: form.role, allocationPct: form.allocationPct }),
      });
      const data = await res.json();
      if (data.data) {
        setResources((r) => [...r, data.data]);
        setShowAdd(false);
        setSelectedUser(null);
        setUserSearch("");
      } else {
        setError(data.message ?? "Failed to add member");
      }
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
          <p className="text-sm text-muted-foreground mt-1">Manage team allocations across this project</p>
        </div>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => { setShowAdd(true); setError(""); setSelectedUser(null); setUserSearch(""); }}
        >
          <UserPlus className="h-4 w-4" /> Add Member
        </Button>
      </div>

      {/* Add member form */}
      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold">Add Team Member</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* User search dropdown */}
            <div className="space-y-1 sm:col-span-1 relative">
              <Label className="text-xs">Team Member</Label>
              {selectedUser ? (
                <div className="flex items-center gap-2 h-8 px-2 rounded-md border border-input bg-background text-xs">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {selectedUser.name[0]}
                  </div>
                  <span className="flex-1 truncate">{selectedUser.name}</span>
                  <button
                    onClick={() => { setSelectedUser(null); setUserSearch(""); }}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email…"
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    className="h-8 text-xs pl-7"
                  />
                  {showDropdown && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
                      {filteredUsers.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          {users.length === 0 ? "Loading users…" : "No matching users found"}
                        </div>
                      ) : (
                        filteredUsers.map((u) => (
                          <button
                            key={u.id}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent text-left"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedUser(u);
                              setUserSearch(u.name);
                              setShowDropdown(false);
                            }}
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                              {u.name[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{u.name}</div>
                              <div className="text-muted-foreground truncate">{u.email}</div>
                            </div>
                            <span className="ml-auto text-muted-foreground text-[10px] shrink-0">{u.role}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Role */}
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

            {/* Allocation */}
            <div className="space-y-1">
              <Label className="text-xs">Allocation %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.allocationPct}
                onChange={(e) => setForm((f) => ({ ...f, allocationPct: parseInt(e.target.value) || 0 }))}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2">
            <Button size="sm" onClick={addResource} disabled={saving || !selectedUser}>
              {saving ? "Adding…" : "Add Member"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowAdd(false); setError(""); }}>
              Cancel
            </Button>
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
          <p className="text-xs mt-1">
            Click <strong className="text-foreground">Add Member</strong> above to assign team members
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-4 bg-card border border-border rounded-xl px-4 py-3"
            >
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {r.user?.name?.[0] ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.user?.name ?? r.userId}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[r.role]}`}>
                    {r.role}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{r.user?.email}</div>
              </div>
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
