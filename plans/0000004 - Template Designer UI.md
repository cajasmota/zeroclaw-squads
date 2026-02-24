# 0000004 - Template Designer UI

**Epic**: EPIC-03: Agent Template System
**Assigned To**: Frontend Agent
**Status**: [ ] Not Started
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

- [ ] Create Next.js route `/app/templates/page.tsx`
- [ ] Build `TemplateGrid` component:
  - [ ] Fetches templates from `GET /templates` with pagination
  - [ ] Renders responsive grid of `TemplateCard` components
  - [ ] Filter bar with role dropdown and tags multi-select
  - [ ] Search input (filters by displayName and tags)
  - [ ] "New Template" button opens creation modal
- [ ] Build `TemplateCard` (Shadcn `Card` component):
  - [ ] Shows: Avatar image, Display Name, Role badge, Tags (Shadcn `Badge`), template stats
  - [ ] Click → opens `TemplateDetailModal`
- [ ] Build `TemplateDetailModal` (full-screen Shadcn `Dialog`):
  - [ ] **Profile View** (default): Hero-style layout with avatar, role, tags, statistics, bio
  - [ ] **Edit Mode** toggle (switch button in top-right):
    - Soul editor (Shadcn `Textarea` for Markdown input)
    - Model/Provider dropdowns
    - Tags input (comma-separated or tag input component)
    - MCP Servers list (add/remove)
    - `canWriteCode` toggle
    - AIEOS Identity Builder (below)
- [ ] Build `AIEOSBuilder` component (visible in Edit Mode only):
  - [ ] Section: **Identity** — name fields (full, short, codename), bio textarea, origin input
  - [ ] Section: **Psychology** — sliders for `logic`, `creativity`, `empathy`, `assertiveness` (0.0–1.0); MBTI dropdown; communication style input
  - [ ] Section: **Role Meta** — role dropdown, `isSingleton` toggle, `canWriteCode` toggle, preferred languages multi-select
  - [ ] Validates all required sections before save
- [ ] Build `ImportExportButtons` component:
  - [ ] "Export JSON" button — downloads AIEOS JSON file
  - [ ] "Import JSON" button — file picker, uploads to `POST /templates/import`
- [ ] Build "AI-Assisted Creation" section (below the AIEOS Builder):
  - [ ] Displays a copyable "Persona Interviewer" prompt block (static text, read-only `Textarea` with copy button)
  - [ ] **The Persona Interviewer prompt** instructs an external LLM (ChatGPT, Gemini, Claude, etc.) to:
    - Interview the user with questions about the agent's name, personality, role, background story, skills, and communication style
    - Then output a complete, valid AIEOS v1.1 JSON matching the schema at https://github.com/entitai/aieos
    - The JSON must include all 5 sections: identity, psychology, linguistics, history, role_meta
  - [ ] Below the prompt: a "Paste AIEOS JSON" `Textarea` input
  - [ ] "Import JSON" button below the paste area:
    - [ ] Validates pasted JSON against the AIEOS v1.1 schema
    - [ ] If valid: parses JSON and auto-fills all AIEOS Builder form fields
    - [ ] If invalid: shows inline validation error with the specific failing field
  - [ ] The prompt text to display (implementing agent should use this verbatim):
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
- [ ] Connect all components to backend API with React Query or SWR
- [ ] Handle loading and error states
- [ ] Write component tests for `TemplateCard`, `AIEOSBuilder`

---

## Acceptance Criteria

- [ ] `/templates` renders a filterable grid of agent templates
- [ ] Filtering by role or tags updates the displayed cards
- [ ] Clicking a card opens the detail modal in Profile View
- [ ] Clicking "Edit" in the modal reveals the AIEOS Identity Builder and soul editor
- [ ] Saving changes updates the template via PATCH API
- [ ] AIEOS Builder sliders produce correct `neural_matrix` values (0.0–1.0)
- [ ] Export downloads a valid AIEOS JSON file
- [ ] Import successfully creates a new template from a JSON file
- [ ] Creating a new template from the "New Template" button works
- [ ] Component tests pass

---

## Dependencies
- **Depends on**: 0000001 (Project Bootstrap), 0000003 (Template API)
