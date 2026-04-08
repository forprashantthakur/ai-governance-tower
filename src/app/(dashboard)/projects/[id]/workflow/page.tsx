"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Database, Shuffle, BrainCircuit, CheckCircle, ArrowRight,
  GitBranch, Zap, Bell, Plus, Trash2, Save, ZoomIn, ZoomOut,
  RotateCcw, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CanvasNode, CanvasEdge, CanvasViewport, WorkflowNodeType } from "@/types";

// ─── Node type definitions ────────────────────────────────────────────────────
const NODE_TYPES: Record<WorkflowNodeType, {
  label: string; icon: React.FC<{ className?: string }>; color: string; bg: string;
}> = {
  DATA_SOURCE:   { label: "Data Source",   icon: Database,       color: "#0ea5e9", bg: "#0c4a6e" },
  TRANSFORM:     { label: "Transform",     icon: Shuffle,        color: "#f97316", bg: "#431407" },
  MODEL:         { label: "Model",         icon: BrainCircuit,   color: "#8b5cf6", bg: "#2e1065" },
  EVALUATION:    { label: "Evaluation",    icon: CheckCircle,    color: "#10b981", bg: "#064e3b" },
  OUTPUT:        { label: "Output",        icon: ArrowRight,     color: "#06b6d4", bg: "#083344" },
  DECISION:      { label: "Decision",      icon: GitBranch,      color: "#eab308", bg: "#422006" },
  TRIGGER:       { label: "Trigger",       icon: Zap,            color: "#ef4444", bg: "#450a0a" },
  NOTIFICATION:  { label: "Notification",  icon: Bell,           color: "#94a3b8", bg: "#1e293b" },
};

const NODE_W = 160;
const NODE_H = 72;
const PORT_R = 5;

// ─── SVG Bezier edge ─────────────────────────────────────────────────────────
function EdgePath({ x1, y1, x2, y2, selected, color = "#3b82f6" }: {
  x1: number; y1: number; x2: number; y2: number;
  selected?: boolean; color?: string;
}) {
  const cx = (x1 + x2) / 2;
  const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
  return (
    <g>
      <path d={d} stroke="transparent" strokeWidth={12} fill="none" style={{ cursor: "pointer" }} />
      <path d={d} stroke={color} strokeWidth={selected ? 2.5 : 1.8} fill="none"
        strokeDasharray={selected ? "6 3" : undefined} opacity={0.85} />
      {/* Arrowhead */}
      <polygon
        points={`${x2},${y2} ${x2 - 8},${y2 - 4} ${x2 - 8},${y2 + 4}`}
        fill={color} opacity={0.85}
      />
    </g>
  );
}

// ─── Single node component ────────────────────────────────────────────────────
function NodeBox({
  node, selected, onMouseDown, onPortMouseDown, viewport,
}: {
  node: CanvasNode; selected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, port: string, side: "out") => void;
  viewport: CanvasViewport;
}) {
  const def = NODE_TYPES[node.type];
  const Icon = def.icon;
  const x = node.x;
  const y = node.y;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      style={{ cursor: "grab" }}
    >
      {/* Shadow */}
      <rect x={3} y={3} width={NODE_W} height={NODE_H} rx={10} fill="rgba(0,0,0,0.4)" />
      {/* Body */}
      <rect
        x={0} y={0} width={NODE_W} height={NODE_H} rx={10}
        fill={def.bg} stroke={selected ? def.color : "rgba(255,255,255,0.1)"}
        strokeWidth={selected ? 2 : 1}
      />
      {/* Top color stripe */}
      <rect x={0} y={0} width={NODE_W} height={4} rx={2} fill={def.color} />

      {/* Icon */}
      <foreignObject x={10} y={14} width={22} height={22}>
        <div style={{ color: def.color }}>
          <Icon className="h-5 w-5" />
        </div>
      </foreignObject>

      {/* Label */}
      <text x={38} y={24} fontSize={11} fontWeight={600} fill="white" dominantBaseline="middle">
        {node.label.slice(0, 18)}
      </text>
      <text x={38} y={40} fontSize={9} fill="rgba(255,255,255,0.45)" dominantBaseline="middle">
        {def.label}
      </text>

      {/* Input port (left) */}
      {node.inputs.length > 0 && (
        <circle cx={0} cy={NODE_H / 2} r={PORT_R}
          fill="#1e293b" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5}
          style={{ cursor: "crosshair" }} />
      )}

      {/* Output port (right) */}
      {node.outputs.length > 0 && (
        <circle
          cx={NODE_W} cy={NODE_H / 2} r={PORT_R}
          fill={def.color} stroke="white" strokeWidth={1.5}
          style={{ cursor: "crosshair" }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onPortMouseDown(e, node.id, node.outputs[0], "out");
          }}
        />
      )}
    </g>
  );
}

// ─── Main canvas page ─────────────────────────────────────────────────────────
export default function WorkflowPage() {
  const params = useParams<{ id: string }>();
  const [canvases, setCanvases] = useState<{ id: string; name: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [viewport, setViewport] = useState<CanvasViewport>({ x: 0, y: 0, scale: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{ nodeId: string; port: string; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState("");
  const [creatingCanvas, setCreatingCanvas] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const dragNode = useRef<{ id: string; ox: number; oy: number; mx: number; my: number } | null>(null);
  const saveTimer = useRef<NodeJS.Timeout>();
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const h = { Authorization: `Bearer ${token}` };

  // Load canvas list
  useEffect(() => {
    fetch(`/api/projects/${params.id}/workflows`, { headers: h })
      .then(r => r.json())
      .then(d => {
        const list = d.data ?? [];
        setCanvases(list);
        if (list.length > 0) loadCanvas(list[0].id);
        else setLoading(false);
      });
  }, [params.id]);

  function loadCanvas(id: string) {
    setLoading(true);
    fetch(`/api/projects/${params.id}/workflows/${id}`, { headers: h })
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          const cd = d.data.canvasData;
          setNodes(cd.nodes ?? []);
          setEdges(cd.edges ?? []);
          setViewport(cd.viewport ?? { x: 40, y: 40, scale: 1 });
          setActiveId(id);
        }
        setLoading(false);
      });
  }

  async function createCanvas() {
    if (!newCanvasName.trim()) return;
    setCreatingCanvas(true);
    const res = await fetch(`/api/projects/${params.id}/workflows`, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newCanvasName.trim(),
        canvasData: { nodes: [], edges: [], viewport: { x: 0, y: 0, scale: 1 } },
      }),
    });
    const data = await res.json();
    if (data.data) {
      setCanvases(c => [...c, { id: data.data.id, name: data.data.name }]);
      setNodes([]); setEdges([]); setViewport({ x: 0, y: 0, scale: 1 });
      setActiveId(data.data.id);
      setNewCanvasName("");
    }
    setCreatingCanvas(false);
  }

  // Auto-save with debounce
  function scheduleSave(n: CanvasNode[], e: CanvasEdge[], vp: CanvasViewport) {
    if (!activeId) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      fetch(`/api/projects/${params.id}/workflows/${activeId}`, {
        method: "PATCH",
        headers: { ...h, "Content-Type": "application/json" },
        body: JSON.stringify({ canvasData: { nodes: n, edges: e, viewport: vp } }),
      }).finally(() => setSaving(false));
    }, 1500);
  }

  // ── Coordinate helpers ─────────────────────────────────────────────────────
  function svgToCanvas(sx: number, sy: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (sx - rect.left - viewport.x) / viewport.scale,
      y: (sy - rect.top - viewport.y) / viewport.scale,
    };
  }

  // ── Pan ────────────────────────────────────────────────────────────────────
  function onBgMouseDown(e: React.MouseEvent) {
    if (e.target !== svgRef.current && !(e.target as Element).classList.contains("bg-rect")) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y };
    setSelected(null);
  }

  // ── Node drag ──────────────────────────────────────────────────────────────
  function onNodeMouseDown(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setSelected(id);
    const node = nodes.find(n => n.id === id)!;
    dragNode.current = { id, ox: node.x, oy: node.y, mx: e.clientX, my: e.clientY };
  }

  // ── Port: start connection ──────────────────────────────────────────────────
  function onPortMouseDown(e: React.MouseEvent, nodeId: string, port: string, _side: "out") {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId)!;
    const sx = node.x * viewport.scale + viewport.x + NODE_W * viewport.scale;
    const sy = node.y * viewport.scale + viewport.y + (NODE_H / 2) * viewport.scale;
    setConnecting({ nodeId, port, x: sx, y: sy });
  }

  // ── Mouse move ─────────────────────────────────────────────────────────────
  function onMouseMove(e: React.MouseEvent) {
    const rect = svgRef.current!.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (isPanning.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      const vp = { ...viewport, x: panStart.current.vx + dx, y: panStart.current.vy + dy };
      setViewport(vp);
    }
    if (dragNode.current) {
      const dn = dragNode.current;
      const dx = (e.clientX - dn.mx) / viewport.scale;
      const dy = (e.clientY - dn.my) / viewport.scale;
      setNodes(ns => {
        const updated = ns.map(n => n.id === dn.id ? { ...n, x: dn.ox + dx, y: dn.oy + dy } : n);
        scheduleSave(updated, edges, viewport);
        return updated;
      });
    }
  }

  function onMouseUp(e: React.MouseEvent) {
    if (connecting) {
      // Check if dropped on a node's input port
      const rect = svgRef.current!.getBoundingClientRect();
      const cx = (e.clientX - rect.left - viewport.x) / viewport.scale;
      const cy = (e.clientY - rect.top - viewport.y) / viewport.scale;
      const target = nodes.find(n =>
        n.id !== connecting.nodeId &&
        n.inputs.length > 0 &&
        Math.abs(cx - n.x) < PORT_R * 3 &&
        Math.abs(cy - (n.y + NODE_H / 2)) < PORT_R * 3
      );
      if (target) {
        const newEdge: CanvasEdge = {
          id: `e_${Date.now()}`,
          sourceNodeId: connecting.nodeId,
          sourcePort: connecting.port,
          targetNodeId: target.id,
          targetPort: target.inputs[0],
        };
        setEdges(es => {
          const updated = [...es, newEdge];
          scheduleSave(nodes, updated, viewport);
          return updated;
        });
      }
      setConnecting(null);
    }
    isPanning.current = false;
    dragNode.current = null;
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const ns = Math.max(0.25, Math.min(2, viewport.scale * delta));
    const vp = {
      scale: ns,
      x: mx - (mx - viewport.x) * (ns / viewport.scale),
      y: my - (my - viewport.y) * (ns / viewport.scale),
    };
    setViewport(vp);
    scheduleSave(nodes, edges, vp);
  }

  // ── Add node ──────────────────────────────────────────────────────────────
  function addNode(type: WorkflowNodeType) {
    const def = NODE_TYPES[type];
    const cx = (-viewport.x + 300) / viewport.scale;
    const cy = (-viewport.y + 200) / viewport.scale;
    const hasIn = ["TRANSFORM", "MODEL", "EVALUATION", "OUTPUT", "NOTIFICATION"].includes(type);
    const hasOut = !["OUTPUT", "NOTIFICATION"].includes(type);
    const node: CanvasNode = {
      id: `n_${Date.now()}`,
      type, label: def.label,
      x: cx + Math.random() * 100, y: cy + Math.random() * 80,
      width: NODE_W, height: NODE_H,
      config: {}, inputs: hasIn ? ["in"] : [], outputs: hasOut ? ["out"] : [],
    };
    setNodes(ns => { const updated = [...ns, node]; scheduleSave(updated, edges, viewport); return updated; });
  }

  function deleteSelected() {
    if (!selected) return;
    setNodes(ns => { const updated = ns.filter(n => n.id !== selected); scheduleSave(updated, edges, viewport); return updated; });
    setEdges(es => { const updated = es.filter(e => e.sourceNodeId !== selected && e.targetNodeId !== selected); scheduleSave(nodes, updated, viewport); return updated; });
    setSelected(null);
  }

  // ── Compute edge positions ────────────────────────────────────────────────
  function edgeCoords(edge: CanvasEdge) {
    const src = nodes.find(n => n.id === edge.sourceNodeId);
    const tgt = nodes.find(n => n.id === edge.targetNodeId);
    if (!src || !tgt) return null;
    return {
      x1: src.x + NODE_W, y1: src.y + NODE_H / 2,
      x2: tgt.x, y2: tgt.y + NODE_H / 2,
      color: NODE_TYPES[src.type]?.color ?? "#3b82f6",
    };
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Canvas list + palette */}
      <div className="w-52 shrink-0 border-r border-border bg-card flex flex-col">
        {/* Canvases */}
        <div className="p-3 border-b border-border">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Diagrams</div>
          {canvases.map(c => (
            <button
              key={c.id}
              onClick={() => loadCanvas(c.id)}
              className={`w-full text-left px-2 py-1.5 rounded-md text-xs truncate flex items-center gap-1 ${
                activeId === c.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ChevronRight className="h-3 w-3 shrink-0" />{c.name}
            </button>
          ))}
          <div className="flex gap-1 mt-2">
            <input
              className="flex-1 h-6 rounded border border-input bg-background px-2 text-xs"
              placeholder="New diagram…"
              value={newCanvasName}
              onChange={e => setNewCanvasName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createCanvas()}
            />
            <Button size="icon" className="h-6 w-6" onClick={createCanvas} disabled={creatingCanvas}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Node palette */}
        <div className="p-3 flex-1 overflow-y-auto">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Nodes</div>
          <div className="space-y-1">
            {Object.entries(NODE_TYPES).map(([type, def]) => {
              const Icon = def.icon;
              return (
                <button
                  key={type}
                  onClick={() => addNode(type as WorkflowNodeType)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg border border-border hover:border-primary/40 bg-card hover:bg-muted/50 text-xs transition-all text-left"
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                    style={{ background: def.bg }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: def.color }} />
                  </div>
                  <span className="truncate">{def.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/50">
          <Button variant="outline" size="icon" className="h-7 w-7"
            onClick={() => setViewport(v => ({ ...v, scale: Math.min(2, v.scale * 1.2) }))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7"
            onClick={() => setViewport(v => ({ ...v, scale: Math.max(0.25, v.scale * 0.8) }))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7"
            onClick={() => setViewport({ x: 0, y: 0, scale: 1 })}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground">{Math.round(viewport.scale * 100)}%</span>
          {selected && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10 ml-2"
              onClick={deleteSelected}>
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
            {!saving && activeId && <span className="text-xs text-green-400 flex items-center gap-1"><Save className="h-3 w-3" /> Saved</span>}
            {!activeId && (
              <span className="text-xs text-muted-foreground">Create or select a diagram to start</span>
            )}
          </div>
        </div>

        {/* SVG Canvas */}
        {loading ? (
          <div className="flex-1 bg-[#0d1b2a] animate-pulse" />
        ) : (
          <svg
            ref={svgRef}
            className="flex-1 bg-[#0d1b2a] select-none"
            style={{ cursor: isPanning.current ? "grabbing" : "default" }}
            onMouseDown={onBgMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
          >
            {/* Dot grid */}
            <defs>
              <pattern id="dotgrid" width={20 * viewport.scale} height={20 * viewport.scale}
                patternUnits="userSpaceOnUse"
                x={viewport.x % (20 * viewport.scale)} y={viewport.y % (20 * viewport.scale)}>
                <circle cx={1} cy={1} r={1} fill="rgba(255,255,255,0.06)" />
              </pattern>
            </defs>
            <rect className="bg-rect" width="100%" height="100%" fill="url(#dotgrid)" />

            {/* Transform group */}
            <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.scale})`}>
              {/* Edges */}
              {edges.map(edge => {
                const coords = edgeCoords(edge);
                if (!coords) return null;
                return (
                  <EdgePath key={edge.id}
                    x1={coords.x1} y1={coords.y1} x2={coords.x2} y2={coords.y2}
                    selected={selected === edge.id} color={coords.color} />
                );
              })}

              {/* Temp connecting edge */}
              {connecting && (
                <EdgePath
                  x1={(connecting.x - viewport.x) / viewport.scale}
                  y1={(connecting.y - viewport.y) / viewport.scale}
                  x2={(mousePos.x - viewport.x) / viewport.scale}
                  y2={(mousePos.y - viewport.y) / viewport.scale}
                  color="#60a5fa"
                />
              )}

              {/* Nodes */}
              {nodes.map(node => (
                <NodeBox key={node.id} node={node}
                  selected={selected === node.id}
                  viewport={viewport}
                  onMouseDown={onNodeMouseDown}
                  onPortMouseDown={onPortMouseDown} />
              ))}
            </g>

            {/* Empty state */}
            {nodes.length === 0 && activeId && (
              <text x="50%" y="50%" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize={14} dy={-20}>
                Click a node from the palette to add it to the canvas
              </text>
            )}
            {!activeId && (
              <text x="50%" y="50%" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize={14}>
                Create a diagram from the left panel to get started
              </text>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
