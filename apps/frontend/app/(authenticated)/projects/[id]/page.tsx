"use client";
import {use, useCallback, useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {apiGet, apiPost, apiPatch} from "@/lib/api/client";
import {EditorContent, useEditor} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import {Table, TableCell, TableHeader, TableRow} from "@tiptap/extension-table";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {createLowlight} from "lowlight";
import {useProjectSocket} from "@/hooks/useProjectSocket";
import {
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Edit2,
    GitBranch,
    ListTodo,
    Loader2,
    MessageSquare,
    Plus,
    RefreshCw,
    Save,
    X,
    Zap,
} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Separator} from "@/components/ui/separator";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Project {
  _id: string;
  name: string;
  slug: string;
  brandColor: string;
  status: string;
  config?: Record<string, unknown>;
}

interface AgentInstance {
  _id: string;
  displayName: string;
  role: string;
  status: "idle" | "busy" | "error";
  tags: string[];
  soul?: string;
  pid?: number;
  templateId?: string;
  config?: { model: string; provider: string };
  aieos_identity?: Record<string, unknown>;
}

interface Epic {
  _id: string;
  title: string;
  status: string;
  description?: string;
}

interface Sprint {
  _id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

interface Story {
  _id: string;
  title: string;
  type: "feature" | "bug" | "chore" | "epic";
  status: string;
  priority: "low" | "medium" | "high" | "critical";
  workflowNodeStatus?: string;
  waitingForApproval?: boolean;
  waitingForAnswer?: boolean;
  epicId?: string;
  sprintId?: string;
  description?: string;
  assignedTo?: string[];
  runId?: string;
  branchName?: string;
}

interface Task {
  _id: string;
  title: string;
  completed: boolean;
}

interface Comment {
  _id: string;
  author: "human" | "agent";
  authorDisplayName: string;
  content: string;
  createdAt: string;
}

interface AgentLog {
  agentInstanceId: string;
  line: string;
  type: "stdout" | "stderr";
  timestamp: string;
}

interface WorkflowTemplate {
  _id: string;
  name: string;
  description?: string;
  nodes?: unknown[];
}

// ─── Analytics Section ───────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  developer: "#004176", reviewer: "#0ea5e9", architect: "#8b5cf6",
  "project-manager": "#f59e0b", tester: "#10b981", librarian: "#ec4899",
};

interface BurnRateEntry { date: string; cost: number; }
interface DistributionEntry { role: string; cost: number; }
interface TranscriptEntry { id: string; timestamp: string; event_type: string; message?: string; }

function AnalyticsSection({ projectId }: { projectId: string }) {
  const [burnRateData, setBurnRateData] = useState<{ data?: BurnRateEntry[]; totalCost?: number; totalTokens?: number } | null>(null);
  const [distributionData, setDistributionData] = useState<{ data?: DistributionEntry[] } | null>(null);

  useEffect(() => {
    if (!projectId) return;
    apiGet<{ data?: BurnRateEntry[]; totalCost?: number; totalTokens?: number }>(`/api/projects/${projectId}/analytics?metric=burn-rate`)
      .then(setBurnRateData)
      .catch(console.error);
    apiGet<{ data?: DistributionEntry[] }>(`/api/projects/${projectId}/analytics?metric=distribution`)
      .then(setDistributionData)
      .catch(console.error);
  }, [projectId]);

  const burnRate = burnRateData?.data ?? [];
  const distribution = distributionData?.data ?? [];
  const totalCost = burnRateData?.totalCost ?? 0;
  const totalTokens = burnRateData?.totalTokens ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="rounded-lg border px-4 py-2 text-center">
          <p className="text-xs text-muted-foreground">Total Cost</p>
          <p className="text-lg font-semibold">${totalCost.toFixed(4)}</p>
        </div>
        <div className="rounded-lg border px-4 py-2 text-center">
          <p className="text-xs text-muted-foreground">Total Tokens</p>
          <p className="text-lg font-semibold">{totalTokens.toLocaleString()}</p>
        </div>
      </div>
      {burnRate.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Burn Rate (USD/day)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={burnRate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(3)}`} />
              <Tooltip formatter={(v) => [`$${(v as number).toFixed(4)}`, "Cost"]} />
              <Area type="monotone" dataKey="cost" stroke="#004176" fill="#004176" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {distribution.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Cost Distribution by Role</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={distribution} dataKey="cost" nameKey="role" cx="50%" cy="50%" outerRadius={70} label={(p) => (p as { role?: string }).role ?? ""}>
                {distribution.map((entry) => (
                  <Cell key={entry.role} fill={ROLE_COLORS[entry.role] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`$${(v as number).toFixed(4)}`, "Cost"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      {burnRate.length === 0 && distribution.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No usage data yet. Analytics appear once agents start running.</p>
      )}
    </div>
  );
}

// ─── Transcript Viewer ────────────────────────────────────────────────────────

function TranscriptViewer({ projectId, runId }: { projectId: string; runId: string }) {
  const [data, setData] = useState<{ entries?: TranscriptEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !runId) return;
    setLoading(true);
    apiGet<{ entries?: TranscriptEntry[] }>(`/api/projects/${projectId}/analytics?metric=transcripts/${runId}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, runId]);

  const entries = data?.entries ?? [];

  const typeColor = (t: string) =>
    ({ llm_response: "text-blue-400", tool_call: "text-yellow-400", system: "text-gray-400" }[t] ?? "text-gray-300");

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  if (entries.length === 0) return <p className="text-sm text-gray-400 text-center py-4">No trace entries found.</p>;

  return (
    <div className="space-y-1 max-h-60 overflow-y-auto font-mono text-xs">
      {entries.map((e) => (
        <div key={e.id} className={`leading-5 ${typeColor(e.event_type)}`}>
          <span className="text-gray-500 mr-2">[{new Date(e.timestamp).toLocaleTimeString()}]</span>
          <span className="opacity-70 mr-2">{e.event_type}</span>
          {e.message && <span>{e.message}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard Tab ───────────────────────────────────────────────────────────

function DashboardTab({ projectId, liveStatuses }: { projectId: string; liveStatuses?: Record<string, string> }) {
  const [indexMsg, setIndexMsg] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentInstance[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [librarianStatus, setLibrarianStatus] = useState("idle");
  const [indexing, setIndexing] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    apiGet<AgentInstance[]>(`/api/projects/${projectId}/agents`)
      .then(d => setAgents(Array.isArray(d) ? d : []))
      .catch(console.error);
    apiGet<Story[]>(`/api/projects/${projectId}/stories`)
      .then(d => setStories(Array.isArray(d) ? d : []))
      .catch(console.error);
    apiGet<{ status: string }>(`/api/projects/${projectId}/librarian/status`)
      .then(d => setLibrarianStatus(d?.status ?? "idle"))
      .catch(console.error);
  }, [projectId]);

  const triggerIngest = async () => {
    setIndexMsg(null);
    setIndexing(true);
    try {
      await apiPost(`/api/projects/${projectId}/librarian/ingest`);
      setIndexMsg("Knowledge ingestion triggered.");
    } catch {
      setIndexMsg("Ingest failed.");
    } finally {
      setIndexing(false);
    }
  };

  const statusColor = (s: string) => ({ idle: "bg-green-500", busy: "bg-yellow-500", error: "bg-red-500" }[s] ?? "bg-gray-500");

  const storyCounts = stories.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});
  const storyStatusLabels: Record<string, string> = {
    backlog: "Backlog", selected: "Selected", in_progress: "In Progress", review: "Review", done: "Done",
  };

  const libStatusColors: Record<string, string> = { idle: "bg-gray-400", indexing: "bg-yellow-500 animate-pulse", done: "bg-green-500", error: "bg-red-500" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Agent Health</h2>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${libStatusColors[librarianStatus] ?? "bg-gray-400"}`} />
            <span>Librarian: {librarianStatus}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={triggerIngest} disabled={indexing}>
          {indexing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Trigger Knowledge Ingestion
        </Button>
      </div>
      {indexMsg && <p className="text-sm text-muted-foreground">{indexMsg}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {agents.map((a) => {
          const liveStatus = liveStatuses?.[a._id] ?? a.status;
          return (
            <div key={a._id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#004176] text-white text-xs">
                    {a.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${statusColor(liveStatus)}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{a.displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">{liveStatus}</p>
              </div>
            </div>
          );
        })}
      </div>

      {stories.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Stories by Status</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(storyStatusLabels).map(([key, label]) => {
              const count = storyCounts[key] ?? 0;
              if (count === 0) return null;
              return (
                <div key={key} className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
                  <span className="font-medium">{count}</span>
                  <span className="text-muted-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-3">Usage Analytics</h3>
        <AnalyticsSection projectId={projectId} />
      </div>
    </div>
  );
}

// ─── Agents Tab ──────────────────────────────────────────────────────────────

export function AgentsTab({ projectId, liveStatuses }: { projectId: string; liveStatuses?: Record<string, string> }) {
  const [selected, setSelected] = useState<AgentInstance | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: "", soul: "", aieosJson: "" });
  const [aieosJsonError, setAieosJsonError] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncFields, setSyncFields] = useState({ soul: true, aieos: true, config: false });
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentInstance[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      apiGet<AgentInstance[]>(`/api/projects/${projectId}/agents`).then(d => Array.isArray(d) ? d : []),
      apiGet<Story[]>(`/api/projects/${projectId}/stories`).then(d => Array.isArray(d) ? d : []),
    ]).then(([agentsData, storiesData]) => {
      setAgents(agentsData);
      setStories(storiesData);
    }).catch(console.error).finally(() => setLoading(false));
  }, [projectId]);

  const refreshAgents = async () => {
    const d = await apiGet<AgentInstance[]>(`/api/projects/${projectId}/agents`).catch(() => [] as AgentInstance[]);
    setAgents(Array.isArray(d) ? d : []);
  };

  const openAgent = (a: AgentInstance) => {
    setSelected(a);
    setEditForm({ displayName: a.displayName, soul: a.soul ?? "", aieosJson: a.aieos_identity ? JSON.stringify(a.aieos_identity, null, 2) : "" });
    setAieosJsonError(null);
    setEditMode(false);
  };

  const saveAgent = async () => {
    if (!selected) return;
    let aieos_identity: Record<string, unknown> | undefined;
    if (editForm.aieosJson.trim()) {
      try {
        aieos_identity = JSON.parse(editForm.aieosJson) as Record<string, unknown>;
        setAieosJsonError(null);
      } catch {
        setAieosJsonError("Invalid JSON");
        return;
      }
    }
    setSaving(true);
    await apiPatch(`/api/projects/${projectId}/agents/${selected._id}`, {
      displayName: editForm.displayName,
      soul: editForm.soul,
      ...(aieos_identity !== undefined ? { aieos_identity } : {}),
    }).catch(console.error);
    setSaving(false);
    setEditMode(false);
    await refreshAgents();
  };

  const syncFromTemplate = async () => {
    if (!selected) return;
    setSyncing(true);
    try {
      await apiPost(`/api/projects/${projectId}/agents/${selected._id}/sync`, { fields: syncFields });
      setSyncToast("Agent synced from template successfully.");
      setSyncOpen(false);
      await refreshAgents();
    } catch {
      setSyncToast("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  const statusColor = (s: string) => ({ idle: "text-green-500", busy: "text-yellow-500", error: "text-red-500" }[s] ?? "text-gray-500");

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => {
          const liveStatus = liveStatuses?.[a._id] ?? a.status;
          return (
            <button key={a._id} onClick={() => openAgent(a)} className="text-left rounded-lg border p-4 hover:border-[#004176] hover:shadow-md transition-all space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-[#004176] text-white">{a.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{a.displayName}</p>
                  <p className={`text-xs capitalize ${statusColor(liveStatus)}`}>{liveStatus}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="capitalize">{a.role}</Badge>
                {a.tags.slice(0, 2).map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
              </div>
              {a.soul && <p className="text-xs text-muted-foreground line-clamp-2">{a.soul}</p>}
            </button>
          );
        })}
      </div>

      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editMode ? "Edit Agent" : selected.displayName}</DialogTitle>
            </DialogHeader>
            {!editMode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12"><AvatarFallback className="bg-[#004176] text-white">{selected.displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  <div>
                    <p className="font-semibold">{selected.displayName}</p>
                    <p className="text-sm text-muted-foreground capitalize">{selected.role} · {selected.status}</p>
                    <p className="text-xs text-muted-foreground">{selected.config?.provider} / {selected.config?.model}</p>
                  </div>
                </div>
                {(() => {
                  const agentStories = stories.filter(s => s.assignedTo?.includes(selected._id));
                  const done = agentStories.filter(s => s.status === "done").length;
                  const current = agentStories.find(s => s.status === "in_progress");
                  if (!agentStories.length) return null;
                  return (
                    <div className="rounded-md border p-3 space-y-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statistics</h4>
                      <p className="text-sm">Stories completed: <span className="font-medium">{done}</span></p>
                      {current && <p className="text-sm truncate">Current: <span className="font-medium">{current.title}</span></p>}
                    </div>
                  );
                })()}
                {selected.soul && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Soul</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.soul}</p>
                  </div>
                )}
                <Button size="sm" onClick={() => setEditMode(true)}><Edit2 className="h-4 w-4 mr-2" />Edit</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-edit-name">Display Name</Label>
                  <Input id="agent-edit-name" value={editForm.displayName} onChange={e => setEditForm({ ...editForm, displayName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-edit-soul">Soul / Persona</Label>
                  <textarea
                    id="agent-edit-soul"
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-y"
                    value={editForm.soul}
                    onChange={e => setEditForm({ ...editForm, soul: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-edit-aieos">AIEOS Identity JSON</Label>
                  <textarea
                    id="agent-edit-aieos"
                    className={`flex min-h-[120px] w-full rounded-md border bg-transparent px-3 py-2 text-xs font-mono shadow-sm resize-y ${aieosJsonError ? "border-red-500" : "border-input"}`}
                    placeholder='{"identity": {"names": ["Agent"]}, ...}'
                    value={editForm.aieosJson}
                    onChange={e => { setEditForm({ ...editForm, aieosJson: e.target.value }); setAieosJsonError(null); }}
                  />
                  {aieosJsonError && <p className="text-xs text-red-500">{aieosJsonError}</p>}
                </div>
                <div className="flex gap-2 justify-end flex-wrap">
                  {selected.templateId && (
                    <Button variant="outline" size="sm" onClick={() => setSyncOpen(true)}>
                      <RefreshCw className="h-4 w-4 mr-2" />Sync from Template
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                  <Button onClick={saveAgent} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" />Save</>}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Sync from Template dialog */}
      {syncOpen && selected && (
        <Dialog open onOpenChange={() => setSyncOpen(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Sync from Template</DialogTitle>
              <DialogDescription>
                Choose which fields to pull from the source template. Instance-specific overrides (display name, tags) are never changed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={syncFields.soul} onChange={e => setSyncFields(f => ({ ...f, soul: e.target.checked }))} className="h-4 w-4" />
                <span className="text-sm">Sync Soul (personality prompt)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={syncFields.aieos} onChange={e => setSyncFields(f => ({ ...f, aieos: e.target.checked }))} className="h-4 w-4" />
                <span className="text-sm">Sync AIEOS Identity (personality JSON)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={syncFields.config} onChange={e => setSyncFields(f => ({ ...f, config: e.target.checked }))} className="h-4 w-4" />
                <span className="text-sm">Sync Config (model, provider, MCP servers)</span>
              </label>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setSyncOpen(false)}>Cancel</Button>
              <Button onClick={syncFromTemplate} disabled={syncing || (!syncFields.soul && !syncFields.aieos && !syncFields.config)}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}Sync
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {syncToast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-green-600 text-white px-4 py-2 shadow-lg text-sm">{syncToast}</div>
      )}
    </>
  );
}

// ─── Backlog Tab ─────────────────────────────────────────────────────────────

function BacklogTab({ projectId }: { projectId: string }) {
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const [storyTasks, setStoryTasks] = useState<Record<string, Task[]>>({});
  const [groupBy, setGroupBy] = useState<"epic" | "sprint">("epic");
  const [showCreate, setShowCreate] = useState(false);
  const [showAddEpic, setShowAddEpic] = useState(false);
  const [newEpicTitle, setNewEpicTitle] = useState("");
  const [addingEpic, setAddingEpic] = useState(false);
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ title: "", type: "feature", priority: "medium", description: "", epicId: "", sprintId: "" });
  const [saving, setSaving] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      apiGet<Story[]>(`/api/projects/${projectId}/stories`).then(d => Array.isArray(d) ? d : []),
      apiGet<Epic[]>(`/api/projects/${projectId}/epics`).then(d => Array.isArray(d) ? d : []),
      apiGet<Sprint[]>(`/api/projects/${projectId}/sprints`).then(d => Array.isArray(d) ? d : []),
    ]).then(([s, e, sp]) => {
      setStories(s);
      setEpics(e);
      setSprints(sp);
    }).catch(console.error).finally(() => setLoading(false));
  }, [projectId]);

  const refreshStories = async () => {
    const d = await apiGet<Story[]>(`/api/projects/${projectId}/stories`).catch(() => [] as Story[]);
    setStories(Array.isArray(d) ? d : []);
  };
  const refreshEpics = async () => {
    const d = await apiGet<Epic[]>(`/api/projects/${projectId}/epics`).catch(() => [] as Epic[]);
    setEpics(Array.isArray(d) ? d : []);
  };
  const refreshSprints = async () => {
    const d = await apiGet<Sprint[]>(`/api/projects/${projectId}/sprints`).catch(() => [] as Sprint[]);
    setSprints(Array.isArray(d) ? d : []);
  };

  const toggleEpic = (id: string) => setExpandedEpics(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const toggleStory = async (storyId: string) => {
    setExpandedStories(prev => {
      const n = new Set(prev);
      if (n.has(storyId)) { n.delete(storyId); return n; }
      n.add(storyId);
      return n;
    });
    if (!storyTasks[storyId]) {
      const tasks = await apiGet<Task[]>(`/api/projects/${projectId}/stories/${storyId}/tasks`).catch(() => [] as Task[]);
      setStoryTasks(prev => ({ ...prev, [storyId]: Array.isArray(tasks) ? tasks : [] }));
    }
  };

  const toggleTask = async (storyId: string, task: Task) => {
    await apiPatch(`/api/projects/${projectId}/stories/${storyId}/tasks/${task._id}`, { completed: !task.completed });
    setStoryTasks(prev => ({
      ...prev,
      [storyId]: (prev[storyId] ?? []).map(t => t._id === task._id ? { ...t, completed: !t.completed } : t),
    }));
  };

  const addTask = async (storyId: string) => {
    const title = taskInputs[storyId]?.trim();
    if (!title) return;
    const task = await apiPost<Task>(`/api/projects/${projectId}/stories/${storyId}/tasks`, { title }).catch(() => null);
    if (task) {
      setStoryTasks(prev => ({ ...prev, [storyId]: [...(prev[storyId] ?? []), task] }));
      setTaskInputs(prev => ({ ...prev, [storyId]: "" }));
    }
  };

  const addEpic = async () => {
    if (!newEpicTitle.trim()) return;
    setAddingEpic(true);
    await apiPost(`/api/projects/${projectId}/epics`, { title: newEpicTitle }).catch(console.error);
    await refreshEpics();
    setNewEpicTitle("");
    setShowAddEpic(false);
    setAddingEpic(false);
  };

  const markSprintReady = async (sprintId: string) => {
    await apiPost(`/api/projects/${projectId}/sprints/${sprintId}/ready`).catch(console.error);
    await refreshSprints();
  };

  const createStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await apiPost(`/api/projects/${projectId}/stories`, form).catch(console.error);
    setSaving(false);
    setShowCreate(false);
    setForm({ title: "", type: "feature", priority: "medium", description: "", epicId: "", sprintId: "" });
    await refreshStories();
  };

  const priorityIcon = (p: string) => ({ critical: "🔴", high: "🟠", medium: "🟡", low: "⚪" }[p] ?? "⚪");

  const renderStoryRow = (s: Story) => (
    <div key={s._id} className="space-y-1">
      <div className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent/50">
        <button onClick={() => toggleStory(s._id)} className="flex-shrink-0 text-muted-foreground hover:text-foreground">
          {expandedStories.has(s._id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="flex-shrink-0">{priorityIcon(s.priority)}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{s.title}</p>
          {s.workflowNodeStatus && <p className="text-xs text-muted-foreground">{s.workflowNodeStatus}</p>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Badge variant="outline" className="text-xs capitalize">{s.type}</Badge>
          <Badge variant="secondary" className="text-xs capitalize">{s.status}</Badge>
        </div>
      </div>

      {/* Task list (expanded) */}
      {expandedStories.has(s._id) && (
        <div className="ml-8 space-y-1">
          {(storyTasks[s._id] ?? []).map(task => (
            <div key={task._id} className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-accent/30">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(s._id, task)}
                className="h-4 w-4 rounded cursor-pointer"
              />
              <span className={`text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
            </div>
          ))}
          {/* Add Task inline */}
          <div className="flex gap-2 px-3 py-1">
            <Input
              placeholder="Add task..."
              value={taskInputs[s._id] ?? ""}
              onChange={e => setTaskInputs(prev => ({ ...prev, [s._id]: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTask(s._id); } }}
              className="h-7 text-xs"
            />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => addTask(s._id)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Backlog ({stories.length})</h2>
        <div className="flex gap-2">
          {/* Group by toggle */}
          <div className="flex rounded-md border overflow-hidden">
            <button
              onClick={() => setGroupBy("epic")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${groupBy === "epic" ? "bg-[#004176] text-white" : "hover:bg-accent"}`}
            >
              By Epic
            </button>
            <button
              onClick={() => setGroupBy("sprint")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${groupBy === "sprint" ? "bg-[#004176] text-white" : "hover:bg-accent"}`}
            >
              By Sprint
            </button>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowAddEpic(true)}><Plus className="h-4 w-4 mr-2" />Add Epic</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />New Story</Button>
        </div>
      </div>

      {/* Add Epic inline form */}
      {showAddEpic && (
        <div className="flex gap-2 items-center rounded-lg border p-3">
          <Input
            autoFocus
            placeholder="Epic title..."
            value={newEpicTitle}
            onChange={e => setNewEpicTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addEpic(); if (e.key === "Escape") setShowAddEpic(false); }}
            className="h-8"
          />
          <Button size="sm" onClick={addEpic} disabled={addingEpic}>{addingEpic ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowAddEpic(false)}><X className="h-4 w-4" /></Button>
        </div>
      )}

      {/* Epic-grouped view */}
      {groupBy === "epic" && (
        <div className="space-y-3">
          {epics.map(epic => {
            const epicStories = stories.filter(s => s.epicId === epic._id);
            const isExpanded = expandedEpics.has(epic._id);
            return (
              <div key={epic._id} className="rounded-lg border">
                <button
                  onClick={() => toggleEpic(epic._id)}
                  className="w-full flex items-center gap-2 p-3 hover:bg-accent/50 rounded-t-lg"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-semibold text-sm">{epic.title}</span>
                  <Badge variant="outline" className="text-xs ml-auto">{epicStories.length} stories</Badge>
                </button>
                {isExpanded && (
                  <div className="border-t p-2 space-y-2">
                    {epicStories.length === 0
                      ? <p className="text-xs text-muted-foreground text-center py-2">No stories in this epic.</p>
                      : epicStories.map(renderStoryRow)
                    }
                  </div>
                )}
              </div>
            );
          })}

          {/* No Epic group */}
          {(() => {
            const epicIds = new Set(epics.map(e => e._id));
            const noEpic = stories.filter(s => !s.epicId || !epicIds.has(s.epicId));
            if (noEpic.length === 0) return null;
            const isExpanded = expandedEpics.has("__no_epic__");
            return (
              <div className="rounded-lg border border-dashed">
                <button
                  onClick={() => toggleEpic("__no_epic__")}
                  className="w-full flex items-center gap-2 p-3 hover:bg-accent/50 rounded-t-lg"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-semibold text-sm text-muted-foreground">No Epic</span>
                  <Badge variant="outline" className="text-xs ml-auto">{noEpic.length} stories</Badge>
                </button>
                {isExpanded && (
                  <div className="border-t p-2 space-y-2">
                    {noEpic.map(renderStoryRow)}
                  </div>
                )}
              </div>
            );
          })()}

          {stories.length === 0 && epics.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No stories in backlog.</p>
          )}
        </div>
      )}

      {/* Sprint-grouped view */}
      {groupBy === "sprint" && (
        <div className="space-y-3">
          {sprints.map(sprint => {
            const sprintStories = stories.filter(s => s.sprintId === sprint._id);
            const isExpanded = expandedEpics.has(sprint._id);
            return (
              <div key={sprint._id} className="rounded-lg border">
                <div className="flex items-center gap-2 p-3">
                  <button onClick={() => toggleEpic(sprint._id)} className="flex items-center gap-2 flex-1">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-semibold text-sm">{sprint.name}</span>
                    <Badge variant={sprint.status === "active" ? "default" : "outline"} className="text-xs capitalize">{sprint.status}</Badge>
                    <Badge variant="outline" className="text-xs ml-auto">{sprintStories.length} stories</Badge>
                  </button>
                  {sprint.status !== "ready" && sprint.status !== "completed" && (
                    <Button size="sm" variant="outline" className="ml-2" onClick={() => markSprintReady(sprint._id)}>
                      <CheckCircle className="h-3 w-3 mr-1" />Mark Ready
                    </Button>
                  )}
                </div>
                {sprint.startDate && (
                  <p className="text-xs text-muted-foreground px-3 pb-2">
                    {new Date(sprint.startDate).toLocaleDateString()} → {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : "—"}
                  </p>
                )}
                {isExpanded && (
                  <div className="border-t p-2 space-y-2">
                    {sprintStories.length === 0
                      ? <p className="text-xs text-muted-foreground text-center py-2">No stories in this sprint.</p>
                      : sprintStories.map(renderStoryRow)
                    }
                  </div>
                )}
              </div>
            );
          })}
          {/* Unscheduled stories */}
          {(() => {
            const sprintIds = new Set(sprints.map(s => s._id));
            const unscheduled = stories.filter(s => !s.sprintId || !sprintIds.has(s.sprintId));
            if (unscheduled.length === 0) return null;
            const isExpanded = expandedEpics.has("__unscheduled__");
            return (
              <div className="rounded-lg border border-dashed">
                <button
                  onClick={() => toggleEpic("__unscheduled__")}
                  className="w-full flex items-center gap-2 p-3 hover:bg-accent/50"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-semibold text-sm text-muted-foreground">Unscheduled</span>
                  <Badge variant="outline" className="text-xs ml-auto">{unscheduled.length}</Badge>
                </button>
                {isExpanded && (
                  <div className="border-t p-2 space-y-2">
                    {unscheduled.map(renderStoryRow)}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Create Story Modal */}
      {showCreate && (
        <Dialog open onOpenChange={() => setShowCreate(false)}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Story</DialogTitle></DialogHeader>
            <form onSubmit={createStory} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option>feature</option><option>bug</option><option>chore</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    <option>low</option><option>medium</option><option>high</option><option>critical</option>
                  </select>
                </div>
              </div>
              {epics.length > 0 && (
                <div className="space-y-2">
                  <Label>Epic</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.epicId} onChange={e => setForm({ ...form, epicId: e.target.value })}>
                    <option value="">— No Epic —</option>
                    {epics.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
                  </select>
                </div>
              )}
              {sprints.length > 0 && (
                <div className="space-y-2">
                  <Label>Sprint</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.sprintId} onChange={e => setForm({ ...form, sprintId: e.target.value })}>
                    <option value="">— No Sprint —</option>
                    {sprints.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Kanban Board ────────────────────────────────────────────────────────────

const KANBAN_COLUMNS = ["backlog", "selected", "in_progress", "review", "done"] as const;
const COLUMN_LABELS: Record<string, string> = {
  backlog: "Backlog", selected: "Selected for Dev", in_progress: "In Progress", review: "Review", done: "Done"
};
const PRIORITY_BORDER: Record<string, string> = {
  critical: "border-l-4 border-l-red-500", high: "border-l-4 border-l-orange-500",
  medium: "border-l-4 border-l-yellow-500", low: ""
};

export function KanbanTab({
  projectId,
  liveStoryStatuses,
  liveAgentLogs,
}: {
  projectId: string;
  liveStoryStatuses?: Record<string, string>;
  liveAgentLogs?: AgentLog[];
}) {
  const [selected, setSelected] = useState<Story | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [filterApproval, setFilterApproval] = useState(false);
  const [filterAnswer, setFilterAnswer] = useState(false);
  const [ticketTab, setTicketTab] = useState<"discussion" | "tasks" | "activity">("discussion");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);
  const [answerText, setAnswerText] = useState("");
  // Optimistic story status overrides for drag-and-drop
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, string>>({});
  const [storiesData, setStoriesData] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    apiGet<Story[]>(`/api/projects/${projectId}/stories`)
      .then(d => setStoriesData(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  const refreshStories = async () => {
    const d = await apiGet<Story[]>(`/api/projects/${projectId}/stories`).catch(() => [] as Story[]);
    setStoriesData(Array.isArray(d) ? d : []);
  };

  // Apply optimistic overrides then live WebSocket statuses
  const stories = storiesData.map(s => {
    const optimistic = optimisticStatuses[s._id];
    const live = liveStoryStatuses?.[s._id];
    return { ...s, status: live ?? optimistic ?? s.status };
  });

  // Auto-move selected modal's story when live status changes
  useEffect(() => {
    if (selected && liveStoryStatuses?.[selected._id]) {
      setSelected(prev => prev ? { ...prev, status: liveStoryStatuses![prev._id] } : prev);
    }
  }, [liveStoryStatuses, selected?._id]);

  let displayed = stories;
  if (filterApproval) displayed = displayed.filter(s => s.waitingForApproval);
  if (filterAnswer) displayed = displayed.filter(s => s.waitingForAnswer);

  const openTicket = async (story: Story) => {
    setSelected(story);
    setTicketTab("discussion");
    setAnswerText("");
    const [commentsData, tasksData] = await Promise.all([
      apiGet<Comment[]>(`/api/projects/${projectId}/stories/${story._id}/comments`).catch(() => [] as Comment[]),
      apiGet<Task[]>(`/api/projects/${projectId}/stories/${story._id}/tasks`).catch(() => [] as Task[]),
    ]);
    setComments(Array.isArray(commentsData) ? commentsData : []);
    setTasks(Array.isArray(tasksData) ? tasksData : []);
  };

  const postComment = async () => {
    if (!selected || !newComment.trim()) return;
    setPosting(true);
    await apiPost(`/api/projects/${projectId}/stories/${selected._id}/comments`, { content: newComment }).catch(console.error);
    setNewComment("");
    const updated = await apiGet<Comment[]>(`/api/projects/${projectId}/stories/${selected._id}/comments`).catch(() => [] as Comment[]);
    setComments(Array.isArray(updated) ? updated : []);
    setPosting(false);
  };

  const approve = async () => {
    if (!selected) return;
    await apiPost(`/api/projects/${projectId}/stories/${selected._id}/approve`).catch(console.error);
    await refreshStories();
    setSelected(null);
  };

  const answer = async () => {
    if (!selected || !answerText.trim()) return;
    setAnswering(true);
    await apiPost(`/api/projects/${projectId}/stories/${selected._id}/answer`, { content: answerText }).catch(console.error);
    setAnswerText("");
    await refreshStories();
    const updated = await apiGet<Comment[]>(`/api/projects/${projectId}/stories/${selected._id}/comments`).catch(() => [] as Comment[]);
    setComments(Array.isArray(updated) ? updated : []);
    setAnswering(false);
  };

  const toggleTaskCompleted = async (task: Task) => {
    if (!selected) return;
    await apiPatch(`/api/projects/${projectId}/stories/${selected._id}/tasks/${task._id}`, { completed: !task.completed }).catch(console.error);
    setTasks(prev => prev.map(t => t._id === task._id ? { ...t, completed: !t.completed } : t));
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, storyId: string) => {
    setDraggedId(storyId);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(col);
  };
  const handleDrop = async (e: React.DragEvent, toCol: string) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedId) return;
    const story = storiesData.find(s => s._id === draggedId);
    if (!story || story.status === toCol) { setDraggedId(null); return; }
    // Optimistic update
    setOptimisticStatuses(prev => ({ ...prev, [draggedId]: toCol }));
    setDraggedId(null);
    await apiPatch(`/api/projects/${projectId}/stories/${draggedId}`, { status: toCol }).catch(console.error);
    await refreshStories();
    setOptimisticStatuses(prev => { const n = { ...prev }; delete n[draggedId!]; return n; });
  };
  const handleDragLeave = () => setDragOverCol(null);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      <div className="flex gap-3 mb-4 flex-wrap">
        <Button size="sm" variant={filterApproval ? "default" : "outline"} onClick={() => setFilterApproval(!filterApproval)}>
          <CheckCircle className="h-4 w-4 mr-2" />Waiting Approval
        </Button>
        <Button size="sm" variant={filterAnswer ? "default" : "outline"} onClick={() => setFilterAnswer(!filterAnswer)}>
          <MessageSquare className="h-4 w-4 mr-2" />Waiting Answer
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map(col => {
          const colStories = displayed.filter(s => s.status === col);
          return (
            <div
              key={col}
              className={`flex-shrink-0 w-64 space-y-2 rounded-lg p-2 transition-colors ${dragOverCol === col ? "bg-accent/30 ring-2 ring-[#004176]/30" : ""}`}
              onDragOver={e => handleDragOver(e, col)}
              onDrop={e => handleDrop(e, col)}
              onDragLeave={handleDragLeave}
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-medium">{COLUMN_LABELS[col]}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{colStories.length}</span>
              </div>
              <div className="space-y-2">
                {colStories.map(s => (
                  <div
                    key={s._id}
                    draggable
                    onDragStart={e => handleDragStart(e, s._id)}
                    onClick={() => openTicket(s)}
                    className={`cursor-grab active:cursor-grabbing w-full text-left rounded-md border bg-card p-3 hover:shadow-md transition-all space-y-1.5 ${PRIORITY_BORDER[s.priority]} ${draggedId === s._id ? "opacity-50" : ""}`}
                  >
                    <p className="text-sm font-medium line-clamp-2">{s.title}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs capitalize">{s.type}</Badge>
                      {s.waitingForApproval && <Badge variant="secondary" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Approval</Badge>}
                      {s.waitingForAnswer && <Badge variant="secondary" className="text-xs"><MessageSquare className="h-3 w-3 mr-1" />Answer</Badge>}
                    </div>
                    {s.workflowNodeStatus && <p className="text-xs text-muted-foreground">{s.workflowNodeStatus}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ticket Modal */}
      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selected.title}</DialogTitle>
              <DialogDescription>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="capitalize">{selected.type}</Badge>
                  <Badge variant="outline" className="capitalize">{selected.status}</Badge>
                  {selected.waitingForApproval && <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Waiting Approval</Badge>}
                  {selected.waitingForAnswer && <Badge variant="secondary"><MessageSquare className="h-3 w-3 mr-1" />Waiting Answer</Badge>}
                </div>
              </DialogDescription>
            </DialogHeader>

            {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
            {selected.workflowNodeStatus && (
              <div className="flex items-center gap-2 text-sm">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{selected.workflowNodeStatus}</span>
              </div>
            )}

            {/* Tab nav */}
            <div className="flex border-b gap-4">
              {(["discussion", "tasks", "activity"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setTicketTab(tab)}
                  className={`pb-2 text-sm font-medium capitalize border-b-2 transition-colors ${ticketTab === tab ? "border-[#004176] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  {tab === "activity" ? "Live Activity" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Discussion tab */}
            {ticketTab === "discussion" && (
              <div className="space-y-3">
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {comments.map(c => (
                    <div key={c._id} className={`flex gap-2 ${c.author === "human" ? "flex-row-reverse" : ""}`}>
                      <div className={`rounded-lg p-2.5 text-sm max-w-[80%] ${c.author === "human" ? "bg-[#004176] text-white" : "bg-muted"}`}>
                        <p className="text-xs font-medium mb-1 opacity-70">{c.authorDisplayName}</p>
                        <p>{c.content}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No messages yet.</p>}
                </div>
                <div className="flex gap-2">
                  <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Type a message..." onKeyDown={e => e.key === "Enter" && postComment()} />
                  <Button size="sm" onClick={postComment} disabled={posting || !newComment.trim()}>
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                  </Button>
                </div>
              </div>
            )}

            {/* Tasks tab */}
            {ticketTab === "tasks" && (
              <div className="space-y-2">
                {tasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No tasks yet.</p>}
                {tasks.map(task => (
                  <div key={task._id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/30">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTaskCompleted(task)}
                      className="h-4 w-4 rounded cursor-pointer"
                    />
                    <span className={`text-sm flex-1 ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                  <ListTodo className="h-4 w-4" />
                  <span>{tasks.filter(t => t.completed).length}/{tasks.length} completed</span>
                </div>
              </div>
            )}

            {/* Live Activity tab */}
            {ticketTab === "activity" && (
              <div className="space-y-3">
                <div className="bg-black/90 rounded-md p-3 font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
                  {(liveAgentLogs ?? []).length === 0 && (
                    <p className="text-gray-400 text-center py-2">No live activity. Logs appear here when agents are active.</p>
                  )}
                  {(liveAgentLogs ?? []).map((log, i) => (
                    <div key={i} className={`leading-5 ${log.type === "stderr" ? "text-red-400" : "text-green-300"}`}>
                      <span className="text-gray-500 mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      {log.line}
                    </div>
                  ))}
                </div>
                {selected.runId && (
                  <div>
                    <p className="text-xs font-semibold mb-1 text-muted-foreground">Historical Trace (run: {selected.runId.slice(0, 8)}…)</p>
                    <div className="bg-black/90 rounded-md p-3">
                      <TranscriptViewer projectId={projectId} runId={selected.runId} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              {selected.waitingForApproval && (
                <Button className="flex-1" onClick={approve}>
                  <CheckCircle className="h-4 w-4 mr-2" />Approve & Merge PR
                </Button>
              )}
              {selected.waitingForAnswer && (
                <div className="flex-1 space-y-2">
                  <Input
                    value={answerText}
                    onChange={e => setAnswerText(e.target.value)}
                    placeholder="Type your answer..."
                    onKeyDown={e => e.key === "Enter" && answer()}
                  />
                  <Button className="w-full" onClick={answer} disabled={answering || !answerText.trim()}>
                    {answering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                    Answer
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ─── Blueprints Tab (Workflow Designer) ──────────────────────────────────────

function BlueprintsTab({ projectId }: { projectId: string }) {
  const [selected, setSelected] = useState<WorkflowTemplate | null>(null);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    apiGet<WorkflowTemplate[]>(`/api/projects/${projectId}/workflows`)
      .then(d => setTemplates(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  const triggerWorkflow = async (templateId: string) => {
    setTriggerMsg(null);
    setTriggering(templateId);
    try {
      await apiPost(`/api/projects/${projectId}/workflows`, { templateId });
      setTriggerMsg("Workflow triggered successfully.");
    } catch {
      setTriggerMsg("Failed to trigger workflow.");
    } finally {
      setTriggering(null);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Workflow Blueprints</h2>
      </div>

      {triggerMsg && <Alert><AlertDescription>{triggerMsg}</AlertDescription></Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map(t => (
          <div key={t._id} className="rounded-lg border p-4 space-y-3">
            <div>
              <p className="font-medium">{t.name}</p>
              {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
              <p className="text-xs text-muted-foreground mt-1">{(t.nodes ?? []).length} nodes</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelected(t)}>View</Button>
              <Button size="sm" onClick={() => triggerWorkflow(t._id)} disabled={triggering === t._id}>
                {triggering === t._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4 mr-2" />Run</>}
              </Button>
            </div>
          </div>
        ))}
        {templates.length === 0 && <p className="col-span-full text-center text-muted-foreground py-12">No workflow templates available.</p>}
      </div>

      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{selected.name}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              {(selected.nodes as Array<{ id: string; type?: string; description?: string }> ?? []).map((n, i) => (
                <div key={n.id ?? i} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span className="capitalize">{n.type}</span>
                  {n.description && <span className="text-muted-foreground text-xs">— {n.description}</span>}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Tiptap Lowlight instance ────────────────────────────────────────────────
const lowlight = createLowlight();

// ─── Requirements Tab ─────────────────────────────────────────────────────────

interface ReqDoc {
  _id: string;
  title: string;
  content: unknown;
  parentId?: string | null;
  order: number;
}

function ReqDocTree({
  docs,
  parentId,
  depth,
  selected,
  onSelect,
}: {
  docs: ReqDoc[];
  parentId: string | null;
  depth: number;
  selected: ReqDoc | null;
  onSelect: (doc: ReqDoc) => void;
}) {
  const children = docs.filter(d => (d.parentId ?? null) === parentId);
  if (children.length === 0) return null;
  return (
    <>
      {children.map(d => (
        <div key={d._id}>
          <button
            onClick={() => onSelect(d)}
            style={{ paddingLeft: `${depth * 12 + 12}px` }}
            className={`w-full text-left rounded-md py-2 pr-3 text-sm transition-colors ${selected?._id === d._id ? "bg-[#004176] text-white" : "hover:bg-accent"}`}
          >
            {d.title}
          </button>
          <ReqDocTree
            docs={docs}
            parentId={d._id}
            depth={depth + 1}
            selected={selected}
            onSelect={onSelect}
          />
        </div>
      ))}
    </>
  );
}

function RequirementsTab({ projectId }: { projectId: string }) {
  const [selected, setSelected] = useState<ReqDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState<ReqDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef<ReqDoc | null>(null);
  selectedRef.current = selected;

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    apiGet<ReqDoc[]>(`/api/projects/${projectId}/requirements`)
      .then(d => setDocs(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  const refreshDocs = async () => {
    const d = await apiGet<ReqDoc[]>(`/api/projects/${projectId}/requirements`).catch(() => [] as ReqDoc[]);
    setDocs(Array.isArray(d) ? d : []);
  };

  const saveDoc = useCallback(async (docId: string, newContent: unknown) => {
    setSaving(true);
    await apiPatch(`/api/projects/${projectId}/requirements/${docId}`, { content: newContent }).catch(console.error);
    setSaving(false);
  }, [projectId]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      const doc = selectedRef.current;
      if (!doc) return;
      const json = editor.getJSON();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveDoc(doc._id, json), 2000);
    },
  });

  const selectDoc = (doc: ReqDoc) => {
    setSelected(doc);
    if (editor) {
      try {
        editor.commands.setContent(doc.content as any ?? "");
      } catch {
        editor.commands.setContent("");
      }
    }
  };

  const createDoc = async (parentId?: string) => {
    const doc = await apiPost<ReqDoc>(`/api/projects/${projectId}/requirements`, { title: "New Document", content: "", parentId: parentId ?? null }).catch(() => null);
    if (doc) {
      await refreshDocs();
      selectDoc(doc);
    }
  };

  const manualSave = () => {
    if (!selected || !editor) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveDoc(selected._id, editor.getJSON());
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="flex gap-4 h-full min-h-[600px]">
      {/* Document tree */}
      <div className="w-56 shrink-0 space-y-1 border-r pr-2">
        <Button size="sm" className="w-full mb-2" onClick={() => createDoc()}><Plus className="h-4 w-4 mr-2" />New Doc</Button>
        <ReqDocTree docs={docs} parentId={null} depth={0} selected={selected} onSelect={selectDoc} />
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {selected ? (
          <>
            <div className="flex items-center justify-between">
              <p className="font-medium truncate">{selected.title}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                {saving && <span className="text-xs text-muted-foreground">Saving...</span>}
                <Button size="sm" onClick={manualSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />Save
                </Button>
              </div>
            </div>

            {/* Tiptap toolbar */}
            {editor && (
              <div className="flex flex-wrap gap-1 border rounded-md p-1.5 bg-muted/30">
                <button onClick={() => editor.chain().focus().toggleBold().run()} className={`px-2 py-1 text-xs rounded ${editor.isActive("bold") ? "bg-[#004176] text-white" : "hover:bg-accent"}`}><strong>B</strong></button>
                <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-2 py-1 text-xs rounded ${editor.isActive("italic") ? "bg-[#004176] text-white" : "hover:bg-accent"}`}><em>I</em></button>
                <button onClick={() => editor.chain().focus().toggleCode().run()} className={`px-2 py-1 text-xs rounded font-mono ${editor.isActive("code") ? "bg-[#004176] text-white" : "hover:bg-accent"}`}>`_`</button>
                <span className="w-px bg-border mx-1" />
                {[1, 2, 3].map(level => (
                  <button key={level} onClick={() => editor.chain().focus().toggleHeading({ level: level as 1|2|3 }).run()} className={`px-2 py-1 text-xs rounded ${editor.isActive("heading", { level }) ? "bg-[#004176] text-white" : "hover:bg-accent"}`}>H{level}</button>
                ))}
                <span className="w-px bg-border mx-1" />
                <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-2 py-1 text-xs rounded ${editor.isActive("bulletList") ? "bg-[#004176] text-white" : "hover:bg-accent"}`}>• List</button>
                <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`px-2 py-1 text-xs rounded ${editor.isActive("orderedList") ? "bg-[#004176] text-white" : "hover:bg-accent"}`}>1. List</button>
                <span className="w-px bg-border mx-1" />
                <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`px-2 py-1 text-xs rounded font-mono ${editor.isActive("codeBlock") ? "bg-[#004176] text-white" : "hover:bg-accent"}`}>{"</>"}</button>
                <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="px-2 py-1 text-xs rounded hover:bg-accent">⊞ Table</button>
                <button onClick={() => {
                  const url = window.prompt("Image URL:");
                  if (url) editor.chain().focus().setImage({ src: url }).run();
                }} className="px-2 py-1 text-xs rounded hover:bg-accent">🖼 Image</button>
              </div>
            )}

            {/* Editor content */}
            <div className="flex-1 border rounded-md p-3 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
              <EditorContent editor={editor} className="min-h-[300px] outline-none" />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-muted-foreground">
            Select or create a document
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function ProjectSettingsTab({ project, projectId }: { project: Project; projectId: string }) {
  const [form, setForm] = useState({
    name: project.name,
    brandColor: project.brandColor,
    slackToken: "",
    slackSigningSecret: "",
    slackChannelId: "",
    inviteSlackIds: "",
    githubRepo: "",
    githubAppId: "",
    githubPrivateKey: "",
    githubInstallationId: "",
    githubWebhookSecret: "",
    openaiKey: "",
    anthropicKey: "",
    googleKey: "",
    mcpServers: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);
  const [slackTestMsg, setSlackTestMsg] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    const githubApp: Record<string, string> = {};
    if (form.githubAppId) githubApp.appId = form.githubAppId;
    if (form.githubPrivateKey) githubApp.privateKey = form.githubPrivateKey;
    if (form.githubInstallationId) githubApp.installationId = form.githubInstallationId;
    if (form.githubWebhookSecret) githubApp.webhookSecret = form.githubWebhookSecret;

    await apiPatch(`/api/projects/${projectId}`, {
      name: form.name,
      brandColor: form.brandColor,
      config: {
        ...(form.slackToken ? { slackToken: form.slackToken } : {}),
        ...(form.slackSigningSecret ? { slackSigningSecret: form.slackSigningSecret } : {}),
        ...(form.slackChannelId ? { slackChannelId: form.slackChannelId } : {}),
        ...(form.githubRepo ? { repoUrl: form.githubRepo } : {}),
        ...(Object.keys(githubApp).length ? { githubApp } : {}),
        llmKeys: {
          ...(form.openaiKey ? { openai: form.openaiKey } : {}),
          ...(form.anthropicKey ? { anthropic: form.anthropicKey } : {}),
          ...(form.googleKey ? { google: form.googleKey } : {}),
        },
        ...(form.mcpServers ? { mcpServers: form.mcpServers.split("\n").filter(Boolean) } : {}),
        ...(form.inviteSlackIds ? { inviteUsers: form.inviteSlackIds.split(",").map(s => s.trim()).filter(Boolean) } : {}),
      },
    }).then(() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }).catch(console.error);
    setSaving(false);
  };

  const testSlack = async () => {
    setTestingSlack(true);
    setSlackTestMsg(null);
    try {
      await apiGet(`/api/projects/${projectId}`);
      setSlackTestMsg("Slack connection test requires a configured token.");
    } catch {
      setSlackTestMsg("Unable to reach backend.");
    } finally {
      setTestingSlack(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {saved && <Alert><AlertDescription>Settings saved successfully.</AlertDescription></Alert>}

      {/* General */}
      <div className="space-y-4">
        <h3 className="font-semibold">General</h3>
        <div className="space-y-2">
          <Label>Project Name</Label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Brand Color</Label>
          <div className="flex gap-3 items-center">
            <input type="color" value={form.brandColor} onChange={e => setForm({ ...form, brandColor: e.target.value })} className="h-9 w-16 rounded cursor-pointer" />
            <Input value={form.brandColor} onChange={e => setForm({ ...form, brandColor: e.target.value })} className="max-w-[120px]" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Slack */}
      <div className="space-y-4">
        <h3 className="font-semibold">Slack Integration</h3>
        <p className="text-xs text-muted-foreground">See <code>docs/slack-app-setup.md</code> for setup instructions.</p>
        <div className="space-y-2">
          <Label>Signing Secret</Label>
          <Input type="password" value={form.slackSigningSecret} onChange={e => setForm({ ...form, slackSigningSecret: e.target.value })} placeholder="your-signing-secret" />
          <p className="text-xs text-muted-foreground">Overrides the global signing secret for this project's Slack workspace.</p>
        </div>
        <div className="space-y-2">
          <Label>Bot Token (xoxb-...)</Label>
          <Input type="password" value={form.slackToken} onChange={e => setForm({ ...form, slackToken: e.target.value })} placeholder="xoxb-..." />
        </div>
        <div className="space-y-2">
          <Label>Channel ID</Label>
          <Input value={form.slackChannelId} onChange={e => setForm({ ...form, slackChannelId: e.target.value })} placeholder="C01234567" />
        </div>
        <div className="space-y-2">
          <Label>Invite Slack User IDs (comma-separated)</Label>
          <Input value={form.inviteSlackIds} onChange={e => setForm({ ...form, inviteSlackIds: e.target.value })} placeholder="U12345678, U98765432" />
          <p className="text-xs text-muted-foreground">Project-specific list overrides the global invite list.</p>
        </div>
        <Button variant="outline" size="sm" onClick={testSlack} disabled={testingSlack}>
          {testingSlack ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Test Slack Connection
        </Button>
        {slackTestMsg && <p className="text-sm text-muted-foreground">{slackTestMsg}</p>}
      </div>

      <Separator />

      {/* GitHub */}
      <div className="space-y-4">
        <h3 className="font-semibold">GitHub Integration</h3>
        <p className="text-xs text-muted-foreground">See <code>docs/github-app-setup.md</code> for setup instructions.</p>
        <div className="space-y-2">
          <Label>Repository (owner/repo or URL)</Label>
          <Input value={form.githubRepo} onChange={e => setForm({ ...form, githubRepo: e.target.value })} placeholder="my-org/my-repo" />
        </div>
        <div className="space-y-2">
          <Label>GitHub App ID</Label>
          <Input value={form.githubAppId} onChange={e => setForm({ ...form, githubAppId: e.target.value })} placeholder="123456" />
        </div>
        <div className="space-y-2">
          <Label>GitHub App Private Key (.pem contents)</Label>
          <textarea
            className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono shadow-sm resize-y"
            value={form.githubPrivateKey}
            onChange={e => setForm({ ...form, githubPrivateKey: e.target.value })}
            placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;..."
          />
        </div>
        <div className="space-y-2">
          <Label>Installation ID</Label>
          <Input value={form.githubInstallationId} onChange={e => setForm({ ...form, githubInstallationId: e.target.value })} placeholder="12345678" />
        </div>
        <div className="space-y-2">
          <Label>Webhook Secret</Label>
          <Input type="password" value={form.githubWebhookSecret} onChange={e => setForm({ ...form, githubWebhookSecret: e.target.value })} placeholder="your-webhook-secret" />
        </div>
      </div>

      <Separator />

      {/* LLM Keys */}
      <div className="space-y-4">
        <h3 className="font-semibold">LLM API Keys</h3>
        <p className="text-sm text-muted-foreground">Project-specific keys override global settings.</p>
        <div className="space-y-2">
          <Label>OpenAI API Key</Label>
          <Input type="password" value={form.openaiKey} onChange={e => setForm({ ...form, openaiKey: e.target.value })} placeholder="sk-..." />
        </div>
        <div className="space-y-2">
          <Label>Anthropic API Key</Label>
          <Input type="password" value={form.anthropicKey} onChange={e => setForm({ ...form, anthropicKey: e.target.value })} placeholder="sk-ant-..." />
        </div>
        <div className="space-y-2">
          <Label>Google API Key</Label>
          <Input type="password" value={form.googleKey} onChange={e => setForm({ ...form, googleKey: e.target.value })} placeholder="AIza..." />
        </div>
      </div>

      <Separator />

      {/* MCP Servers */}
      <div className="space-y-4">
        <h3 className="font-semibold">MCP Servers</h3>
        <p className="text-sm text-muted-foreground">List MCP server URLs (one per line).</p>
        <textarea
          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono resize-y"
          value={form.mcpServers}
          onChange={e => setForm({ ...form, mcpServers: e.target.value })}
          placeholder="http://localhost:3100&#10;http://localhost:3101"
        />
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" />Save Settings</>}
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [liveAgentStatuses, setLiveAgentStatuses] = useState<Record<string, string>>({});
  const [liveStoryStatuses, setLiveStoryStatuses] = useState<Record<string, string>>({});
  const [liveAgentLogs, setLiveAgentLogs] = useState<AgentLog[]>([]);

  useProjectSocket(id, {
    onAgentStatus: useCallback(({ agentInstanceId, status }: { agentInstanceId: string; status: string }) => {
      setLiveAgentStatuses(prev => ({ ...prev, [agentInstanceId]: status }));
    }, []),
    onAgentLog: useCallback((log: AgentLog) => {
      setLiveAgentLogs(prev => [...prev.slice(-199), log]);
    }, []),
    onStoryStatus: useCallback(({ storyId, status }: { storyId: string; status: string }) => {
      setLiveStoryStatuses(prev => ({ ...prev, [storyId]: status }));
    }, []),
  });

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiGet<Project>(`/api/projects/${id}`)
      .then(setProject)
      .catch(() => router.push("/projects"))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    if (!loading && !project) router.push("/projects");
  }, [loading, project, router]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!project) return null;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: project.brandColor }}>
          {project.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold">{project.name}</h1>
          <p className="text-xs text-muted-foreground">{project.slug}</p>
        </div>
        <Badge variant={project.status === "active" ? "success" : "secondary"} className="ml-2">{project.status}</Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="flex-1 flex flex-col min-h-0">
        <TabsList className="flex-shrink-0 flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="backlog">Backlog</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="blueprints">Blueprints</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto mt-4">
          <TabsContent value="dashboard"><DashboardTab projectId={id} liveStatuses={liveAgentStatuses} /></TabsContent>
          <TabsContent value="agents"><AgentsTab projectId={id} liveStatuses={liveAgentStatuses} /></TabsContent>
          <TabsContent value="backlog"><BacklogTab projectId={id} /></TabsContent>
          <TabsContent value="kanban"><KanbanTab projectId={id} liveStoryStatuses={liveStoryStatuses} liveAgentLogs={liveAgentLogs} /></TabsContent>
          <TabsContent value="blueprints"><BlueprintsTab projectId={id} /></TabsContent>
          <TabsContent value="requirements" className="h-full"><RequirementsTab projectId={id} /></TabsContent>
          <TabsContent value="settings"><ProjectSettingsTab project={project} projectId={id} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
