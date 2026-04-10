"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, FileText, Trash2, ExternalLink, Loader2, Paperclip } from "lucide-react";
import { useApi } from "@/hooks/use-api";

interface EvidenceFile {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  section?: string;
  description?: string;
  uploadedAt: string;
}

interface EvidenceUploadProps {
  /** Attach files to a compliance control */
  controlId?: string;
  /** Attach files to a risk assessment */
  riskId?: string;
  /** Attach files to an AI model */
  modelId?: string;
  /** Attach files to a data asset */
  dataAssetId?: string;
  /** ISO clause reference e.g. "5.3.4" */
  section?: string;
  /** Label shown above the drop zone */
  label?: string;
  /** Compact single-row mode for table cells */
  compact?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(mime: string): string {
  if (mime === "application/pdf") return "📄";
  if (mime.includes("word")) return "📝";
  if (mime.includes("sheet") || mime.includes("excel") || mime === "text/csv") return "📊";
  if (mime.startsWith("image/")) return "🖼️";
  return "📎";
}

export function EvidenceUpload({
  controlId,
  riskId,
  modelId,
  dataAssetId,
  section,
  label = "Evidence Files",
  compact = false,
}: EvidenceUploadProps) {
  const api = useApi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = new URLSearchParams({
    ...(controlId   && { controlId }),
    ...(riskId      && { riskId }),
    ...(modelId     && { modelId }),
    ...(dataAssetId && { dataAssetId }),
  }).toString();

  const fetchFiles = useCallback(async () => {
    if (!query) return;
    setLoading(true);
    try {
      const data = await api.get<{ files: EvidenceFile[] }>(`/upload?${query}`);
      setFiles(data.files);
    } catch {
      // silently ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  async function uploadFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (controlId)   form.append("controlId",   controlId);
      if (riskId)      form.append("riskId",       riskId);
      if (modelId)     form.append("modelId",      modelId);
      if (dataAssetId) form.append("dataAssetId",  dataAssetId);
      if (section)     form.append("section",      section);

      const token = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("ai-governance-auth") ?? "{}").state?.token ?? ""
        : "";

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        setError(err.error ?? err.message ?? "Upload failed");
        return;
      }

      await fetchFiles();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function deleteFile(id: string) {
    if (!confirm("Delete this evidence file?")) return;
    try {
      await api.del(`/upload?id=${id}`);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch {
      setError("Failed to delete file");
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    Array.from(fileList).forEach(uploadFile);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          files.map((f) => (
            <a
              key={f.id}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Paperclip className="h-3 w-3" />
              {f.name}
            </a>
          ))
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border/50 rounded px-2 py-0.5 hover:border-border transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Upload className="h-3 w-3" />
          )}
          Attach
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Paperclip className="h-3.5 w-3.5" />
        {label}
        {section && <span className="text-primary font-mono">§{section}</span>}
      </p>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-5 cursor-pointer transition-all text-center
          ${dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
          }
        `}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-6 w-6" />
            <p className="text-xs">
              <span className="text-primary font-medium">Click to upload</span> or drag &amp; drop
            </p>
            <p className="text-[11px] opacity-60">PDF, Word, Excel, PNG, JPEG, TXT, CSV — max 20 MB</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-1.5">
          {error}
        </p>
      )}

      {/* File list */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading files…
        </div>
      ) : files.length > 0 ? (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors group"
            >
              <span className="text-lg leading-none">{fileIcon(f.mimeType)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{f.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(f.size)} &bull;{" "}
                  {new Date(f.uploadedAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                  {f.section && <> &bull; §{f.section}</>}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Open file"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={() => deleteFile(f.id)}
                  className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                  title="Delete file"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <FileText className="h-3.5 w-3.5" />
          No evidence files yet
        </div>
      )}
    </div>
  );
}
