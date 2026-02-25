# 0000004 - Template Designer UI

**Epic**: EPIC-03: Agent Template System
**Assigned To**: Frontend Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §5.3 (Template Designer)
**Knowledge Base**: `knowledge-base/08-ui-design-system.md`, `knowledge-base/04-agent-roles.md`, `knowledge-base/06-aieos-schema.md`

---

## Title
Build Template Designer page at /templates with grid view, detail modal, and AIEOS builder

## Description
Implement the Template Designer UI at `/templates`. This page serves as the global agent library, allowing users to browse, search, create, edit, and manage agent templates. It includes:
- A filterable grid of template cards
- An agent detail modal with profile view and edit mode
- The AIEOS Identity Builder form (edit mode only)
- JSON import/export functionality

## Context
The Template Designer is the management hub for all agent personalities. Users select templates here when creating projects. The AIEOS builder translates a visual form into the structured AIEOS v1.1 JSON that ZeroClaw normalizes into system prompts.

---

## Actionable Tasks

- [x] Create Next.js route `/app/templates/page.tsx`
- [x] Build `TemplateGrid` component:
  - [x] Fetches templates from `GET /templates` with pagination
  - [x] Renders responsive grid of `TemplateCard` components
  - [x] Filter bar with role dropdown and tags multi-select
  - [x] Search input (filters by displayName and tags)
  - [x] "New Template" button opens creation modal
- [x] Build `TemplateCard` (Shadcn `Card` component):
  - [x] Shows: Avatar image, Display Name, Role badge, Tags (Shadcn `Badge`), template stats
  - [x] Click → opens `TemplateDetailModal`
- [x] Build `TemplateDetailModal` (full-screen Shadcn `Dialog`):
  - [x] **Profile View** (default): Hero-style layout with avatar, role, tags, statistics, bio
  - [x] **Edit Mode** toggle (switch button in top-right):
    - Soul editor (Shadcn `Textarea` for Markdown input)
    - Model/Provider dropdowns
    - Tags input (comma-separated or tag input component)
    - MCP Servers list (add/remove)
    - `canWriteCode` toggle
    - AIEOS Identity Builder (below)
- [x] Build `AIEOSBuilder` component (visible in Edit Mode only):
  - [x] Section: **Identity** — name fields (full, short, codename), bio textarea, origin input
  - [x] Section: **Psychology** — sliders for `logic`, `creativity`, `empathy`, `assertiveness` (0.0–1.0); MBTI dropdown; communication style input
  - [x] Section: **Role Meta** — role dropdown, `isSingleton` toggle, `canWriteCode` toggle, preferred languages multi-select
  - [x] Validates all required sections before save
- [x] Build `ImportExportButtons` component:
  - [x] "Export JSON" button — downloads AIEOS JSON file
  - [x] "Import JSON" button — file picker, uploads to `POST /templates/import`
- [x] Build "AI-Assisted Creation" section (below the AIEOS Builder):
  - [x] Displays a copyable "Persona Interviewer" prompt block (static text, read-only `Textarea` with copy button)
  - [x] **The Persona Interviewer prompt** instructs an external LLM (ChatGPT, Gemini, Claude, etc.) to:
    - Interview the user with questions about the agent's name, personality, role, background story, skills, and communication style
    - Then output a complete, valid AIEOS v1.1 JSON matching the schema at https://github.com/entitai/aieos
    - The JSON must include all 5 sections: identity, psychology, linguistics, history, role_meta
  - [x] Below the prompt: a "Paste AIEOS JSON" `Textarea` input
  - [x] "Import JSON" button below the paste area:
    - [x] Validates pasted JSON against the AIEOS v1.1 schema
    - [x] If valid: parses JSON and auto-fills all AIEOS Builder form fields
    - [x] If invalid: shows inline validation error with the specific failing field
  - [x] The prompt text to display (implementing agent should use this verbatim):
    ```
    You are a Persona Interviewer for an AI agent system. Ask me a series of questions to build
    a complete agent identity. Ask about: the agent's name and codename, their backstory and origin,
    their personality traits (on a scale of 0-1: logic, creativity, empathy, assertiveness),
    their MBTI type, their communication style, their role (developer/reviewer/librarian/architect/pm/tester),
    whether they can write code directly to a repository, their preferred programming languages,
    and their special skills. After gathering all answers, output ONLY a valid JSON object matching
    the AIEOS v1.1 schema (https://github.com/entitai/aieos). Do not include any text before or
    after the JSON.
    ```
- [x] Connect all components to backend API with React Query or SWR
- [x] Handle loading and error states
- [x] Write component tests for `TemplateCard`, `AIEOSBuilder`

---

## Acceptance Criteria

- [x] `/templates` renders a filterable grid of agent templates
- [x] Filtering by role or tags updates the displayed cards
- [x] Clicking a card opens the detail modal in Profile View
- [x] Clicking "Edit" in the modal reveals the AIEOS Identity Builder and soul editor
- [x] Saving changes updates the template via PATCH API
- [x] AIEOS Builder sliders produce correct `neural_matrix` values (0.0–1.0)
- [x] Export downloads a valid AIEOS JSON file
- [x] Import successfully creates a new template from a JSON file
- [x] Creating a new template from the "New Template" button works
- [x] Component tests pass

---

## Dependencies
- **Depends on**: 0000001 (Project Bootstrap), 0000003 (Template API)
