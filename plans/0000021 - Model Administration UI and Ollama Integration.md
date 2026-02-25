# 0000021 - Model Administration UI and Ollama Integration

**Epic**: EPIC-13: Deployment & Operations
**Assigned To**: Backend Agent, Frontend Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §5.4 (Model & Ollama Administration)
**Knowledge Base**: `knowledge-base/03-technology-stack.md`, `knowledge-base/08-ui-design-system.md`

---

## Title
Build Model Administration UI at /settings/models with Ollama manager and provider toggles

## Description
Implement the Model Administration page at `/settings/models`. This provides controls for:
- Enabling/disabling cloud LLM providers (OpenAI, Anthropic, Google)
- Managing the local Ollama instance (status, active models, pull new models, delete models)
- Toggling individual models on/off to free VPS RAM

## Context
AES is designed to work on a VPS with limited RAM (8GB target). Controlling which models are loaded is critical for resource management. Ollama provides local model serving; users need a UI to manage it without SSH access.

---

## Actionable Tasks

### Backend

- [x] Create `ModelsModule` in NestJS
- [x] Create `OllamaService`:
  - [x] Install: `axios` or `node-fetch` for HTTP calls to Ollama API
  - [x] `getStatus()` — `GET http://localhost:11434/api/tags` — lists loaded models
  - [x] `pullModel(modelName)` — `POST http://localhost:11434/api/pull` — streams progress
  - [x] `deleteModel(modelName)` — `DELETE http://localhost:11434/api/delete`
  - [x] `isHealthy()` — check if Ollama process is running
- [x] Create REST endpoints:
  - [x] `GET /settings/models/ollama/status` — Ollama health + active models list
  - [x] `POST /settings/models/ollama/pull` — pull model (body: `{ model: "qwen2.5-coder:1.5b" }`)
  - [x] `DELETE /settings/models/ollama/:modelName` — delete model
  - [x] `GET /settings/models/providers` — list provider enable/disable states (from global settings)
  - [x] `PATCH /settings/models/providers/:provider` — toggle provider on/off
- [x] Create `GlobalSettingsModule`:
  - [x] MongoDB `global_settings` document per tenant
  - [x] Provider enable states: `{ openai: true, anthropic: false, google: false, ollama: true }`
  - [x] Global LLM API keys (used if project doesn't override)
  - [x] Global `inviteUsers` list for Slack
- [x] SSE (Server-Sent Events) endpoint for streaming Ollama pull progress:
  - [x] `GET /settings/models/ollama/pull-progress` — streams JSON progress events

### Frontend

- [x] Create Next.js route `/app/settings/models/page.tsx`
- [x] Build `ModelAdminPage` component:
  - [x] **Provider Control** section:
    - [x] Toggles (Shadcn `Switch`) for: OpenAI, Anthropic, Google, Ollama
    - [x] Each toggle shows provider name, logo/icon, and enabled state
    - [x] Toggling calls `PATCH /settings/models/providers/:provider`
  - [x] **Ollama Manager** section:
    - [x] Status indicator (Running / Stopped)
    - [x] Active Models table:
      - [x] Columns: Model Name, Size, Modified date, Actions
      - [x] Actions: "Unload" (delete) button per model
    - [x] "Pull New Model" form:
      - [x] Model name input (e.g., `qwen2.5-coder:1.5b`)
      - [x] "Pull" button → starts pull, shows SSE progress bar
  - [x] **Resource Toggle** section:
    - [x] List of all known models with RAM usage estimate
    - [x] Toggle switch to load/unload each model from RAM (without deleting from disk)
    - [x] "Unload" uses Ollama's `keep_alive: 0` trick: `POST /api/generate` with `{ model, keep_alive: 0 }` to force immediate eviction from VRAM
    - [x] "Load" uses `POST /api/generate` with `{ model, keep_alive: -1 }` to warm up the model and keep it loaded
    - [x] Backend: add `OllamaService.unloadModel(modelName)` and `OllamaService.loadModel(modelName)` methods
    - [x] Add endpoints: `POST /settings/models/ollama/:modelName/unload` and `POST /settings/models/ollama/:modelName/load`

---

## Acceptance Criteria

- [x] `/settings/models` renders with provider toggles and Ollama section
- [x] Toggling a provider calls the PATCH API and updates immediately
- [x] Ollama status shows "Running" when Ollama is accessible, "Stopped" otherwise
- [x] Active models list shows all currently loaded Ollama models
- [x] "Pull New Model" form initiates a pull and shows real-time progress via SSE
- [x] Delete model button removes the model from Ollama
- [x] Global provider settings persist across page refresh

---

## Dependencies
- **Depends on**: 0000001 (Project Bootstrap), 0000002 (Auth)
