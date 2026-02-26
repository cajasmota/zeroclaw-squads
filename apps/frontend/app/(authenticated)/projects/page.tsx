"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Users, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Project {
  _id: string;
  name: string;
  slug: string;
  status: string;
  brandColor: string;
  createdAt: string;
}

interface Template {
  _id: string;
  displayName: string;
  role: string;
  tags: string[];
}

const SINGLETON_ROLES = ["librarian", "pm", "architect"];
const MANDATORY_ROLES = ["developer", "reviewer", "librarian", "pm", "architect"];

function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/projects/${project._id}`)}
      className="text-left rounded-lg border p-4 hover:border-[#004176] hover:shadow-md transition-all space-y-3"
    >
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: project.brandColor ?? "#004176" }}
        >
          {project.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold">{project.name}</p>
          <p className="text-xs text-muted-foreground">{project.slug}</p>
        </div>
      </div>
      <Badge variant={project.status === "active" ? "success" : "secondary"}>{project.status}</Badge>
    </button>
  );
}

type WizardStep = 1 | 2 | 3 | 4;

interface WizardState {
  name: string;
  slug: string;
  brandColor: string;
  assignments: Array<{ role: string; templateId: string; displayName: string }>;
}

function NewProjectWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<WizardStep>(1);
  const [state, setState] = useState<WizardState>({ name: "", slug: "", brandColor: "#004176", assignments: [] });
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    apiGet<Template[]>("/api/templates").then((data) => setTemplates(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);

  const handleNameChange = (name: string) => {
    setState((prev) => ({ ...prev, name, slug: generateSlug(name) }));
  };

  const toggleAssignment = (role: string, templateId: string) => {
    setState((prev) => {
      const existing = prev.assignments.findIndex((a) => a.role === role && a.templateId === templateId);
      if (existing >= 0) {
        return { ...prev, assignments: prev.assignments.filter((_, i) => i !== existing) };
      }
      const isSingleton = SINGLETON_ROLES.includes(role);
      const filtered = isSingleton ? prev.assignments.filter((a) => a.role !== role) : prev.assignments;
      const template = templates.find((t) => t._id === templateId);
      return { ...prev, assignments: [...filtered, { role, templateId, displayName: template?.displayName ?? "" }] };
    });
  };

  const isAssigned = (role: string, templateId: string) =>
    state.assignments.some((a) => a.role === role && a.templateId === templateId);

  const handleCreate = async () => {
    setError(null);
    setCreating(true);
    try {
      await apiPost<Project>("/api/projects", {
        name: state.name,
        slug: state.slug,
        brandColor: state.brandColor,
        agentAssignments: state.assignments,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const roleGroups = MANDATORY_ROLES.map((role) => ({
    role,
    templates: templates.filter((t) => t.role === role),
    isSingleton: SINGLETON_ROLES.includes(role),
  }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Project — Step {step} of 4</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex gap-2 mb-4">
          {([1, 2, 3, 4] as WizardStep[]).map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-[#004176]" : "bg-muted"}`} />
          ))}
        </div>

        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-medium">Project Details</h3>
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input value={state.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="My Awesome Project" />
            </div>
            <div className="space-y-2">
              <Label>Slug (auto-generated)</Label>
              <Input value={state.slug} onChange={(e) => setState({ ...state, slug: e.target.value })} placeholder="my-awesome-project" />
            </div>
            <div className="space-y-2">
              <Label>Brand Color</Label>
              <div className="flex gap-3 items-center">
                <input type="color" value={state.brandColor} onChange={(e) => setState({ ...state, brandColor: e.target.value })} className="h-9 w-16 rounded cursor-pointer" />
                <Input value={state.brandColor} onChange={(e) => setState({ ...state, brandColor: e.target.value })} className="max-w-[120px]" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Role Assignment */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-medium">Assign Agent Templates</h3>
            <p className="text-sm text-muted-foreground">Select templates for each role. Librarian, PM, and Architect can only have one each.</p>
            {roleGroups.map(({ role, templates: roleTemplates, isSingleton }) => (
              <div key={role} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="capitalize">{role}</Label>
                  {isSingleton && <Badge variant="outline" className="text-xs">Singleton</Badge>}
                </div>
                {roleTemplates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No templates available for this role.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {roleTemplates.map((t) => (
                      <button
                        key={t._id}
                        onClick={() => toggleAssignment(role, t._id)}
                        className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${isAssigned(role, t._id) ? "border-[#004176] bg-[#004176]/10 text-[#004176] dark:text-blue-400" : "hover:border-foreground"}`}
                      >
                        {isAssigned(role, t._id) && <Check className="h-3 w-3" />}
                        {t.displayName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Display Name Overrides */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-medium">Customize Agent Names</h3>
            <p className="text-sm text-muted-foreground">Override display names for this project (optional).</p>
            {state.assignments.map((a, i) => (
              <div key={i} className="space-y-2">
                <Label>{a.role} — {templates.find(t => t._id === a.templateId)?.displayName}</Label>
                <Input
                  value={a.displayName}
                  onChange={(e) => {
                    const next = [...state.assignments];
                    next[i] = { ...next[i], displayName: e.target.value };
                    setState({ ...state, assignments: next });
                  }}
                  placeholder={templates.find(t => t._id === a.templateId)?.displayName}
                />
              </div>
            ))}
            {state.assignments.length === 0 && <p className="text-muted-foreground text-sm">No agents assigned yet.</p>}
          </div>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-medium">Confirm & Create</h3>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: state.brandColor }}>
                  {state.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{state.name}</p>
                  <p className="text-xs text-muted-foreground">{state.slug}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Agents ({state.assignments.length})</p>
                <div className="space-y-1">
                  {state.assignments.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="capitalize">{a.role}</Badge>
                      <span>{a.displayName || templates.find(t => t._id === a.templateId)?.displayName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={step === 1 ? onClose : () => setStep((s) => (s - 1) as WizardStep)}>
            {step === 1 ? "Cancel" : <><ArrowLeft className="h-4 w-4 mr-2" />Back</>}
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep((s) => (s + 1) as WizardStep)} disabled={step === 1 && !state.name}>
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-2" />Create Project</>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectsPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = () => {
    setLoading(true);
    apiGet<Project[]>("/api/projects")
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">Your active engineering projects</p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Project
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <Users className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No projects yet</p>
          <p className="text-sm text-muted-foreground">Create your first project to get started.</p>
          <Button onClick={() => setShowWizard(true)}><Plus className="h-4 w-4 mr-2" />New Project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => <ProjectCard key={p._id} project={p} />)}
        </div>
      )}

      {showWizard && (
        <NewProjectWizard
          onClose={() => setShowWizard(false)}
          onCreated={() => {
            setShowWizard(false);
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}
