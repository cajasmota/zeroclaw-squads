# 0000015 - Project Control Center UI - Dashboard and Agent Management

**Epic**: EPIC-10: UI - Project Control Center
**Assigned To**: Frontend Agent
**Status**: [ ] Not Started
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

- [ ] Create Next.js route `/app/projects/[id]/page.tsx`
- [ ] Build `ProjectControlCenterLayout` component:
  - [ ] Fetches project data from `GET /projects/:id`
  - [ ] Shows project name, brandColor accent, status badge in header
  - [ ] Implements tabbed navigation (Shadcn `Tabs`):
    - [ ] Tabs: Dashboard | Agents | Backlog | Kanban | Blueprints | Requirements | Settings
  - [ ] Each tab renders its own route/component
- [ ] Build **Dashboard Tab** (`/app/projects/[id]/dashboard/`):
  - [ ] Real-time agent process health grid:
    - [ ] Shows each agent: name, role, status (Idle/Busy/Error), PID
    - [ ] Status color indicators (green = idle, yellow = busy, red = error)
  - [ ] "Trigger Knowledge Ingestion" button:
    - [ ] Calls `POST /projects/:id/librarian/ingest`
    - [ ] Shows loading/progress state
  - [ ] Librarian indexing status badge (idle / indexing / last indexed timestamp)
  - [ ] Active stories count by status
  - [ ] WebSocket subscription to agent status changes (real-time updates)
- [ ] Build **Agents Tab** (`/app/projects/[id]/agents/`):
  - [ ] `AgentGrid` component:
    - [ ] Responsive grid (2-4 columns based on viewport)
    - [ ] Fetches from `GET /projects/:id/agents`
  - [ ] `AgentCard` component (Shadcn `Card`):
    - [ ] Avatar image (from `avatarUrl` or generated from brandColor)
    - [ ] Display Name
    - [ ] Role badge (Shadcn `Badge` with role-specific color)
    - [ ] Tags (Shadcn `Badge` list)
    - [ ] Status indicator (Idle / Busy / Error)
    - [ ] Bio snippet (first 100 chars of soul.md)
    - [ ] Click → opens `AgentProfileModal`
  - [ ] `AgentProfileModal` (full-screen Shadcn `Dialog`, LinkedIn-style):
    - [ ] **View Mode** (default):
      - [ ] Hero layout: large avatar, display name, role, tags, full bio
      - [ ] Statistics: stories completed, current story assigned
      - [ ] Status and PID info
    - [ ] **Edit Mode** toggle (top-right button):
      - [ ] Display Name input
      - [ ] Soul editor (Shadcn `Textarea`)
      - [ ] AIEOS Identity JSON editor (raw JSON textarea with validation)
      - [ ] Save button → `PATCH /projects/:id/agents/:agentId`
- [ ] Set up WebSocket client in frontend to subscribe to agent status events
- [ ] Write component tests for `AgentCard`, `AgentProfileModal`

---

## Acceptance Criteria

- [ ] `/projects/[id]` renders with project header and tabbed navigation
- [ ] Dashboard shows all project agents with real-time status
- [ ] "Trigger Knowledge Ingestion" button sends API call and shows feedback
- [ ] Agents tab renders a responsive grid of agent cards
- [ ] Each agent card shows avatar, name, role badge, tags, status, and bio snippet
- [ ] Clicking an agent card opens the full-screen profile modal
- [ ] Edit mode in modal allows editing soul and saving via PATCH API
- [ ] Agent status updates in real time via WebSocket without page refresh
- [ ] Component tests pass

---

## Dependencies
- **Depends on**: 0000007 (Project List UI), 0000009 (ZeroClaw Process Manager), 0000006 (Agent Instance API)
