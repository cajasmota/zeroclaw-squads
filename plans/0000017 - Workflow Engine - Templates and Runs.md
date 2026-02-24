# 0000017 - Workflow Engine - Templates and Runs

**Epic**: EPIC-11: Workflow Engine
**Assigned To**: Backend Agent
**Status**: [ ] Not Started
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

- [ ] Create `WorkflowsModule` in NestJS
- [ ] Define `WorkflowTemplate` Mongoose schema:
  - [ ] `tenantId`, `name`, `description`, `isGlobal` (boolean)
  - [ ] `nodes[]`: `{ id, type, agentRole, requiresHumanApproval, description, nextNodeId, onSuccessNodeId, onFailNodeId, kanbanStatus?, kanbanStatusTrigger? }`
    - [ ] `kanbanStatus` (optional enum): `backlog | selected | in_progress | review | done` — when set, moving through this node moves the standard Kanban card to this column
    - [ ] `kanbanStatusTrigger` (optional enum): `on_start | on_complete` — whether the card moves when this node starts or when it finishes
  - [ ] `edges[]`: `{ from, to }` (React Flow compatible)
  - [ ] Pre-seed global templates: Librarian Ingestion, Product Strategy, Feature Development, Hotfix
    - [ ] **Feature Development** template nodes must be pre-configured with standard kanban mappings:
      - `Developer (Implement)` node: `kanbanStatus = in_progress`, `kanbanStatusTrigger = on_start`
      - `Reviewer (Code Review)` node: `kanbanStatus = review`, `kanbanStatusTrigger = on_start`
      - `EndNode` (or final merge step): `kanbanStatus = done`, `kanbanStatusTrigger = on_complete`
- [ ] Define `WorkflowRun` Mongoose schema:
  - [ ] `workflowTemplateId`, `projectId`, `storyId` (nullable), `tenantId`
  - [ ] `status` (enum: `running | paused | completed | failed`)
  - [ ] `currentNodeId`
  - [ ] `startedAt`, `completedAt`
  - [ ] `nodeExecutions[]`: `{ nodeId, status, startedAt, completedAt, runId, agentInstanceId }`
- [ ] Create `WorkflowsService`:
  - [ ] `findAllTemplates(tenantId)` — global + tenant templates
  - [ ] `createTemplate(tenantId, dto)` — custom workflow
  - [ ] `triggerWorkflow(projectId, templateId, storyId?)` — creates WorkflowRun, starts first node
  - [ ] `advanceWorkflow(runId)` — moves to next node after current completes
  - [ ] `approveNode(runId, nodeId)` — human approves paused node, resumes workflow
  - [ ] `getRunHistory(projectId)` — list historical runs
- [ ] Create `WorkflowNodeExecutorService`:
  - [ ] `executeNode(run, node)`:
    - [ ] Find available agent with matching `agentRole`
    - [ ] Create Kanban ticket for this node execution
    - [ ] Signal agent via SIGUSR1 + stdin inject with node context
    - [ ] If `requiresHumanApproval`: set run status to `paused`, emit `workflow.approval_needed`
    - [ ] Update `nodeExecution.status` in WorkflowRun
- [ ] Create REST endpoints:
  - [ ] `GET /workflows/templates` — list global + tenant templates
  - [ ] `POST /workflows/templates` — create custom template
  - [ ] `POST /projects/:id/workflows/trigger` — trigger workflow run
  - [ ] `GET /projects/:id/workflows/runs` — list runs
  - [ ] `GET /projects/:id/workflows/runs/:runId` — run detail
  - [ ] `POST /projects/:id/workflows/runs/:runId/approve` — human approval
- [ ] Write unit tests for `WorkflowsService` and `WorkflowNodeExecutorService`

---

## Acceptance Criteria

- [ ] 4 pre-seeded global workflow templates exist (Librarian Ingestion, Product Strategy, Feature Development, Hotfix)
- [ ] `triggerWorkflow()` creates a WorkflowRun and executes the first node
- [ ] Nodes with `requiresHumanApproval = true` pause the workflow and emit approval event
- [ ] `approveNode()` resumes the workflow from the paused node
- [ ] Each node execution creates a Kanban ticket for tracking
- [ ] Historical runs are stored and retrievable
- [ ] Unit tests pass

---

## Dependencies
- **Depends on**: 0000009 (ZeroClaw Process Manager), 0000012 (Backlog API)
