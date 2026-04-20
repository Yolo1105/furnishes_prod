"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  RotateCcw,
  RotateCw,
  Sparkles,
  Plus,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Loader2,
  Home,
  Search,
  ClipboardList,
  HelpCircle,
  FileText,
  CheckCircle,
  BookOpen,
  PenLine,
  Copy,
} from "lucide-react";
import { SectionLabel } from "@/components/eva-dashboard/shared/section-label";
import { INIT_WF_NODES, INIT_WF_EDGES } from "@/lib/eva-dashboard/mock-data";
import type { WfNode, WfEdge } from "@/lib/eva-dashboard/mock-data";
import type { TraceEntry } from "@/lib/eva-dashboard/mock-data";
import {
  NODE_COLORS,
  STATUS_COLORS,
  SVG_COLORS,
} from "@/lib/eva-dashboard/theme-colors";
import { useCurrentConversation } from "@/lib/eva-dashboard/contexts/current-conversation-context";
import { cn } from "@/lib/utils";
import { apiGet, apiPut, API_ROUTES } from "@/lib/eva-dashboard/api";
import { useActiveProjectOptional } from "@/lib/eva-dashboard/contexts/active-project-context";
import { PlaybookProjectWorkflowPanel } from "@/components/eva-dashboard/views/playbook-project-workflow-panel";
import { buildDesignWorkflowCanvasGraph } from "@/lib/eva/design-workflow/graph-layout";
import { isWorkflowStageId } from "@/lib/eva/design-workflow/stages";
import type { ProjectDetailGetResponse } from "@/lib/eva/projects/api-types";

import type { PlaybookNodeType } from "@/lib/eva/playbook/types";
type NodeType = PlaybookNodeType;

const NODE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; size?: number }>
> = {
  home: Home,
  search: Search,
  "clipboard-list": ClipboardList,
  "help-circle": HelpCircle,
  "file-text": FileText,
  "check-circle": CheckCircle,
  "book-open": BookOpen,
  "pen-line": PenLine,
};

function ConfBar({ value }: { value: number }) {
  const color =
    value >= 85
      ? "bg-success-solid"
      : value >= 60
        ? "bg-primary"
        : "bg-review-solid";
  const textColor =
    value >= 85
      ? "text-success-foreground"
      : value >= 60
        ? "text-primary"
        : "text-review-foreground";
  return (
    <div className="flex min-w-[60px] items-center gap-2">
      <div className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span
        className={cn(
          "min-w-[28px] text-right text-[10px] font-semibold",
          textColor,
        )}
      >
        {value}%
      </span>
    </div>
  );
}

function TraceBadge({
  children,
  variant = "muted",
}: {
  children: React.ReactNode;
  variant?: "muted";
}) {
  return (
    <span className="bg-muted text-muted-foreground border-border rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
      {children}
    </span>
  );
}

type HistoryEntry = { nodes: WfNode[]; edges: WfEdge[] };
const MAX_HISTORY = 50;

export function PlaybookView() {
  const activeProject = useActiveProjectOptional();
  const { conversationId } = useCurrentConversation();
  const [nodes, _setNodes] = useState<WfNode[]>(INIT_WF_NODES);
  const [edges, _setEdges] = useState<WfEdge[]>(INIT_WF_EDGES);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState<string | null>(null);
  const [editingEdge, setEditingEdge] = useState<string | null>(null);
  const [zoom, setZoom] = useState(88);

  // ── Undo / Redo history ────────────────────────────────────────────
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  const pushHistory = useCallback((n: WfNode[], e: WfEdge[]) => {
    if (isUndoRedoRef.current) return;
    const idx = historyIndexRef.current;
    // Trim any future entries if we branched
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push({ nodes: n, edges: e });
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const setNodes: typeof _setNodes = useCallback(
    (action) => {
      _setNodes((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        // Schedule history push after both nodes and edges are settled
        setTimeout(() => {
          pushHistory(next, edges);
        }, 0);
        return next;
      });
    },
    [pushHistory, edges],
  );

  const setEdges: typeof _setEdges = useCallback(
    (action) => {
      _setEdges((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        setTimeout(() => {
          pushHistory(nodes, next);
        }, 0);
        return next;
      });
    },
    [pushHistory, nodes],
  );

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current -= 1;
    const entry = historyRef.current[historyIndexRef.current];
    _setNodes(entry.nodes);
    _setEdges(entry.edges);
    isUndoRedoRef.current = false;
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current += 1;
    const entry = historyRef.current[historyIndexRef.current];
    _setNodes(entry.nodes);
    _setEdges(entry.edges);
    isUndoRedoRef.current = false;
  }, []);
  const [eventsEntries, setEventsEntries] = useState<TraceEntry[]>([]);
  const [playbookSaving, setPlaybookSaving] = useState(false);
  const [liveNodeId, setLiveNodeId] = useState<string | null>(null);
  const [filledFields, setFilledFields] = useState<string[]>([]);
  const [nodeTransitions, setNodeTransitions] = useState<
    Array<{
      time: string;
      fromNodeId: string | null;
      toNodeId: string;
      reason: string | null;
    }>
  >([]);

  /** Project mode: official `DesignWorkflowStage` graph (ids match `workflowStage`). Otherwise: legacy API playbook. */
  useEffect(() => {
    const pid = activeProject?.activeProjectId;
    if (pid) {
      const applyGraph = () => {
        const { nodes: wfNodes, edges: wfEdges } =
          buildDesignWorkflowCanvasGraph();
        setNodes(wfNodes);
        setEdges(wfEdges);
      };
      apiGet<ProjectDetailGetResponse>(API_ROUTES.project(pid))
        .then((d) => {
          applyGraph();
          const w = d.project.workflowStage;
          setLiveNodeId(isWorkflowStageId(w) ? w : null);
        })
        .catch(() => {
          applyGraph();
        });
      return;
    }
    apiGet<{ nodes: WfNode[]; edges: WfEdge[] }>(API_ROUTES.playbook)
      .then((data) => {
        if (Array.isArray(data.nodes) && data.nodes.length > 0)
          setNodes(data.nodes);
        if (Array.isArray(data.edges)) setEdges(data.edges);
      })
      .catch(() => {
        // No playbook or error: keep INIT_WF_NODES / INIT_WF_EDGES
      });
  }, [activeProject?.activeProjectId]);

  useEffect(() => {
    if (!conversationId) {
      setEventsEntries([]);
      setFilledFields([]);
      setNodeTransitions([]);
      if (!activeProject?.activeProjectId) {
        setLiveNodeId(null);
      }
      return;
    }
    apiGet<{
      events: Array<{
        time: string;
        field: string;
        newValue: string;
        confidence: number;
        action: string;
      }>;
      nodeTransitions: Array<{
        time: string;
        fromNodeId: string | null;
        toNodeId: string;
        reason: string | null;
      }>;
      currentNodeId: string | null;
      filledFields: string[];
    }>(API_ROUTES.conversationEvents(conversationId))
      .then((data) => {
        const events = data.events ?? (data as unknown as Array<unknown>);
        const entries: TraceEntry[] = (
          events as Array<{
            time: string;
            field: string;
            newValue: string;
            confidence: number;
            action: string;
          }>
        ).map((e) => ({
          time: new Date(e.time).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          userQuote: "",
          changes: [
            {
              field: e.field,
              after: e.newValue,
              confidence: Math.round((e.confidence ?? 0) * 100),
              action: e.action ?? "set",
            },
          ],
        }));
        setEventsEntries(entries);
        if (!activeProject?.activeProjectId) {
          setLiveNodeId(data.currentNodeId ?? null);
        }
        setFilledFields(data.filledFields ?? []);
        setNodeTransitions(data.nodeTransitions ?? []);
      })
      .catch(() => setEventsEntries([]));
  }, [conversationId, activeProject?.activeProjectId]);

  const traceFromEvents = useMemo(
    () => (eventsEntries.length > 0 ? { entries: eventsEntries } : null),
    [eventsEntries],
  );

  const nodeColors = NODE_COLORS;
  const actionColors = STATUS_COLORS;

  const updateNodeBody = (id: string, body: string) =>
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, body } : n)));
  const updateNodeConfig = (id: string, patch: Record<string, unknown>) =>
    setNodes((ns) =>
      ns.map((n) =>
        n.id === id ? { ...n, config: { ...n.config, ...patch } } : n,
      ),
    );
  const deleteNode = (id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.from !== id && e.to !== id));
    setSelectedNode(null);
  };
  const duplicateNode = (id: string) => {
    const src = nodes.find((n) => n.id === id);
    if (src)
      setNodes((ns) => [
        ...ns,
        {
          ...src,
          id: `n_${Date.now()}`,
          x: src.x + 30,
          y: src.y + 30,
          title: src.title + " (COPY)",
        },
      ]);
  };
  const updateEdgeLabel = (id: string, label: string) =>
    setEdges((es) => es.map((e) => (e.id === id ? { ...e, label } : e)));

  const trace = selectedNode ? traceFromEvents : null;
  const selNodeData = nodes.find((n) => n.id === selectedNode);

  return (
    <div className="bg-card flex flex-1 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeProject?.activeProjectId ? (
          <PlaybookProjectWorkflowPanel
            projectId={activeProject.activeProjectId}
          />
        ) : null}
        {/* Toolbar */}
        <div className="border-border bg-card flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo"
            className="border-border bg-background text-muted-foreground hover:bg-muted flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo"
            className="border-border bg-background text-muted-foreground hover:bg-muted flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <div className="bg-border mx-1 h-5 w-px" />
          <button
            type="button"
            className="border-border bg-background text-foreground hover:bg-muted flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" /> Agent Prompts
          </button>
          <button
            type="button"
            onClick={() =>
              setNodes((ns) => [
                ...ns,
                {
                  id: `n_${Date.now()}`,
                  x: 400,
                  y: 500,
                  w: 280,
                  title: "NEW NODE",
                  body: "Describe what Eva should do...",
                  type: "collect" as const,
                  icon: "pen-line",
                  config: {},
                },
              ])
            }
            className="border-border bg-background text-foreground hover:bg-muted flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New Node
          </button>
          <div className="flex-1" />
          <span className="text-info-foreground flex items-center gap-1 text-xs">
            <Check className="h-3 w-3" /> Saved
          </span>
          <div className="bg-border mx-2 h-5 w-px" />
          <button
            type="button"
            className="border-border bg-background text-muted-foreground hover:bg-muted cursor-pointer rounded-lg border px-3 py-1.5 text-xs transition-colors"
          >
            Preview
          </button>
          <button
            type="button"
            disabled={playbookSaving}
            onClick={async () => {
              setPlaybookSaving(true);
              try {
                await apiPut(API_ROUTES.playbook, { nodes, edges });
              } finally {
                setPlaybookSaving(false);
              }
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-lg border-none px-4 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {playbookSaving ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </span>
            ) : (
              "Publish"
            )}
          </button>
        </div>

        {/* Canvas */}
        <div className="relative min-h-0 flex-1 overflow-auto">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle, ${SVG_COLORS.grid} 0.8px, transparent 0.8px)`,
              backgroundSize: "24px 24px",
            }}
          />
          <div className="bg-card border-border text-muted-foreground absolute right-4 bottom-4 z-10 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs shadow-sm">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="hover:text-foreground cursor-pointer p-0.5 transition-colors"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[36px] text-center">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(120, z + 10))}
              className="hover:text-foreground cursor-pointer p-0.5 transition-colors"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          <div className="p-8">
            <svg
              width={(1100 * zoom) / 100}
              height={(920 * zoom) / 100}
              viewBox="0 0 1100 920"
            >
              {edges.map((edge) => {
                const from = nodes.find((n) => n.id === edge.from);
                const to = nodes.find((n) => n.id === edge.to);
                if (!from || !to) return null;
                const fx = from.x + from.w / 2;
                const fy = from.y + 90;
                const tx = to.x + to.w / 2;
                const ty = to.y;
                const my = (fy + ty) / 2;
                const mx = (fx + tx) / 2;
                return (
                  <g key={edge.id}>
                    <path
                      d={`M ${fx} ${fy} C ${fx} ${my}, ${tx} ${my}, ${tx} ${ty}`}
                      fill="none"
                      stroke={SVG_COLORS.edge}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                    />
                    <circle
                      cx={fx}
                      cy={fy}
                      r={4.5}
                      fill={SVG_COLORS.dotFill}
                      stroke={SVG_COLORS.dotStroke}
                      strokeWidth={1.5}
                    />
                    <circle cx={fx} cy={fy} r={2} fill={SVG_COLORS.dotCenter} />
                    <circle
                      cx={tx}
                      cy={ty}
                      r={4.5}
                      fill={SVG_COLORS.dotFill}
                      stroke={SVG_COLORS.dotStroke}
                      strokeWidth={1.5}
                    />
                    <circle cx={tx} cy={ty} r={2} fill={SVG_COLORS.dotStroke} />
                    {edge.label && (
                      <g
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEdge(
                            editingEdge === edge.id ? null : edge.id,
                          );
                        }}
                      >
                        <rect
                          x={mx - (edge.label.length * 4 + 16)}
                          y={my - 12}
                          width={edge.label.length * 8 + 32}
                          height={24}
                          rx={12}
                          fill={SVG_COLORS.dotFill}
                          stroke={SVG_COLORS.edge}
                          strokeWidth={1}
                        />
                        {editingEdge === edge.id ? (
                          <foreignObject
                            x={mx - edge.label.length * 4 - 10}
                            y={my - 10}
                            width={edge.label.length * 8 + 20}
                            height={20}
                          >
                            <input
                              autoFocus
                              value={edge.label}
                              onChange={(e) =>
                                updateEdgeLabel(edge.id, e.target.value)
                              }
                              onBlur={() => setEditingEdge(null)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && setEditingEdge(null)
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="text-foreground w-full border-none bg-transparent text-center text-[10px] font-semibold uppercase outline-none"
                            />
                          </foreignObject>
                        ) : (
                          <text
                            x={mx}
                            y={my + 3}
                            textAnchor="middle"
                            fontSize={10}
                            fontWeight={600}
                            fill="#7A756E"
                            letterSpacing="0.04em"
                          >
                            {edge.label}
                          </text>
                        )}
                      </g>
                    )}
                  </g>
                );
              })}
              {nodes.map((node) => {
                const c =
                  nodeColors[node.type as keyof typeof nodeColors] ||
                  nodeColors.collect;
                const isSel = selectedNode === node.id;
                const isLive = liveNodeId === node.id;
                const isKb = node.type === "knowledge";
                return (
                  <g
                    key={node.id}
                    role="button"
                    tabIndex={0}
                    aria-label={node.title}
                    className="cursor-pointer focus:outline-none"
                    onClick={() => setSelectedNode(isSel ? null : node.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedNode(isSel ? null : node.id);
                      }
                    }}
                  >
                    {/* Live node indicator — green pulsing border */}
                    {isLive && !isSel && (
                      <rect
                        x={node.x - 4}
                        y={node.y - 4}
                        width={node.w + 8}
                        height={98}
                        rx={14}
                        fill="none"
                        stroke="#4A9D6E"
                        strokeWidth={2}
                        opacity={0.7}
                      />
                    )}
                    {isSel && (
                      <rect
                        x={node.x - 4}
                        y={node.y - 4}
                        width={node.w + 8}
                        height={98}
                        rx={14}
                        fill="none"
                        stroke="#C86F4A"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                      />
                    )}
                    <rect
                      x={node.x + 1}
                      y={node.y + 2}
                      width={node.w}
                      height={90}
                      rx={10}
                      fill="rgba(0,0,0,0.04)"
                    />
                    <rect
                      x={node.x}
                      y={node.y}
                      width={node.w}
                      height={90}
                      rx={10}
                      fill={c.bg}
                      stroke={isSel ? "#C86F4A" : c.border}
                      strokeWidth={isSel ? 2 : 1.2}
                    />
                    <rect
                      x={node.x}
                      y={node.y}
                      width={node.w}
                      height={30}
                      rx={10}
                      fill={c.titleBg}
                    />
                    <rect
                      x={node.x}
                      y={node.y + 18}
                      width={node.w}
                      height={12}
                      fill={c.titleBg}
                    />
                    <foreignObject
                      x={node.x + 10}
                      y={node.y + 6}
                      width={20}
                      height={20}
                    >
                      <div
                        className="flex h-5 w-5 items-center justify-center text-current"
                        style={{ color: c.titleC }}
                      >
                        {(() => {
                          const IconComponent =
                            NODE_ICONS[node.icon] ?? FileText;
                          return IconComponent ? (
                            <IconComponent size={14} className="shrink-0" />
                          ) : null;
                        })()}
                      </div>
                    </foreignObject>
                    <text
                      x={node.x + 32}
                      y={node.y + 20}
                      fontSize={11}
                      fontWeight={700}
                      fill={c.titleC}
                      letterSpacing="0.06em"
                    >
                      {node.title}
                    </text>
                    {isKb && (
                      <>
                        <rect
                          x={node.x + node.w - 58}
                          y={node.y + 6}
                          width={48}
                          height={18}
                          rx={4}
                          fill={SVG_COLORS.dotFill}
                        />
                        <text
                          x={node.x + node.w - 34}
                          y={node.y + 18}
                          textAnchor="middle"
                          fontSize={9}
                          fontWeight={700}
                          fill="#9575CD"
                        >
                          Global
                        </text>
                      </>
                    )}
                    <foreignObject
                      x={node.x + 12}
                      y={node.y + 36}
                      width={node.w - 24}
                      height={48}
                    >
                      {editingBody === node.id ? (
                        <textarea
                          autoFocus
                          value={node.body}
                          onChange={(e) =>
                            updateNodeBody(node.id, e.target.value)
                          }
                          onBlur={() => setEditingBody(null)}
                          onClick={(e) => e.stopPropagation()}
                          className="border-primary text-foreground bg-primary/5 h-full w-full resize-none rounded border p-1 text-[11px] leading-relaxed outline-none"
                        />
                      ) : (
                        <div
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingBody(node.id);
                          }}
                          className="text-muted-foreground h-full cursor-text overflow-hidden text-[11px] leading-relaxed"
                        >
                          {node.body}
                        </div>
                      )}
                    </foreignObject>
                    {isSel && !isKb && (
                      <g>
                        <g
                          role="button"
                          tabIndex={0}
                          aria-label="Duplicate node"
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateNode(node.id);
                          }}
                        >
                          <rect
                            x={node.x + node.w + 6}
                            y={node.y + 10}
                            width={26}
                            height={26}
                            rx={6}
                            fill={SVG_COLORS.dotFill}
                            stroke={SVG_COLORS.edge}
                            strokeWidth={1}
                          />
                          <foreignObject
                            x={node.x + node.w + 10}
                            y={node.y + 14}
                            width={18}
                            height={18}
                          >
                            <div className="flex h-full w-full items-center justify-center text-[#7A756E]">
                              <Copy size={14} />
                            </div>
                          </foreignObject>
                        </g>
                        <g
                          role="button"
                          tabIndex={0}
                          aria-label="Delete node"
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNode(node.id);
                          }}
                        >
                          <rect
                            x={node.x + node.w + 6}
                            y={node.y + 42}
                            width={26}
                            height={26}
                            rx={6}
                            fill="#FEF2F2"
                            stroke="#FECACA"
                            strokeWidth={1}
                          />
                          <foreignObject
                            x={node.x + node.w + 10}
                            y={node.y + 46}
                            width={18}
                            height={18}
                          >
                            <div className="flex h-full w-full items-center justify-center text-[#EF4444]">
                              <X size={14} />
                            </div>
                          </foreignObject>
                        </g>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Side panel */}
      {selectedNode && (
        <div className="bg-card border-border animate-in slide-in-from-right-4 flex w-72 min-w-72 shrink-0 flex-col overflow-hidden border-l duration-200">
          <div className="border-border flex items-center gap-3 border-b px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-foreground truncate text-sm font-semibold">
                {selNodeData?.title}
              </div>
              <div className="text-muted-foreground text-[10px] capitalize">
                {selNodeData?.type} node
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="text-muted-foreground hover:text-foreground cursor-pointer p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-border border-b p-4">
              <SectionLabel>Node Prompt</SectionLabel>
              <textarea
                value={selNodeData?.body ?? ""}
                onChange={(e) => updateNodeBody(selectedNode, e.target.value)}
                className="border-border text-foreground bg-background focus:border-primary min-h-[80px] w-full resize-y rounded-lg border p-3 text-xs leading-relaxed transition-colors outline-none"
              />
            </div>

            {/* ── Node Config ─────────────────────────────── */}
            {selNodeData && (
              <div className="border-border space-y-3 border-b p-4">
                <SectionLabel>Pipeline Config</SectionLabel>

                {/* System prompt suffix */}
                <div>
                  <label className="text-muted-foreground mb-1 block text-[10px] font-semibold tracking-wide uppercase">
                    System Prompt Suffix
                  </label>
                  <textarea
                    value={selNodeData.config?.systemPromptSuffix ?? ""}
                    onChange={(e) =>
                      updateNodeConfig(selectedNode, {
                        systemPromptSuffix: e.target.value || undefined,
                      })
                    }
                    placeholder="Additional instructions for Eva in this phase..."
                    className="border-border text-foreground bg-background focus:border-primary min-h-[60px] w-full resize-y rounded-lg border p-2 text-[11px] leading-relaxed transition-colors outline-none"
                  />
                </div>

                {/* Required fields */}
                <div>
                  <label className="text-muted-foreground mb-1 block text-[10px] font-semibold tracking-wide uppercase">
                    Required Fields
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "roomType",
                      "style",
                      "budget",
                      "color",
                      "furniture",
                      "exclusion",
                    ].map((f) => {
                      const active =
                        selNodeData.config?.requiredFields?.includes(f) ??
                        false;
                      return (
                        <button
                          type="button"
                          key={f}
                          onClick={() => {
                            const current =
                              selNodeData.config?.requiredFields ?? [];
                            const next = active
                              ? current.filter((x) => x !== f)
                              : [...current, f];
                            updateNodeConfig(selectedNode, {
                              requiredFields: next.length ? next : undefined,
                            });
                          }}
                          className={cn(
                            "cursor-pointer rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50",
                          )}
                        >
                          {f}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Extraction focus */}
                <div>
                  <label className="text-muted-foreground mb-1 block text-[10px] font-semibold tracking-wide uppercase">
                    Extraction Focus
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "roomType",
                      "style",
                      "budget",
                      "color",
                      "furniture",
                      "exclusion",
                    ].map((f) => {
                      const active =
                        selNodeData.config?.extractionFocus?.includes(f) ??
                        false;
                      return (
                        <button
                          type="button"
                          key={f}
                          onClick={() => {
                            const current =
                              selNodeData.config?.extractionFocus ?? [];
                            const next = active
                              ? current.filter((x) => x !== f)
                              : [...current, f];
                            updateNodeConfig(selectedNode, {
                              extractionFocus: next.length ? next : undefined,
                            });
                          }}
                          className={cn(
                            "cursor-pointer rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
                            active
                              ? "border-info-border bg-info text-info-foreground"
                              : "border-border text-muted-foreground hover:border-info-border",
                          )}
                        >
                          {f}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Toggles row */}
                <div className="flex items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[10px] font-medium">
                    <input
                      type="checkbox"
                      checked={selNodeData.config?.ragEnabled !== false}
                      onChange={(e) =>
                        updateNodeConfig(selectedNode, {
                          ragEnabled: e.target.checked,
                        })
                      }
                      className="accent-primary h-3 w-3"
                    />
                    <span className="text-foreground">RAG</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5 text-[10px] font-medium">
                    <input
                      type="checkbox"
                      checked={selNodeData.config?.designRulesEnabled !== false}
                      onChange={(e) =>
                        updateNodeConfig(selectedNode, {
                          designRulesEnabled: e.target.checked,
                        })
                      }
                      className="accent-primary h-3 w-3"
                    />
                    <span className="text-foreground">Design Rules</span>
                  </label>
                </div>

                {/* Response length */}
                <div>
                  <label className="text-muted-foreground mb-1 block text-[10px] font-semibold tracking-wide uppercase">
                    Response Length
                  </label>
                  <select
                    value={selNodeData.config?.responseLength ?? "auto"}
                    onChange={(e) =>
                      updateNodeConfig(selectedNode, {
                        responseLength: e.target.value,
                      })
                    }
                    className="border-border text-foreground bg-background w-full rounded-lg border px-2 py-1 text-[11px]"
                  >
                    <option value="auto">Auto</option>
                    <option value="short">Short (1-2 sentences)</option>
                    <option value="medium">Medium (1-2 paragraphs)</option>
                    <option value="detailed">Detailed (2-4 paragraphs)</option>
                  </select>
                </div>
              </div>
            )}

            {/* ── Live Graph State ─────────────────────── */}
            {liveNodeId && (
              <div className="border-border space-y-2 border-b p-4">
                <SectionLabel>Active Phase</SectionLabel>
                <div className="flex items-center gap-2">
                  <span className="bg-success-solid h-2 w-2 rounded-full" />
                  <span className="text-foreground text-xs font-semibold">
                    {nodes.find((n) => n.id === liveNodeId)?.title ??
                      liveNodeId}
                  </span>
                </div>
                {(() => {
                  const activeNode = nodes.find((n) => n.id === liveNodeId);
                  const required = activeNode?.config?.requiredFields ?? [];
                  if (required.length === 0) return null;
                  return (
                    <div className="mt-1">
                      <div className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
                        Required Fields
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {required.map((f) => {
                          const done = filledFields.includes(f);
                          return (
                            <span
                              key={f}
                              className={cn(
                                "rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                                done
                                  ? "border-success-border bg-success text-success-foreground"
                                  : "border-border text-muted-foreground",
                              )}
                            >
                              {done ? "✓" : "○"} {f}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                {nodeTransitions.length > 0 && (
                  <div className="mt-2">
                    <div className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
                      Transitions
                    </div>
                    <div className="flex flex-col gap-1">
                      {nodeTransitions.map((t, i) => (
                        <div
                          key={i}
                          className="text-muted-foreground flex items-center gap-1 text-[10px]"
                        >
                          <span className="font-medium">
                            {nodes.find((n) => n.id === t.fromNodeId)?.title ??
                              "—"}
                          </span>
                          <span className="text-primary">→</span>
                          <span className="font-medium">
                            {nodes.find((n) => n.id === t.toNodeId)?.title ??
                              t.toNodeId}
                          </span>
                          {t.reason && (
                            <span className="text-muted-foreground/60 italic">
                              ({t.reason})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-4">
              <SectionLabel>Preference Events</SectionLabel>
              {!trace || trace.entries.length === 0 ? (
                <div className="text-muted-foreground py-6 text-center text-xs">
                  No activity yet.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {trace.entries.map((entry, i) => (
                    <div
                      key={i}
                      className="border-border relative border-l-2 pl-3"
                    >
                      <div className="bg-primary border-card absolute top-0 -left-[5px] h-2 w-2 rounded-full border-2" />
                      <div className="text-muted-foreground text-[10px]">
                        {entry.time}
                      </div>
                      {"userQuote" in entry ? (
                        <>
                          <div className="text-foreground mt-1 mb-2 text-xs leading-relaxed">
                            <span className="text-muted-foreground">
                              User:{" "}
                            </span>
                            &ldquo;{entry.userQuote}&rdquo;
                          </div>
                          {entry.changes?.map((ch, j) => {
                            const ac = actionColors[
                              ch.action as keyof typeof actionColors
                            ] || { c: "#7A756E", bg: "#F5F0EA" };
                            return (
                              <div
                                key={j}
                                className="mb-1 flex flex-wrap items-center gap-1.5"
                              >
                                <span className="text-foreground text-[10px] font-semibold">
                                  {ch.field}
                                </span>
                                <span className="text-primary text-[10px] font-semibold">
                                  → {ch.after}
                                </span>
                                <ConfBar value={ch.confidence} />
                                <span
                                  className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                                  style={{ color: ac.c, background: ac.bg }}
                                >
                                  {ch.action}
                                </span>
                              </div>
                            );
                          })}
                          {"reasoning" in entry && entry.reasoning && (
                            <div className="bg-muted/50 text-muted-foreground mt-2 rounded p-2 text-[10px] leading-relaxed">
                              {entry.reasoning}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                          {entry.text}
                          {"action" in entry && entry.action && (
                            <TraceBadge variant="muted">
                              {entry.action}
                            </TraceBadge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
