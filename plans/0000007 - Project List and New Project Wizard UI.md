# 0000007 - Project List and New Project Wizard UI

**Epic**: EPIC-04: Project Management
**Assigned To**: Frontend Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §5.1 (Project List & Wizard)
**Knowledge Base**: `knowledge-base/08-ui-design-system.md`, `knowledge-base/04-agent-roles.md`, `knowledge-base/02-data-models.md`

---

## Title
Build /projects page with project list and multi-step New Project Wizard

## Description
Implement the Projects landing page at `/projects`. This includes a grid/list of existing projects and a multi-step wizard dialog for creating new projects. The wizard must enforce singleton role rules (max 1 Librarian, PM, Architect) and allow multiple Developer/Reviewer instances.

## Context
The `/projects` page is the main entry point for users. It shows all their projects and allows creating new ones. The wizard collects: project info, role assignments from templates, display name overrides, and optional additional instances.

---

## Actionable Tasks

- [x] Create Next.js route `/app/projects/page.tsx`
- [x] Build `ProjectList` component:
  - [x] Fetches from `GET /projects`
  - [x] Renders project cards in a responsive grid
  - [x] Each card shows: project name, slug, status badge, brandColor indicator, agent count
  - [x] Click on card navigates to `/projects/[id]`
  - [x] "New Project" button opens wizard dialog
- [x] Build `NewProjectWizard` (multi-step Shadcn `Dialog`):
  - [x] **Step 1 — Basic Info**:
    - [x] Name input (auto-generates slug preview)
    - [x] Slug input (editable, URL-safe validation)
    - [x] Brand Color picker (hex input + color swatch)
  - [x] **Step 2 — Role Assignment**:
    - [x] **Mandatory roles** (5 required slots, shown first):
      - [x] For each role (Librarian, Architect, PM, Developer, Reviewer):
        - [x] Dropdown/Select populated from `GET /templates?role={roleName}`
        - [x] Template preview card on selection
      - [x] Singleton enforcement: Librarian, Architect, PM — only 1 slot each
      - [x] Multi-instance: Developer, Reviewer — "+" button to add more instances
    - [x] **Optional agents** (shown after mandatory roles, below a divider):
      - [x] "Add Optional Agent" "+" button — opens a template selector modal
      - [x] No role restriction: any template can be added (Tester, custom roles, etc.)
      - [x] Each optional agent gets a template dropdown + displayName override field
      - [x] Any number of optional agents can be added
      - [x] Added optional agents show in a list with a "×" remove button
  - [x] **Step 3 — Display Name Overrides**:
    - [x] For each assigned instance: display name input (prefilled with template displayName)
    - [x] Shows role badge and template name for context
  - [x] **Step 4 — Confirmation**:
    - [x] Summary of all assignments and display names
    - [x] "Create Project" button → `POST /projects`
  - [x] Step navigation: Back/Next buttons, step indicators
- [x] Handle API errors gracefully (show inline error messages)
- [x] After successful creation, navigate to `/projects/[id]` (new project)
- [x] Write component tests for wizard step validation

---

## Acceptance Criteria

- [x] `/projects` lists all projects for the logged-in user
- [x] Clicking "New Project" opens the wizard dialog
- [x] Step 1 validates required fields before allowing Next
- [x] Step 2 shows only templates matching the role being assigned
- [x] UI prevents adding more than 1 template to singleton roles (Librarian, PM, Architect)
- [x] UI allows adding multiple Developer or Reviewer instances via "+"
- [x] UI allows adding any number of optional agents (any role/template) via "Add Optional Agent" button
- [x] Step 3 shows display name override inputs for each instance
- [x] Step 4 shows a confirmation summary
- [x] Submitting calls `POST /projects` with all role assignments and display name overrides
- [x] After creation, user is redirected to the new project's control center
- [x] Component tests pass

---

## Dependencies
- **Depends on**: 0000001 (Project Bootstrap), 0000004 (Template UI), 0000005 (Project API), 0000006 (Agent Instance)
