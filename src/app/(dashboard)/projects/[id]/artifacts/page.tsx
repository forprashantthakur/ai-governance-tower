"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Upload, Archive, FileText, FileCode, FileJson, File,
  Package, Database, ShieldCheck, BookOpen, Pencil, Trash2,
  Download, X, Search, ChevronDown, Loader2, Plus,
} from "lucide-react";
import type { ProjectArtifact, ArtifactCategory } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ArtifactCategory | "ALL"; label: string }[] = [
  { value: "ALL",                label: "All" },
  { value: "BRD",                label: "BRD" },
  { value: "FRD",                label: "FRD" },
  { value: "PROJECT_PLAN",       label: "Project Plan" },
  { value: "BUSINESS_CASE",      label: "Business Case" },
  { value: "DESIGN_DOCUMENT",    label: "Design Doc" },
  { value: "TEST_CASES",         label: "Test Cases" },
  { value: "MODEL_ARTIFACT",     label: "Model Artifact" },
  { value: "TRAINING_DATA",      label: "Training Data" },
  { value: "EVALUATION_REPORT",  label: "Evaluation Report" },
  { value: "COMPLIANCE_EVIDENCE",label: "Compliance Evidence" },
  { value: "OTHER",              label: "Other" },
];

const CATEGORY_LABELS: Record<ArtifactCategory, string> = {
  BRD:                 "BRD",
  FRD:                 "FRD",
  PROJECT_PLAN:        "Project Plan",
  BUSINESS_CASE:       "Business Case",
  DESIGN_DOCUMENT:     "Design Doc",
  TEST_CASES:          "Test Cases",
  MODEL_ARTIFACT:      "Model Artifact",
  TRAINING_DATA:       "Training Data",
  EVALUATION_REPORT:   "Evaluation Report",
  COMPLIANCE_EVIDENCE: "Compliance Evidence",
  OTHER:               "Other",
};

const CATEGORY_COLORS: Record<ArtifactCategory, string> = {
  BRD:                 "text-blue-400 bg-blue-400/10",
  FRD:                 "text-purple-400 bg-purple-400/10",
  PROJECT_PLAN:        "text-cyan-400 bg-cyan-400/10",
  BUSINESS_CASE:       "text-green-400 bg-green-400/10",
  DESIGN_DOCUMENT:     "text-orange-400 bg-orange-400/10",
  TEST_CASES:          "text-yellow-400 bg-yellow-400/10",
  MODEL_ARTIFACT:      "text-rose-400 bg-rose-400/10",
  TRAINING_DATA:       "text-pink-400 bg-pink-400/10",
  EVALUATION_REPORT:   "text-indigo-400 bg-indigo-400/10",
  COMPLIANCE_EVIDENCE: "text-emerald-400 bg-emerald-400/10",
  OTHER:               "text-slate-400 bg-slate-400/10",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const cls = "h-5 w-5 shrink-0";
  if (mimeType === "application/pdf") return <FileText className={`${cls} text-red-400`} />;
  if (mimeType.includes("word") || mimeType.includes("document")) return <FileText className={`${cls} text-blue-400`} />;
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet") || mimeType === "text/csv") return <FileText className={`${cls} text-green-400`} />;
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return <FileText className={`${cls} text-orange-400`} />;
  if (mimeType === "application/json" || mimeType.includes("yaml")) return <FileJson className={`${cls} text-yellow-400`} />;
  if (mimeType === "text/plain" || mimeType === "text/markdown") return <FileCode className={`${cls} text-slate-400`} />;
  if (mimeType === "application/zip" || mimeType.includes("tar") || mimeType.includes("gzip")) return <Package className={`${cls} text-purple-400`} />;
  if (mimeType === "application/octet-stream") return <Database className={`${cls} text-rose-400`} />;
  if (mimeType.startsWith("image/")) return <File className={`${cls} text-cyan-400`} />;
  return <File className={`${cls} text-slate-400`} />;
}

function getToken(): string {
  try {
    return JSON.parse(localStorage.getItem("ai-governance-auth") ?? "{}").state?.token ?? "";
  } catch {
    return "";
  }
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  projectId: string;
  onClose: () => void;
  onUploaded: (artifact: ProjectArtifact) => void;
}

function UploadModal({ projectId, onClose, onUploaded }: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<ArtifactCategory>("OTHER");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (f: File) => {
    setSelectedFile(f);
    setError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  async function upload() {
    if (!selectedFile) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("category", category);
      if (description) fd.append("description", description);
      if (version) fd.append("version", version);
      if (tags) fd.append("tags", tags);

      const res = await fetch(`/api/projects/${projectId}/artifacts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      onUploaded(data.data);
      onClose();
    } catch {
      setError("Network error — please try again");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-sm">Upload Artifact</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragging
                ? "border-primary bg-primary/5"
                : selectedFile
                ? "border-green-500/50 bg-green-500/5"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileIcon mimeType={selectedFile.type || "application/octet-stream"} />
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium truncate max-w-xs">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drop a file here or <span className="text-primary">click to browse</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Word, Excel, CSV, JSON, YAML, images, pickle, ONNX, HDF5, ZIP · Max 50 MB
                </p>
              </>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ArtifactCategory)}
                className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm appearance-none pr-8"
              >
                {CATEGORIES.filter((c) => c.value !== "ALL").map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Version */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Version (optional)</label>
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. v1.2, 2024-Q4"
                className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. draft, approved"
                className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this artifact…"
              rows={2}
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={upload}
            disabled={!selectedFile || uploading}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  artifact: ProjectArtifact;
  projectId: string;
  onClose: () => void;
  onUpdated: (artifact: ProjectArtifact) => void;
}

function EditModal({ artifact, projectId, onClose, onUpdated }: EditModalProps) {
  const [name, setName] = useState(artifact.name);
  const [category, setCategory] = useState<ArtifactCategory>(artifact.category);
  const [description, setDescription] = useState(artifact.description ?? "");
  const [version, setVersion] = useState(artifact.version ?? "");
  const [tags, setTags] = useState(artifact.tags.join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/artifacts/${artifact.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          category,
          description: description || null,
          version: version || null,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        return;
      }
      onUpdated(data.data);
      onClose();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-sm">Edit Artifact</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">File name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ArtifactCategory)}
                className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm appearance-none pr-8"
              >
                {CATEGORIES.filter((c) => c.value !== "ALL").map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Version</label>
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. v1.2"
                className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tags</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="comma-separated"
                className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!name.trim() || saving}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

interface DeleteConfirmProps {
  artifact: ProjectArtifact;
  projectId: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

function DeleteConfirm({ artifact, projectId, onClose, onDeleted }: DeleteConfirmProps) {
  const [deleting, setDeleting] = useState(false);

  async function doDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/projects/${projectId}/artifacts/${artifact.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      onDeleted(artifact.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-red-400/10 p-2">
            <Trash2 className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Delete Artifact</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Are you sure you want to delete <strong className="text-foreground">{artifact.name}</strong>? This will permanently remove the file from storage.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={doDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ArtifactsPage() {
  const params = useParams<{ id: string }>();
  const [artifacts, setArtifacts] = useState<ProjectArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ArtifactCategory | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [editing, setEditing] = useState<ProjectArtifact | null>(null);
  const [deleting, setDeleting] = useState<ProjectArtifact | null>(null);

  const fetchArtifacts = useCallback(() => {
    const qs = new URLSearchParams();
    if (activeCategory !== "ALL") qs.set("category", activeCategory);
    if (search) qs.set("q", search);
    fetch(`/api/projects/${params.id}/artifacts?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setArtifacts(d.data?.artifacts ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id, activeCategory, search]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(fetchArtifacts, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchArtifacts]);

  // Count per category for chip badges (from full unfiltered list)
  const [allArtifacts, setAllArtifacts] = useState<ProjectArtifact[]>([]);
  useEffect(() => {
    fetch(`/api/projects/${params.id}/artifacts`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((d) => setAllArtifacts(d.data?.artifacts ?? []));
  }, [params.id]);

  const counts = allArtifacts.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1;
    return acc;
  }, {});

  const visibleCategories = CATEGORIES.filter(
    (c) => c.value === "ALL" || c.value === activeCategory || (counts[c.value] ?? 0) > 0
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold flex items-center gap-2">
            <Archive className="h-4 w-4 text-muted-foreground" />
            Project Artifacts
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Store and manage all project documents, model files, and compliance evidence
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Upload Artifact
        </button>
      </div>

      {/* Category chips + search */}
      <div className="flex items-center gap-2 flex-wrap">
        {visibleCategories.map((c) => (
          <button
            key={c.value}
            onClick={() => setActiveCategory(c.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              activeCategory === c.value
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-muted text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            {c.label}
            {c.value !== "ALL" && (counts[c.value] ?? 0) > 0 && (
              <span className="text-[10px] opacity-70">{counts[c.value]}</span>
            )}
            {c.value === "ALL" && (
              <span className="text-[10px] opacity-70">{allArtifacts.length}</span>
            )}
          </button>
        ))}

        {/* Search */}
        <div className="ml-auto flex items-center gap-2 bg-muted border border-border rounded-md px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search artifacts…"
            className="bg-transparent text-xs outline-none w-40"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : artifacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Archive className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-sm mb-1">No artifacts yet</h3>
          <p className="text-xs text-muted-foreground max-w-xs">
            {search || activeCategory !== "ALL"
              ? "No artifacts match your filter. Try clearing the search or category."
              : "Upload project documents, model files, and compliance evidence to keep everything in one place."}
          </p>
          {!search && activeCategory === "ALL" && (
            <button
              onClick={() => setShowUpload(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload your first artifact
            </button>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">File</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Version</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Uploaded by</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Size</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {artifacts.map((artifact) => (
                <tr key={artifact.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileIcon mimeType={artifact.mimeType} />
                      <div className="min-w-0">
                        <p className="font-medium text-xs truncate max-w-xs">{artifact.name}</p>
                        {artifact.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                            {artifact.description}
                          </p>
                        )}
                        {artifact.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {artifact.tags.map((t) => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[artifact.category]}`}>
                      {CATEGORY_LABELS[artifact.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">{artifact.version ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {artifact.uploader?.name ?? artifact.uploadedBy.slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {new Date(artifact.uploadedAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{formatBytes(artifact.size)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={artifact.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download"
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => setEditing(artifact)}
                        title="Edit"
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleting(artifact)}
                        title="Delete"
                        className="p-1.5 rounded hover:bg-red-400/10 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showUpload && (
        <UploadModal
          projectId={params.id}
          onClose={() => setShowUpload(false)}
          onUploaded={(a) => {
            setArtifacts((prev) => [a, ...prev]);
            setAllArtifacts((prev) => [a, ...prev]);
          }}
        />
      )}
      {editing && (
        <EditModal
          artifact={editing}
          projectId={params.id}
          onClose={() => setEditing(null)}
          onUpdated={(updated) => {
            setArtifacts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            setAllArtifacts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <DeleteConfirm
          artifact={deleting}
          projectId={params.id}
          onClose={() => setDeleting(null)}
          onDeleted={(id) => {
            setArtifacts((prev) => prev.filter((a) => a.id !== id));
            setAllArtifacts((prev) => prev.filter((a) => a.id !== id));
          }}
        />
      )}
    </div>
  );
}
