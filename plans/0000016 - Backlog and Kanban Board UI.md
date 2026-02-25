# 0000016 - Backlog and Kanban Board UI

**Epic**: EPIC-10: UI - Project Control Center
**Assigned To**: Frontend Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §5.2 (Project Control Center — Backlog View, Kanban Board)
**Knowledge Base**: `knowledge-base/08-ui-design-system.md`, `knowledge-base/02-data-models.md`

---

## Title
Build Backlog (Jira-style with Epic/Story/Task hierarchy) and Kanban Board tabs

## Description
Implement two key tabs in the Project Control Center:
1. **Backlog Tab** — Jira-style list view with 3-level hierarchy: **Epic → Stories → Tasks**, grouped by Sprint
2. **Kanban Board Tab** — columns (Backlog, Selected for Dev, In Progress, Review, Done) with filters and ticket modals

## Context
The backlog and kanban are the primary views for project work management. The 3-level Epic > Story > Task structure provides both high-level and granular views. Kanban quick-filters for `waitingForApproval` and `waitingForAnswer` are critical for human oversight.

---

## Actionable Tasks

### Backlog Tab

- [x] Create `BacklogView` component (embedded in `/app/projects/[id]/page.tsx`):
  - [x] Story list with priority badges, status badges, type icons
  - [x] "Add Story" button → opens `StoryCreateModal`
  - [x] Fetches from `GET /projects/:id/stories`
  - [x] Top-level structure: list of **Epics** (collapsible sections) — flat list only
  - [x] "No Epic" group for stories without an epic assignment
  - [x] Expanding a story row reveals its **Tasks** as a checklist
  - [x] Sprint grouping toggle: group by Sprint OR group by Epic
  - [x] "Add Epic" button → inline form
  - [x] "Add Task" button (per story) → inline quick-add input
- [x] Build `StoryCreateModal` (Shadcn `Dialog`):
  - [x] Title, Type select, Priority select
  - [x] "Create" → `POST /projects/:id/stories`
  - [x] Description (Tiptap light), Epic assignment, Sprint assignment
- [x] Build `SprintPanel`:
  - [x] Shows sprint info: name, dates, status
  - [x] "Mark as Ready" button → `POST /projects/:id/sprints/:sprintId/ready`

### Kanban Board Tab

- [x] Create `KanbanBoard` component (embedded in `/app/projects/[id]/page.tsx`):
  - [x] 5 columns: **Backlog | Selected for Dev | In Progress | Review | Done**
  - [x] Column headers show story count
  - [x] Filter bar: "Waiting for Approval" and "Waiting for Answer" toggles
  - [x] Drag-and-drop cards between columns (update `status` via PATCH)
- [x] Build `KanbanCard` component:
  - [x] Story title, type badge, priority indicator, blockage icons
  - [x] Click → opens `TicketModal`
- [x] Build `TicketModal` (Shadcn `Dialog`):
  - [x] Story title, description
  - [x] Comment input and thread (human + agent messages)
  - [x] "Approve & Merge PR" button
  - [x] Tasks checklist (inline complete/incomplete)
  - [x] "Answer" button for `waitingForAnswer`
  - [x] **Live Activity Logs Tab** (WebSocket real-time logs)
- [x] WebSocket subscription for real-time kanban updates:
  - [x] On mount, join the project room: `socket.emit('join-project', projectId)`
  - [x] Subscribe to `story:status` event for live card movement
  - [x] Subscribe to `ticket:comment` event to refresh comment threads
- [x] Write component tests for `KanbanCard`, `TicketModal`

---

## Acceptance Criteria

- [x] Backlog shows 3-level Epic → Story → Task hierarchy
- [x] Epics are collapsible sections with stories inside
- [x] Stories show tasks as an expandable checklist
- [x] Sprint grouping and Epic grouping are toggleable views
- [x] "Mark Sprint as Ready" calls the API and shows confirmation
- [x] Kanban board shows 5 columns with correct stories in each
- [x] Drag-and-drop between columns updates story status
- [x] "Waiting for Approval" filter shows only flagged cards
- [x] Ticket modal Discussion tab shows comment thread
- [x] Ticket modal Live Activity tab shows real-time agent logs via WebSocket
- [x] "Approve" and "Answer" actions resolve the respective flags
- [x] **Kanban cards auto-move** when agents transition story status (in_progress → review → done): the card moves to the correct column in real-time via WebSocket `story:status` event — no page refresh required
- [x] Human drag-and-drop between columns also works (optimistic update + PATCH API call)
- [x] Component tests pass

---

## Dependencies
- **Depends on**: 0000012 (Backlog API), 0000015 (Project Control Center Layout), 0000025 (Ticket Dialogue — for Discussion tab and Approve/Answer actions)
