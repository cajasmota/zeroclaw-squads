"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api/client";
import {
  RefreshCw,
  Download,
  Trash2,
  Play,
  PauseCircle,
  CheckCircle,
  XCircle,
  Cpu,
} from "lucide-react";

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: { parameter_size?: string; family?: string };
}

interface OllamaStatus {
  healthy: boolean;
  models: OllamaModel[];
}

interface Providers {
  openai: boolean;
  anthropic: boolean;
  google: boolean;
  ollama: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
  ollama: "Ollama (local)",
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function ModelsPage() {
  const [pullInput, setPullInput] = useState("");
  const [actionModel, setActionModel] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [pulling, setPulling] = useState(false);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    await Promise.all([
      apiGet<OllamaStatus>("/api/models?action=status").then(setStatus).catch(console.error),
      apiGet<Providers>("/api/models?action=providers").then(setProviders).catch(console.error),
    ]);
    setLoadingStatus(false);
  };

  useEffect(() => { fetchStatus(); }, []);

  function flash(msg: string, isError = false) {
    if (isError) { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  }

  function refreshStatus() {
    fetchStatus();
  }

  async function pullModel() {
    if (!pullInput.trim()) return;
    const modelName = pullInput.trim();
    setPulling(true);
    try {
      await apiPost("/api/models", { action: "pull", model: modelName });
      flash(`Model "${modelName}" pulled successfully`);
      setPullInput("");
      await fetchStatus();
    } catch {
      flash("Failed to pull model", true);
    } finally {
      setPulling(false);
    }
  }

  async function deleteModel(name: string) {
    if (!confirm(`Delete model "${name}"? This cannot be undone.`)) return;
    setActionModel(name);
    try {
      await apiDelete(`/api/models?model=${encodeURIComponent(name)}`);
      flash(`Model "${name}" deleted`);
      await fetchStatus();
    } catch {
      flash("Failed to delete model", true);
    } finally {
      setActionModel(null);
    }
  }

  async function loadModel(name: string) {
    setActionModel(name);
    try {
      await apiPost("/api/models", { action: "load", model: name });
      flash(`Model "${name}" loaded into memory`);
    } catch {
      flash("Failed to load model", true);
    } finally {
      setActionModel(null);
    }
  }

  async function unloadModel(name: string) {
    setActionModel(name);
    try {
      await apiPost("/api/models", { action: "unload", model: name });
      flash(`Model "${name}" unloaded from memory`);
    } catch {
      flash("Failed to unload model", true);
    } finally {
      setActionModel(null);
    }
  }

  async function toggleProvider(provider: string, enabled: boolean) {
    try {
      await apiPatch("/api/models", { provider, enabled });
      flash(`${PROVIDER_LABELS[provider]} ${enabled ? "enabled" : "disabled"}`);
      const updated = await apiGet<Providers>("/api/models?action=providers").catch(() => null);
      if (updated) setProviders(updated);
    } catch {
      flash("Failed to update provider", true);
    }
  }

  return (
    <div className="p-8 max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Model Administration</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage local Ollama models and LLM provider availability.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshStatus} disabled={loadingStatus}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingStatus ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <p className="text-sm">{error}</p>
        </Alert>
      )}
      {success && (
        <Alert>
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </Alert>
      )}

      {/* Ollama Status */}
      <section className="border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <Cpu className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Ollama</h2>
          </div>
          {status && (
            <div className="flex items-center gap-2">
              {status.healthy ? (
                <><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-sm text-green-600 dark:text-green-400">Running</span></>
              ) : (
                <><XCircle className="h-4 w-4 text-destructive" /><span className="text-sm text-destructive">Offline</span></>
              )}
            </div>
          )}
        </div>

        {/* Pull Model */}
        <div className="px-6 py-4 border-b">
          <Label className="text-sm font-medium mb-2 block">Pull New Model</Label>
          <div className="flex gap-2">
            <Input
              value={pullInput}
              onChange={(e) => setPullInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && pullModel()}
              placeholder="e.g. qwen2.5-coder:1.5b, llama3.2:3b, mistral"
              className="flex-1"
              disabled={pulling}
            />
            <Button onClick={pullModel} disabled={pulling || !pullInput.trim()}>
              {pulling ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Pull
            </Button>
          </div>
        </div>

        {/* Model List */}
        {loadingStatus ? (
          <div className="px-6 py-8 text-center text-muted-foreground text-sm">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading models…
          </div>
        ) : status?.models.length === 0 ? (
          <div className="px-6 py-8 text-center text-muted-foreground text-sm">
            No models installed. Pull a model above to get started.
          </div>
        ) : (
          <div className="divide-y">
            {status?.models.map((model) => (
              <div key={model.name} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-medium truncate">{model.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">{formatBytes(model.size)}</span>
                    {model.details?.parameter_size && (
                      <Badge variant="secondary" className="text-xs">
                        {model.details.parameter_size}
                      </Badge>
                    )}
                    {model.details?.family && (
                      <Badge variant="outline" className="text-xs">
                        {model.details.family}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadModel(model.name)}
                    disabled={actionModel === model.name}
                    title="Load into memory"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unloadModel(model.name)}
                    disabled={actionModel === model.name}
                    title="Unload from memory"
                  >
                    <PauseCircle className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => deleteModel(model.name)}
                    disabled={actionModel === model.name}
                    title="Delete model"
                  >
                    {actionModel === model.name ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Provider Toggles */}
      <section className="border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/30">
          <h2 className="font-semibold">Cloud LLM Providers</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Toggle which providers agents are allowed to use. API keys are managed in Global
            Settings.
          </p>
        </div>
        {providers ? (
          <div className="divide-y">
            {(["openai", "anthropic", "google", "ollama"] as const).map((provider) => (
              <div key={provider} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-sm">{PROVIDER_LABELS[provider]}</p>
                  {provider === "ollama" && (
                    <p className="text-xs text-muted-foreground">Local Ollama models</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={providers[provider] ? "default" : "outline"}>
                    {providers[provider] ? "Enabled" : "Disabled"}
                  </Badge>
                  <Button
                    size="sm"
                    variant={providers[provider] ? "outline" : "default"}
                    onClick={() => toggleProvider(provider, !providers[provider])}
                  >
                    {providers[provider] ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-6 text-center text-muted-foreground text-sm">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading providers…
          </div>
        )}
      </section>
    </div>
  );
}
