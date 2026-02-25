# 0000017 - Workflow Engine - Templates and Runs

**Epic**: EPIC-11: Workflow Engine
**Assigned To**: Backend Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §16 (Workflow Templates & Management)
**Knowledge Base**: `knowledge-base/02-data-models.md`, `knowledge-base/04-agent-roles.md`

---

## Title
Implement Workflow Template data model, WorkflowRun tracking, and approval gate logic

## Description
The Workflow Engine enables the PM agent (and users) to define reusable multi-step workflows. When triggered, a WorkflowRun is created and nodes are executed in sequence, with optional human approval gates that pause execution.

Pre-defined workflows include:
- Librarian Ingestion
- Product Strategy
- Feature Development
- Hotfix

## Context
Workflows are the structured automation layer above individual agent tasks. Each node in a workflow maps to an agent action. The "Requires Human Approval" flag on a node pauses the workflow until a human approves via the UI. Every execution is recorded for historical audit.

---

## Actionable Tasks

- [x] Create `WorkflowsModule` in NestJS
- [x] Define `WorkflowTemplate` Mongoose schema:
  - [x] `tenantId`, `name`, `description`, `isGlobal` (boolean)
  - [x] `nodes[]`: `{ id, type, agentRole, requiresHumanApproval, description, nextNodeId, onSuccessNodeId, onFailNodeId, kanbanStatus?, kanbanStatusTrigger? }`
    - [x] `kanbanStatus` (optional enum): `backlog | selected | in_progress | review | done` — when set, moving through this node moves the standard Kanban card to this column
    - [x] `kanbanStatusTrigger` (optional enum): `on_start | on_complete` — whether the card moves when this node starts or when it finishes
  - [x] `edges[]`: `{ from, to }` (React Flow compatible)
  - [x] Pre-seed global templates: Librarian Ingestion, Product Strategy, Feature Development, Hotfix
    - [x] **Feature Development** template nodes must be pre-configured with standard kanban mappings:
      - `Developer (Implement)` node: `kanbanStatus = in_progress`, `kanbanStatusTrigger = on_start`
      - `Reviewer (Code Review)` node: `kanbanStatus = review`, `kanbanStatusTrigger = on_start`
      - `EndNode` (or final merge step): `kanbanStatus = done`, `kanbanStatusTrigger = on_complete`
- [x] Define `WorkflowRun` Mongoose schema:
  - [x] `workflowTemplateId`, `projectId`, `storyId` (nullable), `tenantId`
  - [x] `status` (enum: `running | paused | completed | failed`)
  - [x] `currentNodeId`
  - [x] `startedAt`, `completedAt`
  - [x] `nodeExecutions[]`: `{ nodeId, status, startedAt, completedAt, runId, agentInstanceId }`
- [x] Create `WorkflowsService`:
  - [x] `findAllTemplates(tenantId)` — global + tenant templates
  - [x] `createTemplate(tenantId, dto)` — custom workflow
  - [x] `triggerWorkflow(projectId, templateId, storyId?)` — creates WorkflowRun, starts first node
  - [x] `advanceWorkflow(runId)` — moves to next node after current completes
  - [x] `approveNode(runId, nodeId)` — human approves paused node, resumes workflow
  - [x] `getRunHistory(projectId)` — list historical runs
- [x] Create `WorkflowNodeExecutorService`:
  - [x] `executeNode(run, node)`:
    - [x] Find available agent with matching `agentRole`
    - [x] Create Kanban ticket for this node execution
    - [x] Signal agent via SIGUSR1 + stdin inject with node context
    - [x] If `requiresHumanApproval`: set run status to `paused`, emit `workflow.approval_needed`
    - [x] Update `nodeExecution.status` in WorkflowRun
- [x] Create REST endpoints:
  - [x] `GET /workflows/templates` — list global + tenant templates
  - [x] `POST /workflows/templates` — create custom template
  - [x] `POST /projects/:id/workflows/trigger` — trigger workflow run
  - [x] `GET /projects/:id/workflows/runs` — list runs
  - [x] `GET /projects/:id/workflows/runs/:runId` — run detail
  - [x] `POST /projects/:id/workflows/runs/:runId/approve` — human approval
- [x] Write unit tests for `WorkflowsService` and `WorkflowNodeExecutorService`

---

## Acceptance Criteria

- [x] 4 pre-seeded global workflow templates exist (Librarian Ingestion, Product Strategy, Feature Development, Hotfix)
- [x] `triggerWorkflow()` creates a WorkflowRun and executes the first node
- [x] Nodes with `requiresHumanApproval = true` pause the workflow and emit approval event
- [x] `approveNode()` resumes the workflow from the paused node
- [x] Each node execution creates a Kanban ticket for tracking
- [x] Historical runs are stored and retrievable
- [x] Unit tests pass

---

## Dependencies
- **Depends on**: 0000009 (ZeroClaw Process Manager), 0000012 (Backlog API)
