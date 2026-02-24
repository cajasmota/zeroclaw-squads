# 0000021 - Model Administration UI and Ollama Integration

**Epic**: EPIC-13: Deployment & Operations
**Assigned To**: Backend Agent, Frontend Agent
**Status**: [ ] Not Started
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

- [ ] Create `ModelsModule` in NestJS
- [ ] Create `OllamaService`:
  - [ ] Install: `axios` or `node-fetch` for HTTP calls to Ollama API
  - [ ] `getStatus()` — `GET http://localhost:11434/api/tags` — lists loaded models
  - [ ] `pullModel(modelName)` — `POST http://localhost:11434/api/pull` — streams progress
  - [ ] `deleteModel(modelName)` — `DELETE http://localhost:11434/api/delete`
  - [ ] `isHealthy()` — check if Ollama process is running
- [ ] Create REST endpoints:
  - [ ] `GET /settings/models/ollama/status` — Ollama health + active models list
  - [ ] `POST /settings/models/ollama/pull` — pull model (body: `{ model: "qwen2.5-coder:1.5b" }`)
  - [ ] `DELETE /settings/models/ollama/:modelName` — delete model
  - [ ] `GET /settings/models/providers` — list provider enable/disable states (from global settings)
  - [ ] `PATCH /settings/models/providers/:provider` — toggle provider on/off
- [ ] Create `GlobalSettingsModule`:
  - [ ] MongoDB `global_settings` document per tenant
  - [ ] Provider enable states: `{ openai: true, anthropic: false, google: false, ollama: true }`
  - [ ] Global LLM API keys (used if project doesn't override)
  - [ ] Global `inviteUsers` list for Slack
- [ ] SSE (Server-Sent Events) endpoint for streaming Ollama pull progress:
  - [ ] `GET /settings/models/ollama/pull-progress` — streams JSON progress events

### Frontend

- [ ] Create Next.js route `/app/settings/models/page.tsx`
- [ ] Build `ModelAdminPage` component:
  - [ ] **Provider Control** section:
    - [ ] Toggles (Shadcn `Switch`) for: OpenAI, Anthropic, Google, Ollama
    - [ ] Each toggle shows provider name, logo/icon, and enabled state
    - [ ] Toggling calls `PATCH /settings/models/providers/:provider`
  - [ ] **Ollama Manager** section:
    - [ ] Status indicator (Running / Stopped)
    - [ ] Active Models table:
      - [ ] Columns: Model Name, Size, Modified date, Actions
      - [ ] Actions: "Unload" (delete) button per model
    - [ ] "Pull New Model" form:
      - [ ] Model name input (e.g., `qwen2.5-coder:1.5b`)
      - [ ] "Pull" button → starts pull, shows SSE progress bar
  - [ ] **Resource Toggle** section:
    - [ ] List of all known models with RAM usage estimate
    - [ ] Toggle switch to load/unload each model from RAM (without deleting from disk)
    - [ ] "Unload" uses Ollama's `keep_alive: 0` trick: `POST /api/generate` with `{ model, keep_alive: 0 }` to force immediate eviction from VRAM
    - [ ] "Load" uses `POST /api/generate` with `{ model, keep_alive: -1 }` to warm up the model and keep it loaded
    - [ ] Backend: add `OllamaService.unloadModel(modelName)` and `OllamaService.loadModel(modelName)` methods
    - [ ] Add endpoints: `POST /settings/models/ollama/:modelName/unload` and `POST /settings/models/ollama/:modelName/load`

---

## Acceptance Criteria

- [ ] `/settings/models` renders with provider toggles and Ollama section
- [ ] Toggling a provider calls the PATCH API and updates immediately
- [ ] Ollama status shows "Running" when Ollama is accessible, "Stopped" otherwise
- [ ] Active models list shows all currently loaded Ollama models
- [ ] "Pull New Model" form initiates a pull and shows real-time progress via SSE
- [ ] Delete model button removes the model from Ollama
- [ ] Global provider settings persist across page refresh

---

## Dependencies
- **Depends on**: 0000001 (Project Bootstrap), 0000002 (Auth)
