"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { apiGet, apiPatch } from "@/lib/api/client";
import { Eye, EyeOff, Save, RefreshCw } from "lucide-react";

interface GlobalSettings {
  appName: string;
  ollamaEndpoint: string;
  defaultOllamaModel: string;
  globalInviteUsers: string[];
  providers: {
    openai: boolean;
    anthropic: boolean;
    google: boolean;
    ollama: boolean;
  };
  llmKeys: {
    openai: string;
    anthropic: string;
    google: string;
  };
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  ollama: "Ollama (local)",
};

const ENCRYPTED_MASK = "[encrypted]";

export default function SettingsPage() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [inviteInput, setInviteInput] = useState("");

  // Editable fields
  const [appName, setAppName] = useState("");
  const [ollamaEndpoint, setOllamaEndpoint] = useState("");
  const [defaultOllamaModel, setDefaultOllamaModel] = useState("");
  const [providers, setProviders] = useState<GlobalSettings["providers"]>({
    openai: true,
    anthropic: false,
    google: false,
    ollama: true,
  });
  const [llmKeys, setLlmKeys] = useState({ openai: "", anthropic: "", google: "" });
  const [inviteUsers, setInviteUsers] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<GlobalSettings>("/api/settings");
      setSettings(data);
      setAppName(data.appName ?? "AES");
      setOllamaEndpoint(data.ollamaEndpoint ?? "http://localhost:11434");
      setDefaultOllamaModel(data.defaultOllamaModel ?? "qwen2.5-coder:1.5b");
      setProviders(data.providers ?? { openai: true, anthropic: false, google: false, ollama: true });
      setLlmKeys({
        openai: data.llmKeys?.openai || "",
        anthropic: data.llmKeys?.anthropic || "",
        google: data.llmKeys?.google || "",
      });
      setInviteUsers(data.globalInviteUsers ?? []);
    } catch {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const dto: any = {
        appName,
        ollamaEndpoint,
        defaultOllamaModel,
        providers,
        globalInviteUsers: inviteUsers,
      };
      // Only send keys that changed (not the mask)
      const keysToSend: Record<string, string> = {};
      for (const k of ["openai", "anthropic", "google"] as const) {
        if (llmKeys[k] && llmKeys[k] !== ENCRYPTED_MASK) {
          keysToSend[k] = llmKeys[k];
        }
      }
      if (Object.keys(keysToSend).length) dto.llmKeys = keysToSend;

      await apiPatch("/api/settings", dto);
      setSuccess("Settings saved successfully");
      await load();
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function addInviteUser() {
    const trimmed = inviteInput.trim();
    if (trimmed && !inviteUsers.includes(trimmed)) {
      setInviteUsers([...inviteUsers, trimmed]);
    }
    setInviteInput("");
  }

  function removeInviteUser(u: string) {
    setInviteUsers(inviteUsers.filter((x) => x !== u));
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading settings…
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Global Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          System-wide defaults for LLM providers, Ollama, and Slack automation.
        </p>
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

      {/* General */}
      <section className="space-y-4 border rounded-lg p-6">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          General
        </h2>
        <div className="space-y-2">
          <Label htmlFor="appName">App Name</Label>
          <Input
            id="appName"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="AES"
          />
        </div>
      </section>

      {/* Ollama */}
      <section className="space-y-4 border rounded-lg p-6">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Ollama (Local LLM)
        </h2>
        <div className="space-y-2">
          <Label htmlFor="ollamaEndpoint">Ollama Endpoint</Label>
          <Input
            id="ollamaEndpoint"
            value={ollamaEndpoint}
            onChange={(e) => setOllamaEndpoint(e.target.value)}
            placeholder="http://localhost:11434"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultOllamaModel">Default Ollama Model</Label>
          <Input
            id="defaultOllamaModel"
            value={defaultOllamaModel}
            onChange={(e) => setDefaultOllamaModel(e.target.value)}
            placeholder="qwen2.5-coder:1.5b"
          />
        </div>
      </section>

      {/* LLM Providers */}
      <section className="space-y-4 border rounded-lg p-6">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          LLM Providers
        </h2>
        <p className="text-xs text-muted-foreground">
          Enable providers and enter global API keys. Project-level keys take priority over global
          keys.
        </p>
        {(["openai", "anthropic", "google", "ollama"] as const).map((provider) => (
          <div key={provider} className="flex items-start gap-4 py-3 border-b last:border-b-0">
            <div className="flex items-center gap-3 w-40">
              <Switch
                id={`provider-${provider}`}
                checked={providers[provider]}
                onCheckedChange={(v) => setProviders({ ...providers, [provider]: v })}
              />
              <Label htmlFor={`provider-${provider}`} className="cursor-pointer font-medium">
                {PROVIDER_LABELS[provider]}
              </Label>
            </div>
            {provider !== "ollama" && (
              <div className="flex-1 relative">
                <Input
                  type={showKeys[provider] ? "text" : "password"}
                  value={llmKeys[provider as "openai" | "anthropic" | "google"]}
                  onChange={(e) =>
                    setLlmKeys({
                      ...llmKeys,
                      [provider]: e.target.value,
                    })
                  }
                  placeholder={`${PROVIDER_LABELS[provider]} API key`}
                  disabled={!providers[provider]}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKeys({ ...showKeys, [provider]: !showKeys[provider] })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showKeys[provider] ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Slack Invite Users */}
      <section className="space-y-4 border rounded-lg p-6">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Global Slack Invite Users
        </h2>
        <p className="text-xs text-muted-foreground">
          Slack user IDs to auto-invite to every new project channel. Individual project configs
          override this list.
        </p>
        <div className="flex gap-2">
          <Input
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addInviteUser()}
            placeholder="Slack user ID (e.g. U01234567)"
            className="flex-1"
          />
          <Button variant="outline" onClick={addInviteUser}>
            Add
          </Button>
        </div>
        {inviteUsers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {inviteUsers.map((u) => (
              <Badge
                key={u}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeInviteUser(u)}
              >
                {u} ×
              </Badge>
            ))}
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
