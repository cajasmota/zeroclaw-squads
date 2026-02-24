# 0000012 - Backlog Data Model - Epics, Stories, Tasks API

**Epic**: EPIC-07: Backlog & Sprint Management
**Assigned To**: Backend Agent
**Status**: [ ] Not Started
**PRD Reference**: PRD.md §17 (Global Backlog & Intelligent PM Strategy), §18 (Agent-User Interaction)
**Knowledge Base**: `knowledge-base/02-data-models.md`, `knowledge-base/04-agent-roles.md`

---

## Title
Implement Epic, Story, and Task data models with RESTful API (3-level hierarchy)

## Description
Implement the full backlog hierarchy: **Epic → Stories → Tasks**. This 3-level structure mirrors Jira's organization:
- **Epic**: Large feature grouping (e.g., "Authentication System")
- **Story**: Implementable unit assigned to an agent (e.g., "User login flow")
- **Task**: Checklist sub-item within a story (e.g., "Write unit tests")

Stories and epics are the primary unit the PM agent manages and assigns to developers.

## Context
The backlog is the central coordination layer of AES. PM agents create and manage stories; Developer agents pick them up and implement them. The hierarchy Epic > Story > Task enables high-level planning while maintaining granular task tracking. All items must support kanban status progression.

---

## Actionable Tasks

- [ ] Create `BacklogModule` in NestJS
- [ ] Define `Epic` Mongoose schema:
  - [ ] `projectId`, `tenantId`, `title`, `description`, `color`, `status`, `order`, timestamps
- [ ] Define `Story` Mongoose schema:
  - [ ] `projectId`, `epicId` (nullable), `sprintId` (nullable), `tenantId`
  - [ ] `title`, `description`
  - [ ] `type` (enum: `feature | bugfix | refactor | task`)
  - [ ] `priority` (enum: `high | medium | low`)
  - [ ] `status` (enum: `backlog | selected | in_progress | review | done`)
  - [ ] `workflowNodeStatus` (string)
  - [ ] `assignedTo` (ObjectId[], ref AgentInstance)
  - [ ] `waitingForApproval` (boolean, default false)
  - [ ] `waitingForAnswer` (boolean, default false)
  - [ ] `branchName` (string, e.g., `feature/{storyId}`)
  - [ ] `runId` (string)
  - [ ] `order` (number)
  - [ ] Timestamps
- [ ] Define `Task` Mongoose schema:
  - [ ] `storyId`, `projectId`, `tenantId`
  - [ ] `title`, `description`
  - [ ] `status` (enum: `todo | in_progress | done`)
  - [ ] `assignedTo` (ObjectId, ref AgentInstance)
  - [ ] `order` (number)
  - [ ] Timestamps
- [ ] Define `Sprint` Mongoose schema:
  - [ ] `projectId`, `tenantId`, `name`, `startDate`, `endDate`
  - [ ] `status` (enum: `planning | active | completed`)
  - [ ] `isReady` (boolean — triggers PM agent assignment when true)
- [ ] Create `EpicsService`, `StoriesService`, `TasksService`, `SprintsService`
- [ ] Create REST controllers:
  - [ ] **Epics**: `GET|POST /projects/:id/epics`, `PATCH|DELETE /projects/:id/epics/:epicId`
  - [ ] **Stories**: `GET|POST /projects/:id/stories`, `PATCH|DELETE /projects/:id/stories/:storyId`
    - [ ] `GET /projects/:id/stories?epicId=&sprintId=&status=` — filterable
  - [ ] **Tasks**: `GET|POST /projects/:id/stories/:storyId/tasks`, `PATCH|DELETE .../:taskId`
  - [ ] **Sprints**: `GET|POST /projects/:id/sprints`, `PATCH /projects/:id/sprints/:sprintId`
    - [ ] `POST /projects/:id/sprints/:sprintId/ready` — mark sprint ready → emit `sprint.ready` event
- [ ] Emit `sprint.ready` event when sprint is marked ready (triggers PM agent assignment)
- [ ] Emit `story.assigned` event when `assignedTo` is set on a story
- [ ] Inject `AesGateway` into `BacklogModule` (import `WebSocketModule` or use a shared gateway provider)
- [ ] In `StoriesService`, create `updateStatus(storyId, projectId, tenantId, status, workflowNodeStatus?)`:
  - [ ] Updates `Story.status` (and optionally `Story.workflowNodeStatus`) in MongoDB
  - [ ] Immediately after saving, calls `aesGateway.emitToProject(projectId, 'story:status', { storyId, status, workflowNodeStatus })`
  - [ ] All other services (0000014, 0000028) MUST call this method instead of updating `status` directly — this ensures the WebSocket event fires on every transition
- [ ] Write unit tests for services

---

## Acceptance Criteria

- [ ] `POST /projects/:id/epics` creates an epic with color and order
- [ ] `POST /projects/:id/stories` creates a story optionally linked to an epic and sprint
- [ ] `GET /projects/:id/stories?epicId=X` returns only stories in that epic
- [ ] `POST /projects/:id/stories/:storyId/tasks` creates tasks under a story
- [ ] Marking sprint as ready emits `sprint.ready` event
- [ ] Stories support all 5 kanban statuses (backlog, selected, in_progress, review, done)
- [ ] `waitingForApproval` and `waitingForAnswer` flags are settable via PATCH
- [ ] Every call to `StoriesService.updateStatus()` emits a `story:status` WebSocket event to the project room
- [ ] WebSocket event payload includes `{ storyId, status, workflowNodeStatus }` so the frontend can move the card to the correct Kanban column without a page refresh
- [ ] All data scoped to tenantId
- [ ] Unit tests pass

---

## Dependencies
- **Depends on**: 0000005 (Project API), 0000002 (Auth & Multi-Tenant)
