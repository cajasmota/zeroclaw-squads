"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet, apiPatch } from "@/lib/api/client";
import { Eye, EyeOff, Save, RefreshCw } from "lucide-react";

interface GlobalSettings {
  appName: string;
  ollamaEndpoint: string;
  defaultOllamaModel: string;
  globalInviteUsers: string[];
  slackToken: string;
  slackSigningSecret: string;
  githubApp: {
    appId: string;
    privateKey: string;
    installationId: string;
    webhookSecret: string;
    repoOwner: string;
    repoName: string;
  };
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
  const [slackToken, setSlackToken] = useState("");
  const [showSlackToken, setShowSlackToken] = useState(false);
  const [slackSigningSecret, setSlackSigningSecret] = useState("");
  const [showSlackSigningSecret, setShowSlackSigningSecret] = useState(false);
  const [githubApp, setGithubApp] = useState({
    appId: "",
    privateKey: "",
    installationId: "",
    webhookSecret: "",
    repoOwner: "",
    repoName: "",
  });
  const [showGhSecret, setShowGhSecret] = useState(false);

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
      setSlackToken(data.slackToken ?? "");
      setSlackSigningSecret(data.slackSigningSecret ?? "");
      setGithubApp({
        appId: data.githubApp?.appId ?? "",
        privateKey: data.githubApp?.privateKey ?? "",
        installationId: data.githubApp?.installationId ?? "",
        webhookSecret: data.githubApp?.webhookSecret ?? "",
        repoOwner: data.githubApp?.repoOwner ?? "",
        repoName: data.githubApp?.repoName ?? "",
      });
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
        ...(slackToken && slackToken !== ENCRYPTED_MASK ? { slackToken } : {}),
      ...(slackSigningSecret && slackSigningSecret !== ENCRYPTED_MASK ? { slackSigningSecret } : {}),
        githubApp: {
          ...(githubApp.appId ? { appId: githubApp.appId } : {}),
          ...(githubApp.privateKey && githubApp.privateKey !== ENCRYPTED_MASK ? { privateKey: githubApp.privateKey } : {}),
          ...(githubApp.installationId ? { installationId: githubApp.installationId } : {}),
          ...(githubApp.webhookSecret && githubApp.webhookSecret !== ENCRYPTED_MASK ? { webhookSecret: githubApp.webhookSecret } : {}),
          ...(githubApp.repoOwner ? { repoOwner: githubApp.repoOwner } : {}),
          ...(githubApp.repoName ? { repoName: githubApp.repoName } : {}),
        },
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

  const SaveButton = () => (
    <div className="flex justify-end pt-4">
      <Button onClick={save} disabled={saving}>
        {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save Settings
      </Button>
    </div>
  );

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Global Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          System-wide defaults for all projects.
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

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="llm">LLM Providers</TabsTrigger>
          <TabsTrigger value="slack">Slack</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
        </TabsList>

        {/* ── General ── */}
        <TabsContent value="general" className="space-y-6 pt-4">
          <div className="space-y-4 border rounded-lg p-6">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">App</h2>
            <div className="space-y-2">
              <Label htmlFor="appName">App Name</Label>
              <Input id="appName" value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="AES" />
            </div>
          </div>
          <div className="space-y-4 border rounded-lg p-6">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Ollama (Local LLM)</h2>
            <div className="space-y-2">
              <Label htmlFor="ollamaEndpoint">Ollama Endpoint</Label>
              <Input id="ollamaEndpoint" value={ollamaEndpoint} onChange={(e) => setOllamaEndpoint(e.target.value)} placeholder="http://localhost:11434" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultOllamaModel">Default Ollama Model</Label>
              <Input id="defaultOllamaModel" value={defaultOllamaModel} onChange={(e) => setDefaultOllamaModel(e.target.value)} placeholder="qwen2.5-coder:1.5b" />
            </div>
          </div>
          <SaveButton />
        </TabsContent>

        {/* ── LLM Providers ── */}
        <TabsContent value="llm" className="space-y-6 pt-4">
          <div className="space-y-4 border rounded-lg p-6">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">LLM Providers</h2>
            <p className="text-xs text-muted-foreground">
              Enable providers and enter global API keys. Project-level keys override these.
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
                      onChange={(e) => setLlmKeys({ ...llmKeys, [provider]: e.target.value })}
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
                      {showKeys[provider] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <SaveButton />
        </TabsContent>

        {/* ── Slack ── */}
        <TabsContent value="slack" className="space-y-6 pt-4">
          <div className="space-y-4 border rounded-lg p-6">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Slack Integration</h2>
            <p className="text-xs text-muted-foreground">
              Global fallback bot token. Used when a project has no project-specific Slack token.
              See <code>docs/slack-app-setup.md</code> for setup instructions.
            </p>
            <p className="text-xs text-muted-foreground bg-muted rounded px-3 py-2">
              The <strong>Signing Secret</strong> below is stored encrypted in the database and overrides the <code>SLACK_SIGNING_SECRET</code> env var. Used by the backend to verify incoming Slack webhook payloads.
            </p>
            <div className="space-y-2">
              <Label htmlFor="slackSigningSecret">Signing Secret</Label>
              <div className="relative">
                <Input
                  id="slackSigningSecret"
                  type={showSlackSigningSecret ? "text" : "password"}
                  value={slackSigningSecret}
                  onChange={(e) => setSlackSigningSecret(e.target.value)}
                  placeholder="your-signing-secret"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSlackSigningSecret(!showSlackSigningSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showSlackSigningSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slackToken">Bot Token (xoxb-...)</Label>
              <div className="relative">
                <Input
                  id="slackToken"
                  type={showSlackToken ? "text" : "password"}
                  value={slackToken}
                  onChange={(e) => setSlackToken(e.target.value)}
                  placeholder="xoxb-..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSlackToken(!showSlackToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showSlackToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-4 border rounded-lg p-6">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Auto-Invite Users</h2>
            <p className="text-xs text-muted-foreground">
              Slack user IDs auto-invited to every new project channel. Project-specific lists override this.
            </p>
            <div className="flex gap-2">
              <Input
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addInviteUser()}
                placeholder="Slack user ID (e.g. U01234567)"
                className="flex-1"
              />
              <Button variant="outline" onClick={addInviteUser}>Add</Button>
            </div>
            {inviteUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {inviteUsers.map((u) => (
                  <Badge key={u} variant="secondary" className="cursor-pointer" onClick={() => removeInviteUser(u)}>
                    {u} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <SaveButton />
        </TabsContent>

        {/* ── GitHub ── */}
        <TabsContent value="github" className="space-y-6 pt-4">
          <div className="space-y-4 border rounded-lg p-6">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">GitHub Integration</h2>
            <p className="text-xs text-muted-foreground">
              Global fallback GitHub App config. Used when a project has no project-specific config.
              See <code>docs/github-app-setup.md</code> for setup instructions.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ghRepoOwner">Repo Owner</Label>
                <Input id="ghRepoOwner" value={githubApp.repoOwner} onChange={(e) => setGithubApp({ ...githubApp, repoOwner: e.target.value })} placeholder="my-org" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ghRepoName">Repo Name</Label>
                <Input id="ghRepoName" value={githubApp.repoName} onChange={(e) => setGithubApp({ ...githubApp, repoName: e.target.value })} placeholder="my-repo" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ghAppId">App ID</Label>
                <Input id="ghAppId" value={githubApp.appId} onChange={(e) => setGithubApp({ ...githubApp, appId: e.target.value })} placeholder="123456" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ghInstallationId">Installation ID</Label>
                <Input id="ghInstallationId" value={githubApp.installationId} onChange={(e) => setGithubApp({ ...githubApp, installationId: e.target.value })} placeholder="12345678" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ghWebhookSecret">Webhook Secret</Label>
              <div className="relative">
                <Input
                  id="ghWebhookSecret"
                  type={showGhSecret ? "text" : "password"}
                  value={githubApp.webhookSecret}
                  onChange={(e) => setGithubApp({ ...githubApp, webhookSecret: e.target.value })}
                  placeholder="your-webhook-secret"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowGhSecret(!showGhSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showGhSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ghPrivateKey">Private Key (.pem contents)</Label>
              <textarea
                id="ghPrivateKey"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono shadow-sm resize-y"
                value={githubApp.privateKey}
                onChange={(e) => setGithubApp({ ...githubApp, privateKey: e.target.value })}
                placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;..."
              />
            </div>
          </div>
          <SaveButton />
        </TabsContent>
      </Tabs>
    </div>
  );
}
