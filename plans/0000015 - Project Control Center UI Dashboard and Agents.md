# 0000015 - Project Control Center UI - Dashboard and Agent Management

**Epic**: EPIC-10: UI - Project Control Center
**Assigned To**: Frontend Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §5.2 (Project Control Center)
**Knowledge Base**: `knowledge-base/08-ui-design-system.md`, `knowledge-base/04-agent-roles.md`

---

## Title
Build Project Control Center at /projects/[id] with dashboard tab and agent grid view

## Description
Implement the Project Control Center layout at `/projects/[id]`. This is the main project management hub with a tabbed interface. This story covers:
1. The overall tabbed layout shell
2. The **Dashboard** tab — real-time analytics and process health
3. The **Agents** tab — responsive grid of agent cards with detail modal

## Context
The control center is where users monitor and interact with a running project. The dashboard shows agent health at a glance. The agent grid shows all agent instances with their avatars, status, and quick bio. Clicking an agent opens a LinkedIn-style profile modal.

---

## Actionable Tasks

- [x] Create Next.js route `/app/projects/[id]/page.tsx`
- [x] Build `ProjectControlCenterLayout` component:
  - [x] Fetches project data from `GET /projects/:id`
  - [x] Shows project name, brandColor accent, status badge in header
  - [x] Implements tabbed navigation (Shadcn `Tabs`):
    - [x] Tabs: Dashboard | Agents | Backlog | Kanban | Blueprints | Requirements | Settings
  - [x] Each tab renders its own route/component
- [x] Build **Dashboard Tab** (`/app/projects/[id]/dashboard/`):
  - [x] Real-time agent process health grid:
    - [x] Shows each agent: name, role, status (Idle/Busy/Error), PID
    - [x] Status color indicators (green = idle, yellow = busy, red = error)
  - [x] "Trigger Knowledge Ingestion" button:
    - [x] Calls `POST /projects/:id/librarian/ingest`
    - [x] Shows loading/progress state
  - [ ] Librarian indexing status badge (idle / indexing / last indexed timestamp)
  - [x] Active stories count by status
  - [x] WebSocket subscription to agent status changes (real-time updates)
- [x] Build **Agents Tab** (`/app/projects/[id]/agents/`):
  - [x] `AgentGrid` component:
    - [x] Responsive grid (2-4 columns based on viewport)
    - [x] Fetches from `GET /projects/:id/agents`
  - [x] `AgentCard` component (Shadcn `Card`):
    - [x] Avatar image (from `avatarUrl` or generated from brandColor)
    - [x] Display Name
    - [x] Role badge (Shadcn `Badge` with role-specific color)
    - [x] Tags (Shadcn `Badge` list)
    - [x] Status indicator (Idle / Busy / Error)
    - [x] Bio snippet (first 100 chars of soul.md)
    - [x] Click → opens `AgentProfileModal`
  - [x] `AgentProfileModal` (full-screen Shadcn `Dialog`, LinkedIn-style):
    - [x] **View Mode** (default):
      - [x] Hero layout: large avatar, display name, role, tags, full bio
      - [x] Status and PID info
      - [ ] Statistics: stories completed, current story assigned
    - [x] **Edit Mode** toggle (top-right button):
      - [x] Display Name input
      - [x] Soul editor (Shadcn `Textarea`)
      - [ ] AIEOS Identity JSON editor (raw JSON textarea with validation)
      - [x] Save button → `PATCH /projects/:id/agents/:agentId`
- [x] Set up WebSocket client in frontend to subscribe to agent status events
- [x] Write component tests for `AgentCard`, `AgentProfileModal`

---

## Acceptance Criteria

- [x] `/projects/[id]` renders with project header and tabbed navigation
- [x] Dashboard shows all project agents with real-time status
- [x] "Trigger Knowledge Ingestion" button sends API call and shows feedback
- [x] Agents tab renders a responsive grid of agent cards
- [x] Each agent card shows avatar, name, role badge, tags, status, and bio snippet
- [x] Clicking an agent card opens the full-screen profile modal
- [x] Edit mode in modal allows editing soul and saving via PATCH API
- [x] Agent status updates in real time via WebSocket without page refresh
- [x] Component tests pass

---

## Dependencies
- **Depends on**: 0000007 (Project List UI), 0000009 (ZeroClaw Process Manager), 0000006 (Agent Instance API)
