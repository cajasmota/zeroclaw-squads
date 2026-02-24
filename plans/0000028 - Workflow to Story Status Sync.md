# 0000028 - Workflow Node Status to Story Status Synchronization

**Epic**: EPIC-11: Workflow Engine
**Assigned To**: Backend Agent
**Status**: [ ] Not Started
**PRD Reference**: PRD.md §16.3 (Node Configuration & Task Tracking), §17.1 (Dual-Status Tracking)
**Knowledge Base**: `knowledge-base/02-data-models.md`, `knowledge-base/05-communication-protocols.md`

---

## Title
Synchronize WorkflowRun node status transitions to Story.workflowNodeStatus field

## Description
The PRD requires **dual-status tracking** on every Story: the global Kanban stage (`status`) AND the current Workflow Node position (`workflowNodeStatus`). When a workflow node transitions (starts, completes, fails, waits for approval), that state change must be written to the corresponding Story's `workflowNodeStatus` field in MongoDB.

This story wires up the bridge between the Workflow Engine (story 0000017) and the Backlog (story 0000012).

## Context
PRD §17.1: "Dual-Status: Tracking both Workflow Node status and Global Kanban stage."

A story can be "In Progress" on the Kanban (global status) while the workflow node shows "Waiting for Librarian" — these are two independent dimensions visible in the Ticket Modal and Kanban card.

---

## Actionable Tasks

- [ ] Update `WorkflowNodeExecutorService` (story 0000017) to emit story status events:
  - [ ] When a node starts: emit `workflow.node.started` with `{ storyId, nodeId, nodeDescription }`
  - [ ] When a node completes: emit `workflow.node.completed` with `{ storyId, nodeId }`
  - [ ] When a node fails: emit `workflow.node.failed` with `{ storyId, nodeId, error }`
  - [ ] When a node requires approval: emit `workflow.node.approval_needed` with `{ storyId, nodeId }`
- [ ] Create `WorkflowStoryBridgeService`:
  - [ ] Listens to `workflow.node.started` (payload: `{ storyId, projectId, tenantId, nodeId, nodeDescription, node }`):
    - [ ] Updates `Story.workflowNodeStatus = nodeDescription` (e.g., "Developer: Implementing feature")
    - [ ] **Kanban auto-move**: if `node.kanbanStatus` is set AND `node.kanbanStatusTrigger === 'on_start'`, call `StoriesService.updateStatus(storyId, projectId, tenantId, node.kanbanStatus)` → emits `story:status` WebSocket event → Kanban card moves to target column
    - [ ] Broadcasts `story:workflow_status` WebSocket event to project room (workflow position indicator — independent of Kanban column)
  - [ ] Listens to `workflow.node.completed` (payload: `{ storyId, projectId, tenantId, nodeId, nodeDescription, node }`):
    - [ ] Updates `Story.workflowNodeStatus = "Completed: {nodeDescription}"`
    - [ ] **Kanban auto-move**: if `node.kanbanStatus` is set AND `node.kanbanStatusTrigger === 'on_complete'`, call `StoriesService.updateStatus(storyId, projectId, tenantId, node.kanbanStatus)`
  - [ ] Listens to `workflow.node.failed`:
    - [ ] Updates `Story.workflowNodeStatus = "Error: {error}"`
    - [ ] Calls `StoriesService.updateStatus(storyId, projectId, tenantId, 'backlog')` (always returns to backlog on failure, regardless of `kanbanStatus` config)
  - [ ] Listens to `workflow.node.approval_needed`:
    - [ ] Updates `Story.workflowNodeStatus = "Waiting for Approval"`
    - [ ] Sets `Story.waitingForApproval = true`
- [ ] Add `GET /projects/:id/stories/:storyId/workflow-status` endpoint:
  - [ ] Returns `{ workflowNodeStatus, waitingForApproval, waitingForAnswer, currentNodeId, runId }`
  - [ ] Used by frontend Ticket Modal to show current workflow position
- [ ] Write unit tests for `WorkflowStoryBridgeService` event handlers

---

## Acceptance Criteria

- [ ] When a workflow node starts, `Story.workflowNodeStatus` is updated within 1 second
- [ ] When a node requires approval, `Story.waitingForApproval` is set to `true` and visible in Kanban
- [ ] When a node fails, the story returns to backlog with `workflowNodeStatus` showing the error
- [ ] WebSocket broadcasts `story:workflow_status` events to connected frontend clients
- [ ] `GET .../workflow-status` returns current dual-status data
- [ ] Kanban card indicators reflect `waitingForApproval` and `waitingForAnswer` flags correctly
- [ ] **Kanban auto-move via `kanbanStatus` node config**: when a node with `kanbanStatus = "review"` and `kanbanStatusTrigger = "on_start"` fires, the standard Kanban card moves to the Review column automatically
- [ ] Nodes without `kanbanStatus` set do NOT affect the standard Kanban column (only `workflowNodeStatus` is updated)
- [ ] Unit tests pass

---

## Dependencies
- **Depends on**: 0000012 (Backlog API — Story model), 0000017 (Workflow Engine), 0000023 (WebSocket Gateway)
