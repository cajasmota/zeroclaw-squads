# 0000026 - Global Settings API and LLM Key Hierarchy Management

**Epic**: EPIC-13: Deployment & Operations  
**Assigned To**: Backend Agent, Frontend Agent  
**Status**: [ ] Not Started  
**PRD Reference**: PRD.md §13 (LLM & API Key Management), §4.1 (Invitations: Global Settings fallback), §1 (APP_NAME branding)  
**Knowledge Base**: `knowledge-base/02-data-models.md`, `knowledge-base/03-technology-stack.md`  

---

## Title
Implement Global Settings API with hierarchical LLM key resolution and /settings global UI page

## Description
PRD §13 specifies **hierarchical LLM key overrides**: global fallback keys are used when a project does not define project-specific keys. This story implements:
1. **GlobalSettings data model** — per-tenant global config stored in MongoDB
2. **Key resolution logic** — project keys take priority; global keys are the fallback
3. **Global Settings REST API**
4. **Global Settings UI page** at `/settings` — manage global LLM keys, default Ollama model, global invite users, and app-wide configuration

## Context
When an agent is spawned, the backend must determine which LLM API key to inject as environment variable. If the project has `llmKeys.openai` set, use it. If not, fall back to the global `openai` key from GlobalSettings. Without this logic, projects without explicitly set keys would fail to spawn agents.

Global Settings also control:
- The global `inviteUsers` list (Slack user IDs invited to all new project channels)
- Default Ollama model
- Global provider enable/disable flags (already partially covered in 0000021 — consolidate here)

---

## Actionable Tasks

### Backend

- [ ] Define `GlobalSettings` Mongoose schema:
  - [ ] `tenantId` (ObjectId, unique index — one document per tenant)
  - [ ] `appName` (string — can override `APP_NAME` env var at runtime)
  - [ ] `defaultOllamaModel` (string, default: `qwen2.5-coder:1.5b`)
  - [ ] `ollamaEndpoint` (string, default: `http://localhost:11434`)
  - [ ] `globalInviteUsers` (string[] — Slack user IDs for all new projects)
  - [ ] `providers` (object: `{ openai: enabled, anthropic: enabled, google: enabled, ollama: enabled }`)
  - [ ] `llmKeys`:
    - [ ] `openai` (string, AES-256 encrypted)
    - [ ] `anthropic` (string, AES-256 encrypted)
    - [ ] `google` (string, AES-256 encrypted)
  - [ ] Timestamps
- [ ] Create `GlobalSettingsService`:
  - [ ] `get(tenantId)` — fetch or create (upsert) global settings
  - [ ] `update(tenantId, dto)` — update settings, encrypt sensitive fields
  - [ ] `resolveLlmKeys(tenantId, project: Project): ResolvedLlmKeys`:
    - [ ] For each provider (openai, anthropic, google):
      - [ ] Use `project.config.llmKeys.{provider}` if set (decrypt)
      - [ ] Fall back to `GlobalSettings.llmKeys.{provider}` (decrypt)
    - [ ] Returns: `{ openai?: string, anthropic?: string, google?: string, ollamaEndpoint: string }`
    - [ ] Returns only keys for **enabled** providers
  - [ ] `resolveInviteUsers(tenantId, project: Project): string[]`:
    - [ ] Use `project.config.inviteUsers` if non-empty
    - [ ] Fall back to `GlobalSettings.globalInviteUsers`
- [ ] Update `ZeroClawProcessManagerService` (from 0000009):
  - [ ] Before spawning, call `GlobalSettingsService.resolveLlmKeys()` to get the correct keys
  - [ ] Inject resolved keys as env vars (not project keys directly)
- [ ] Update `ProjectInitializerService` (from 0000008):
  - [ ] Use `GlobalSettingsService.resolveInviteUsers()` for Slack channel invitations
- [ ] Create REST endpoints:
  - [ ] `GET /settings` — get global settings (sensitive fields masked)
  - [ ] `PATCH /settings` — update global settings
- [ ] Remove `GlobalSettingsModule` stub from 0000021 (it now lives here)
- [ ] Write unit tests for `GlobalSettingsService.resolveLlmKeys()`:
  - [ ] Project key takes priority over global key
  - [ ] Global key used when project key is empty
  - [ ] Disabled provider key never returned

### Frontend

- [ ] Create Next.js route `/app/settings/page.tsx` (Global Settings page):
  - [ ] **App Configuration** section:
    - [ ] `APP_NAME` display (read-only, from env) + note about how to change via `.env`
    - [ ] Default Ollama Model input
    - [ ] Ollama Endpoint URL input
  - [ ] **Global LLM Keys** section:
    - [ ] OpenAI API Key (masked input, show/hide toggle)
    - [ ] Anthropic API Key (masked input, show/hide toggle)
    - [ ] Google API Key (masked input, show/hide toggle)
    - [ ] Note: "Project-specific keys override these globally"
  - [ ] **Global Slack Invitations** section:
    - [ ] List of Slack user IDs invited to all new project channels
    - [ ] Add/Remove user IDs
    - [ ] Note: "Project-specific invite lists override this"
  - [ ] **Provider Toggles** section (moved here from 0000021):
    - [ ] Enable/Disable: OpenAI, Anthropic, Google, Ollama
  - [ ] Save button → `PATCH /settings`
  - [ ] Show success/error toast on save
- [ ] Add "Settings" link to global navigation (from 0000024 app shell) pointing to `/settings`
- [ ] Write component tests for GlobalSettings form

---

## Acceptance Criteria

- [ ] `GET /settings` returns global settings with sensitive fields masked
- [ ] `PATCH /settings` correctly encrypts and stores LLM keys
- [ ] When spawning an agent for a project with no OpenAI key, the global OpenAI key is injected
- [ ] When spawning an agent for a project WITH an OpenAI key, the project key takes priority over the global key
- [ ] Disabled provider keys are never returned by `resolveLlmKeys()`
- [ ] Slack invitations use project list if set, else fall back to global list
- [ ] `/settings` page renders all sections and saves correctly
- [ ] Sensitive key fields are masked (dots) unless reveal button clicked
- [ ] Unit tests for key resolution logic pass

---

## Dependencies
- **Depends on**: 0000002 (Auth), 0000005 (Project API), 0000009 (ZeroClaw Process Manager), 0000008 (Project Init), 0000024 (Frontend Auth + Nav)
