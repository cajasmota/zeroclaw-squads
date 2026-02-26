"use client";
import { useState } from "react";
import { Plus, Search, Download, Upload, Loader2, Edit2, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGet, axiosPost, axiosPatch } from "@/lib/api/axios";
import { KEYS } from "@/lib/api/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AgentTemplate {
  _id: string;
  displayName: string;
  role: string;
  tags: string[];
  soul: string;
  aieos_identity: Record<string, unknown>;
  config: {
    model: string;
    provider: string;
    canWriteCode: boolean;
    skills: string;
    mcpServers: string[];
  };
  createdAt: string;
}

const ROLES = ["all", "developer", "reviewer", "architect", "pm", "librarian", "tester"];
const ROLE_COLORS: Record<string, string> = {
  developer: "bg-blue-500",
  reviewer: "bg-purple-500",
  architect: "bg-orange-500",
  pm: "bg-green-500",
  librarian: "bg-yellow-500",
  tester: "bg-red-500",
};

function TemplateCard({ template, onSelect }: { template: AgentTemplate; onSelect: () => void }) {
  const initials = template.displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <button
      onClick={onSelect}
      className="text-left flex flex-col gap-3 rounded-lg border p-4 hover:border-[#004176] hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${ROLE_COLORS[template.role] ?? "bg-gray-500"} text-white text-sm font-bold`}>
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate">{template.displayName}</p>
          <p className="text-xs text-muted-foreground capitalize">{template.role}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{template.soul?.slice(0, 100) || "No soul defined."}</p>
      <div className="flex flex-wrap gap-1">
        {template.tags.slice(0, 3).map((t) => (
          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{template.config?.provider} / {template.config?.model}</p>
    </button>
  );
}

function TemplateModal({ template, onClose }: { template: AgentTemplate | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(!template);
  const [form, setForm] = useState({
    displayName: template?.displayName ?? "",
    role: template?.role ?? "developer",
    soul: template?.soul ?? "",
    tags: template?.tags.join(", ") ?? "",
    model: template?.config?.model ?? "qwen2.5-coder:1.5b",
    provider: template?.config?.provider ?? "ollama",
    canWriteCode: template?.config?.canWriteCode ?? false,
    skills: template?.config?.skills ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [showAieos, setShowAieos] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        displayName: form.displayName,
        role: form.role,
        soul: form.soul,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        config: { model: form.model, provider: form.provider, canWriteCode: form.canWriteCode, skills: form.skills, mcpServers: template?.config?.mcpServers ?? [] },
      };
      return template
        ? axiosPatch<AgentTemplate>(`/api/templates/${template._id}`, payload)
        : axiosPost<AgentTemplate>("/api/templates", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.templates() });
      onClose();
    },
    onError: (err: Error) => setError(err.message ?? "Save failed"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? (editMode ? "Edit Template" : template.displayName) : "New Template"}</DialogTitle>
        </DialogHeader>

        {!editMode && template ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge>{template.role}</Badge>
              {template.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
            </div>
            <div>
              <h3 className="text-sm font-medium mb-1">Soul / Persona</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{template.soul}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-1">Model Config</h3>
              <p className="text-sm text-muted-foreground">{template.config?.provider} / {template.config?.model}</p>
            </div>
            <Button onClick={() => setEditMode(true)} variant="outline"><Edit2 className="h-4 w-4 mr-2" />Edit</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.filter(r => r !== "all").map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="typescript, react, nestjs" />
            </div>

            <div className="space-y-2">
              <Label>Soul / Persona Prompt</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-y"
                value={form.soul}
                onChange={(e) => setForm({ ...form, soul: e.target.value })}
                placeholder="You are an expert..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="canWriteCode" checked={form.canWriteCode} onChange={(e) => setForm({ ...form, canWriteCode: e.target.checked })} />
              <Label htmlFor="canWriteCode">Can Write Code</Label>
            </div>

            {/* AIEOS Section */}
            <div>
              <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setShowAieos(!showAieos)}>
                {showAieos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                AIEOS v1.1 Identity (Advanced)
              </button>
              {showAieos && template && (
                <div className="mt-2 p-3 rounded-md border text-xs text-muted-foreground font-mono">
                  <pre>{JSON.stringify(template.aieos_identity, null, 2)}</pre>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => template ? setEditMode(false) : onClose()}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<AgentTemplate | null | undefined>(undefined);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: KEYS.templates(),
    queryFn: () => axiosGet<AgentTemplate[]>("/api/templates"),
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const importMutation = useMutation({
    mutationFn: (data: Partial<AgentTemplate>) => axiosPost("/api/templates", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.templates() }),
  });

  const filtered = templates.filter((t) => {
    const matchSearch = t.displayName.toLowerCase().includes(search.toLowerCase()) || t.tags.some(tag => tag.includes(search.toLowerCase()));
    const matchRole = roleFilter === "all" || t.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleExport = (t: AgentTemplate) => {
    const blob = new Blob([JSON.stringify(t, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${t.displayName}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text) as Partial<AgentTemplate>;
      importMutation.mutate(data);
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Templates</h1>
          <p className="text-sm text-muted-foreground">Manage reusable agent configurations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImport}><Upload className="h-4 w-4 mr-2" />Import</Button>
          <Button onClick={() => setSelected(null)}><Plus className="h-4 w-4 mr-2" />New Template</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {ROLES.map((r) => (
            <Button key={r} size="sm" variant={roleFilter === r ? "default" : "outline"} onClick={() => setRoleFilter(r)} className="capitalize">
              {r}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => (
            <div key={t._id} className="relative group">
              <TemplateCard template={t} onSelect={() => setSelected(t)} />
              <button
                className="absolute top-2 right-2 hidden group-hover:flex items-center justify-center h-7 w-7 rounded bg-background border hover:bg-accent"
                onClick={() => handleExport(t)}
                title="Export JSON"
              >
                <Download className="h-3 w-3" />
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground">No templates found.</div>
          )}
        </div>
      )}

      {/* Modal */}
      {selected !== undefined && (
        <TemplateModal template={selected} onClose={() => setSelected(undefined)} />
      )}
    </div>
  );
}
