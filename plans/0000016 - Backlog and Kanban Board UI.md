# 0000016 - Backlog and Kanban Board UI

**Epic**: EPIC-10: UI - Project Control Center
**Assigned To**: Frontend Agent
**Status**: [ ] Not Started
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

- [ ] Create `BacklogView` component at `/app/projects/[id]/backlog/`:
  - [ ] Top-level structure: list of **Epics** (collapsible sections)
  - [ ] Each epic shows: color indicator, title, story count, status badge
  - [ ] "No Epic" group for stories without an epic assignment
  - [ ] Within each epic: list of **Stories** (expandable rows)
  - [ ] Each story row shows: type icon, title, priority badge, status badge, assignee avatars, sprint tag
  - [ ] Expanding a story row reveals its **Tasks** as a checklist
  - [ ] Each task shows: title, status checkbox, assignee
  - [ ] Sprint grouping toggle: group by Sprint OR group by Epic
  - [ ] "Add Epic" button → inline form
  - [ ] "Add Story" button (per epic or ungrouped) → opens `StoryCreateModal`
  - [ ] "Add Task" button (per story) → inline quick-add input
- [ ] Build `StoryCreateModal` (Shadcn `Dialog`):
  - [ ] Title, Description (Tiptap light), Type select, Priority select, Epic assignment, Sprint assignment
  - [ ] "Create" → `POST /projects/:id/stories`
- [ ] Build `SprintPanel`:
  - [ ] Shows sprint info: name, dates, status
  - [ ] "Mark as Ready" button → `POST /projects/:id/sprints/:sprintId/ready`
  - [ ] Ready status shows confirmation: "This will trigger PM agent to assign stories"

### Kanban Board Tab

- [ ] Create `KanbanBoard` component at `/app/projects/[id]/kanban/`:
  - [ ] 5 columns: **Backlog | Selected for Dev | In Progress | Review | Done**
  - [ ] Column headers show story count
  - [ ] Drag-and-drop cards between columns (update `status` via PATCH)
  - [ ] Filter bar (above board):
    - [ ] Toggle: "Waiting for Approval" (filters cards with `waitingForApproval = true`)
    - [ ] Toggle: "Waiting for Answer" (filters cards with `waitingForAnswer = true`)
- [ ] Build `KanbanCard` component:
  - [ ] Story title (truncated)
  - [ ] Type badge (Feature/Bugfix/Refactor/Task) with distinct colors
  - [ ] Priority indicator (colored left border)
  - [ ] Epic label (if assigned)
  - [ ] Blockage icon (if `waitingForApproval` or `waitingForAnswer`)
  - [ ] Assignee avatar(s)
  - [ ] Click → opens `TicketModal`
- [ ] Build `TicketModal` (Shadcn `Dialog`, full-screen):
  - [ ] **Discussion Tab**:
    - [ ] Story title, description (rich text read-only)
    - [ ] Tasks checklist (inline complete/incomplete)
    - [ ] Comment input for human → agent communication
    - [ ] Comment thread (user messages + agent responses)
    - [ ] "Approve" button (sets `waitingForApproval = false`, triggers merge)
    - [ ] "Answer" button (resolves `waitingForAnswer`, injects response to agent)
  - [ ] **Live Activity Logs Tab**:
    - [ ] Real-time stdout/stderr stream from assigned agent (WebSocket)
    - [ ] Historical logs from `transcript.jsonl`
    - [ ] Log entries: timestamp, type (llm | tool | system), content
- [ ] WebSocket subscription for real-time kanban updates:
  - [ ] On mount, join the project room: `socket.emit('join-project', projectId)`
  - [ ] Subscribe to `story:status` event: `socket.on('story:status', ({ storyId, status }) => { /* move card to correct column */ })`
  - [ ] On `story:status`, find the card with matching `storyId` and move it to the column matching `status` — **no page refresh, no polling needed**; the card moves live as agents work
  - [ ] Subscribe to `ticket:comment` event to refresh comment threads in open `TicketModal`
- [ ] Write component tests for `KanbanCard`, `TicketModal`

---

## Acceptance Criteria

- [ ] Backlog shows 3-level Epic → Story → Task hierarchy
- [ ] Epics are collapsible sections with stories inside
- [ ] Stories show tasks as an expandable checklist
- [ ] Sprint grouping and Epic grouping are toggleable views
- [ ] "Mark Sprint as Ready" calls the API and shows confirmation
- [ ] Kanban board shows 5 columns with correct stories in each
- [ ] Drag-and-drop between columns updates story status
- [ ] "Waiting for Approval" filter shows only flagged cards
- [ ] Ticket modal Discussion tab shows comment thread
- [ ] Ticket modal Live Activity tab shows real-time agent logs via WebSocket
- [ ] "Approve" and "Answer" actions resolve the respective flags
- [ ] **Kanban cards auto-move** when agents transition story status (in_progress → review → done): the card moves to the correct column in real-time via WebSocket `story:status` event — no page refresh required
- [ ] Human drag-and-drop between columns also works (optimistic update + PATCH API call)
- [ ] Component tests pass

---

## Dependencies
- **Depends on**: 0000012 (Backlog API), 0000015 (Project Control Center Layout), 0000025 (Ticket Dialogue — for Discussion tab and Approve/Answer actions)
