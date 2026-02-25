# 0000026 - Global Settings API and LLM Key Hierarchy Management

**Epic**: EPIC-13: Deployment & Operations  
**Assigned To**: Backend Agent, Frontend Agent  
**Status**: [x] Completed  
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

- [x] Define `GlobalSettings` Mongoose schema:
  - [x] `tenantId` (ObjectId, unique index — one document per tenant)
  - [x] `appName` (string — can override `APP_NAME` env var at runtime)
  - [x] `defaultOllamaModel` (string, default: `qwen2.5-coder:1.5b`)
  - [x] `ollamaEndpoint` (string, default: `http://localhost:11434`)
  - [x] `globalInviteUsers` (string[] — Slack user IDs for all new projects)
  - [x] `providers` (object: `{ openai: enabled, anthropic: enabled, google: enabled, ollama: enabled }`)
  - [x] `llmKeys`:
    - [x] `openai` (string, AES-256 encrypted)
    - [x] `anthropic` (string, AES-256 encrypted)
    - [x] `google` (string, AES-256 encrypted)
  - [x] Timestamps
- [x] Create `GlobalSettingsService`:
  - [x] `get(tenantId)` — fetch or create (upsert) global settings
  - [x] `update(tenantId, dto)` — update settings, encrypt sensitive fields
  - [x] `resolveLlmKeys(tenantId, project: Project): ResolvedLlmKeys`:
    - [x] For each provider (openai, anthropic, google):
      - [x] Use `project.config.llmKeys.{provider}` if set (decrypt)
      - [x] Fall back to `GlobalSettings.llmKeys.{provider}` (decrypt)
    - [x] Returns: `{ openai?: string, anthropic?: string, google?: string, ollamaEndpoint: string }`
    - [x] Returns only keys for **enabled** providers
  - [x] `resolveInviteUsers(tenantId, project: Project): string[]`:
    - [x] Use `project.config.inviteUsers` if non-empty
    - [x] Fall back to `GlobalSettings.globalInviteUsers`
- [x] Update `ZeroClawProcessManagerService` (from 0000009):
  - [x] Before spawning, call `GlobalSettingsService.resolveLlmKeys()` to get the correct keys
  - [x] Inject resolved keys as env vars (not project keys directly)
- [x] Update `ProjectInitializerService` (from 0000008):
  - [x] Use `GlobalSettingsService.resolveInviteUsers()` for Slack channel invitations
- [x] Create REST endpoints:
  - [x] `GET /settings` — get global settings (sensitive fields masked)
  - [x] `PATCH /settings` — update global settings
- [x] Remove `GlobalSettingsModule` stub from 0000021 (it now lives here)
- [x] Write unit tests for `GlobalSettingsService.resolveLlmKeys()`:
  - [x] Project key takes priority over global key
  - [x] Global key used when project key is empty
  - [x] Disabled provider key never returned

### Frontend

- [x] Create Next.js route `/app/settings/page.tsx` (Global Settings page):
  - [x] **App Configuration** section:
    - [x] `APP_NAME` display (read-only, from env) + note about how to change via `.env`
    - [x] Default Ollama Model input
    - [x] Ollama Endpoint URL input
  - [x] **Global LLM Keys** section:
    - [x] OpenAI API Key (masked input, show/hide toggle)
    - [x] Anthropic API Key (masked input, show/hide toggle)
    - [x] Google API Key (masked input, show/hide toggle)
    - [x] Note: "Project-specific keys override these globally"
  - [x] **Global Slack Invitations** section:
    - [x] List of Slack user IDs invited to all new project channels
    - [x] Add/Remove user IDs
    - [x] Note: "Project-specific invite lists override this"
  - [x] **Provider Toggles** section (moved here from 0000021):
    - [x] Enable/Disable: OpenAI, Anthropic, Google, Ollama
  - [x] Save button → `PATCH /settings`
  - [x] Show success/error toast on save
- [x] Add "Settings" link to global navigation (from 0000024 app shell) pointing to `/settings`
- [x] Write component tests for GlobalSettings form

---

## Acceptance Criteria

- [x] `GET /settings` returns global settings with sensitive fields masked
- [x] `PATCH /settings` correctly encrypts and stores LLM keys
- [x] When spawning an agent for a project with no OpenAI key, the global OpenAI key is injected
- [x] When spawning an agent for a project WITH an OpenAI key, the project key takes priority over the global key
- [x] Disabled provider keys are never returned by `resolveLlmKeys()`
- [x] Slack invitations use project list if set, else fall back to global list
- [x] `/settings` page renders all sections and saves correctly
- [x] Sensitive key fields are masked (dots) unless reveal button clicked
- [x] Unit tests for key resolution logic pass

---

## Dependencies
- **Depends on**: 0000002 (Auth), 0000005 (Project API), 0000009 (ZeroClaw Process Manager), 0000008 (Project Init), 0000024 (Frontend Auth + Nav)
