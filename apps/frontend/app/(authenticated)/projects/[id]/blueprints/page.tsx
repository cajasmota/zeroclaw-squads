"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
  Handle,
  Position,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { apiGet, apiPost } from "@/lib/api/client";
import {
  Plus,
  Save,
  Play,
  ChevronLeft,
  CheckSquare,
  Flag,
  Square,
  AlertTriangle,
  MoreHorizontal,
  History,
  Settings,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────

interface WorkflowTemplate {
  _id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    role?: string;
    description?: string;
    requiresHumanApproval?: boolean;
    kanbanStatus?: string;
    moveCardOn?: "start" | "complete";
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

const KANBAN_STATUSES = [
  { value: "", label: "— none —" },
  { value: "backlog", label: "Backlog" },
  { value: "selected", label: "Selected for Dev" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

const STATUS_COLORS: Record<string, string> = {
  backlog: "#6b7280",
  selected: "#3b82f6",
  in_progress: "#f59e0b",
  review: "#8b5cf6",
  done: "#10b981",
};

// ── Custom Nodes ───────────────────────────────────────────────────────────

function NodeContextMenu({
  x, y, nodeId, onConfigure, onHistory, onDelete, onClose,
}: {
  x: number; y: number; nodeId: string;
  onConfigure: (id: string) => void;
  onHistory: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed z-50 bg-background border rounded-md shadow-lg py-1 min-w-[160px]"
      style={{ left: x, top: y }}
      onMouseLeave={onClose}
    >
      <button
        className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent"
        onClick={() => { onHistory(nodeId); onClose(); }}
      >
        <History className="h-3.5 w-3.5" /> View Execution History
      </button>
      <button
        className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent"
        onClick={() => { onConfigure(nodeId); onClose(); }}
      >
        <Settings className="h-3.5 w-3.5" /> Configure
      </button>
      <hr className="my-1" />
      <button
        className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent text-destructive"
        onClick={() => { onDelete(nodeId); onClose(); }}
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete Node
      </button>
    </div>
  );
}

function AgentTaskNode({ id, data, selected }: any) {
  return (
    <div
      className={`relative bg-background border-2 rounded-lg p-3 min-w-[180px] max-w-[220px] shadow-sm ${
        selected ? "border-primary" : data.requiresHumanApproval ? "border-orange-400" : "border-border"
      }`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{data.label}</p>
          {data.role && (
            <Badge variant="outline" className="text-xs mt-1">{data.role}</Badge>
          )}
          {data.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{data.description}</p>
          )}
        </div>
        {data.requiresHumanApproval && (
          <AlertTriangle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" title="Requires approval" />
        )}
      </div>
      {data.kanbanStatus && (
        <div className="mt-2">
          <span
            className="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium text-white"
            style={{ backgroundColor: STATUS_COLORS[data.kanbanStatus] ?? "#6b7280" }}
          >
            {KANBAN_STATUSES.find((s) => s.value === data.kanbanStatus)?.label ?? data.kanbanStatus}
          </span>
          {data.moveCardOn && (
            <span className="text-[10px] text-muted-foreground ml-1">on {data.moveCardOn}</span>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function StartNode({ selected }: any) {
  return (
    <div
      className={`bg-green-500 text-white rounded-full w-14 h-14 flex items-center justify-center border-2 ${
        selected ? "border-primary" : "border-green-600"
      } shadow`}
    >
      <Handle type="source" position={Position.Bottom} />
      <Flag className="h-5 w-5" />
    </div>
  );
}

function EndNode({ selected }: any) {
  return (
    <div
      className={`bg-gray-700 text-white rounded-full w-14 h-14 flex items-center justify-center border-2 ${
        selected ? "border-primary" : "border-gray-800"
      } shadow`}
    >
      <Handle type="target" position={Position.Top} />
      <CheckSquare className="h-5 w-5" />
    </div>
  );
}

function ApprovalGateNode({ selected }: any) {
  return (
    <div
      className={`bg-orange-50 dark:bg-orange-950 border-2 border-orange-400 rounded-lg px-4 py-3 shadow-sm min-w-[140px] text-center ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} />
      <AlertTriangle className="h-5 w-5 text-orange-500 mx-auto mb-1" />
      <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">Human Approval</p>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = {
  agentTask: AgentTaskNode,
  start: StartNode,
  end: EndNode,
  approvalGate: ApprovalGateNode,
};

let nodeCounter = 0;
function newNodeId() { return `node-${++nodeCounter}-${Date.now()}`; }

// ── Node Configure Dialog ──────────────────────────────────────────────────

function NodeConfigureDialog({
  open, nodeId, nodes, onClose, onSave,
}: {
  open: boolean; nodeId: string | null; nodes: Node[];
  onClose: () => void;
  onSave: (id: string, data: any) => void;
}) {
  const node = nodes.find((n) => n.id === nodeId);
  const [label, setLabel] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [approval, setApproval] = useState(false);
  const [kanbanStatus, setKanbanStatus] = useState("");
  const [moveCardOn, setMoveCardOn] = useState<"start" | "complete">("complete");

  useEffect(() => {
    if (node) {
      setLabel(node.data.label as string ?? "");
      setRole((node.data.role as string) ?? "");
      setDescription((node.data.description as string) ?? "");
      setApproval(!!(node.data.requiresHumanApproval));
      setKanbanStatus((node.data.kanbanStatus as string) ?? "");
      setMoveCardOn((node.data.moveCardOn as "start" | "complete") ?? "complete");
    }
  }, [node]);

  if (!node) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <h3 className="font-semibold text-sm mb-4">Configure Node</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          {node.type === "agentTask" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Agent Role</Label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. developer, reviewer" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="approval" checked={approval} onChange={(e) => setApproval(e.target.checked)} />
                <Label htmlFor="approval" className="text-xs cursor-pointer">Requires Human Approval</Label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kanban Status</Label>
                <select
                  value={kanbanStatus}
                  onChange={(e) => setKanbanStatus(e.target.value)}
                  className="w-full text-sm border rounded-md px-2 py-1.5 bg-background"
                >
                  {KANBAN_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              {kanbanStatus && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Move card</Label>
                  <select
                    value={moveCardOn}
                    onChange={(e) => setMoveCardOn(e.target.value as any)}
                    className="w-full text-sm border rounded-md px-2 py-1.5 bg-background"
                  >
                    <option value="start">When node starts</option>
                    <option value="complete">When node completes</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    When set, the Kanban card for the story moves to the selected column at this moment.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => {
            onSave(nodeId!, {
              label,
              role: role || undefined,
              description: description || undefined,
              requiresHumanApproval: approval || undefined,
              kanbanStatus: kanbanStatus || undefined,
              moveCardOn: kanbanStatus ? moveCardOn : undefined,
            });
            onClose();
          }}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Node Execution History Panel ───────────────────────────────────────────

function ExecutionHistoryPanel({ open, nodeId, onClose }: { open: boolean; nodeId: string | null; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-background border-l shadow-xl z-40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Execution History — Node {nodeId}</h3>
        <button onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-sm text-muted-foreground text-center py-8">
          No execution history found for this node.
        </div>
      </div>
    </div>
  );
}

// ── Main Blueprint Designer ────────────────────────────────────────────────

export default function BlueprintsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("Untitled Workflow");
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [configNodeId, setConfigNodeId] = useState<string | null>(null);
  const [historyNodeId, setHistoryNodeId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState("");

  const rfWrapper = useRef<HTMLDivElement>(null);

  async function loadTemplates() {
    try {
      const data = await apiGet<WorkflowTemplate[]>("/api/workflows/templates");
      setTemplates(data);
    } catch {
      // no-op
    }
  }

  useEffect(() => { loadTemplates(); }, []);

  function loadTemplate(t: WorkflowTemplate) {
    setSelectedTemplateId(t._id);
    setTemplateName(t.name);
    setNodes((t.nodes as Node[]) ?? []);
    setEdges((t.edges as Edge[]) ?? []);
  }

  function newWorkflow() {
    setSelectedTemplateId(null);
    setTemplateName("Untitled Workflow");
    setNodes([
      { id: "start", type: "start", position: { x: 200, y: 50 }, data: { label: "Start" } },
      { id: "end", type: "end", position: { x: 200, y: 400 }, data: { label: "End" } },
    ]);
    setEdges([]);
  }

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed }, animated: true }, eds),
      ),
    [setEdges],
  );

  function addNode(type: "agentTask" | "approvalGate") {
    const id = newNodeId();
    const newNode: Node = {
      id,
      type,
      position: { x: 100 + Math.random() * 200, y: 150 + Math.random() * 100 },
      data: {
        label: type === "agentTask" ? "New Agent Task" : "Approval Gate",
        requiresHumanApproval: type === "approvalGate",
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  function deleteNode(id: string) {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }

  function updateNodeData(id: string, data: any) {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
    );
  }

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  async function saveWorkflow() {
    setSaving(true);
    setError("");
    try {
      const body = {
        name: templateName,
        nodes,
        edges,
      };
      if (selectedTemplateId) {
        // Update existing — no PATCH endpoint yet, create new
        await apiPost("/api/workflows/templates", body);
      } else {
        const created = await apiPost<WorkflowTemplate>("/api/workflows/templates", body);
        setSelectedTemplateId(created._id);
      }
      await loadTemplates();
    } catch {
      setError("Failed to save workflow");
    } finally {
      setSaving(false);
    }
  }

  async function triggerWorkflow() {
    if (!selectedTemplateId) {
      setError("Save the workflow first before triggering");
      return;
    }
    setTriggering(true);
    setError("");
    try {
      await apiPost(`/api/projects/${projectId}/workflows`, { templateId: selectedTemplateId });
    } catch {
      setError("Failed to trigger workflow");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 border-r flex flex-col flex-shrink-0 bg-background">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
        </div>
        <div className="px-4 py-3 border-b">
          <Button size="sm" className="w-full" onClick={newWorkflow}>
            <Plus className="h-4 w-4 mr-2" /> New Workflow
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <p className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Workflow Templates
          </p>
          {templates.length === 0 ? (
            <p className="px-4 text-xs text-muted-foreground">No templates yet.</p>
          ) : (
            templates.map((t) => (
              <button
                key={t._id}
                onClick={() => loadTemplate(t)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-accent ${
                  selectedTemplateId === t._id ? "bg-accent font-medium" : ""
                }`}
              >
                <p className="truncate">{t.name}</p>
                {t.description && (
                  <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                )}
              </button>
            ))
          )}
        </div>

        {/* Node Palette */}
        <div className="border-t px-4 py-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Add Nodes
          </p>
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => addNode("agentTask")}>
            <Square className="h-3.5 w-3.5 mr-2" /> Agent Task
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start border-orange-300 text-orange-600" onClick={() => addNode("approvalGate")}>
            <AlertTriangle className="h-3.5 w-3.5 mr-2" /> Approval Gate
          </Button>
        </div>
      </aside>

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-background">
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="max-w-xs h-8 text-sm"
            placeholder="Workflow name"
          />
          {error && <span className="text-xs text-destructive">{error}</span>}
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={saveWorkflow} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
            <Button size="sm" onClick={triggerWorkflow} disabled={triggering}>
              {triggering ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Trigger
            </Button>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1 relative" ref={rfWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeContextMenu={onNodeContextMenu}
            onClick={() => setContextMenu(null)}
            fitView
            defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed }, animated: true }}
          >
            <Background />
            <Controls />
            <MiniMap />
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="bg-muted text-muted-foreground text-sm px-4 py-2 rounded-md mt-4">
                  Click "New Workflow" or load a template to start designing.
                </div>
              </Panel>
            )}
          </ReactFlow>

          {/* Context Menu */}
          {contextMenu && (
            <NodeContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              nodeId={contextMenu.nodeId}
              onConfigure={(id) => setConfigNodeId(id)}
              onHistory={(id) => { setHistoryNodeId(id); setHistoryOpen(true); }}
              onDelete={(id) => deleteNode(id)}
              onClose={() => setContextMenu(null)}
            />
          )}

          {/* Execution History Panel */}
          <ExecutionHistoryPanel
            open={historyOpen}
            nodeId={historyNodeId}
            onClose={() => { setHistoryOpen(false); setHistoryNodeId(null); }}
          />
        </div>
      </div>

      {/* Node Configure Dialog */}
      <NodeConfigureDialog
        open={!!configNodeId}
        nodeId={configNodeId}
        nodes={nodes}
        onClose={() => setConfigNodeId(null)}
        onSave={updateNodeData}
      />
    </div>
  );
}
