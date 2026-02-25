# 0000006 - Agent Instance Snapshot Creation

**Epic**: EPIC-04: Project Management
**Assigned To**: Backend Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §2.2 (Agent Instancing & Snapshots), §4.1 (Minimum Team)
**Knowledge Base**: `knowledge-base/02-data-models.md`, `knowledge-base/04-agent-roles.md`, `knowledge-base/06-aieos-schema.md`

---

## Title
Implement AgentInstance snapshot creation when templates are assigned to a project

## Description
When a user assigns templates to roles during project creation (or afterward), the backend must create **AgentInstance** documents — unique snapshots of the template's definition at the time of assignment. These instances are independent of the original template; future template changes do not affect existing instances.

## Context
The snapshot pattern ensures that each project has stable, isolated agent configurations. An AgentInstance includes a copy of the soul, AIEOS identity, and config from the template at the moment of assignment. The instance also tracks the agent process PID and runtime status.

---

## Actionable Tasks

- [x] Create `AgentInstancesModule` in NestJS
- [x] Define `AgentInstance` Mongoose schema with fields:
  - [x] `projectId` (ObjectId, indexed)
  - [x] `tenantId` (ObjectId, indexed)
  - [x] `templateId` (ObjectId, ref AgentTemplate)
  - [x] `displayName` (string — user override or template default)
  - [x] `identifier` (string — e.g., `web-app-dev-1`, unique per project)
  - [x] `tags` (string[])
  - [x] `pid` (number, nullable — assigned when spawned)
  - [x] `soul` (string — copied from template at snapshot time)
  - [x] `aieos_identity` (Mixed — copied from template at snapshot time)
  - [x] `config.model` (string)
  - [x] `config.provider` (string)
  - [x] `config.skills` (string)
  - [x] `config.canWriteCode` (boolean)
  - [x] `config.mcpServers` (array)
  - [x] `status` (enum: `idle | busy | error`)
  - [x] `workspacePath` (string — computed: `/artifacts/{projectId}/workspaces/{instanceId}/`)
  - [x] Timestamps
- [x] Create `AgentInstancesService` with methods:
  - [x] `createSnapshot(projectId, tenantId, templateId, displayName?)` — creates instance from template
  - [x] `findByProject(projectId, tenantId)` — list all instances for a project
  - [x] `findById(id, tenantId)` — single instance
  - [x] `updateStatus(id, status)` — update process status
  - [x] `updatePid(id, pid)` — update PID after spawn
  - [x] `updateSoulOrIdentity(id, tenantId, { soul?, aieos_identity? })` — direct instance edit without affecting template
- [x] Create `AgentInstancesController` with routes:
  - [x] `GET /projects/:projectId/agents` — list instances
  - [x] `GET /projects/:projectId/agents/:id` — single instance
  - [x] `PATCH /projects/:projectId/agents/:id` — edit soul/identity/displayName
- [x] Listen to `project.created` event to auto-create instances for assigned templates
- [x] Write unit tests for `AgentInstancesService`

---

## Acceptance Criteria

- [x] When a project is created with 5 role assignments, 5 AgentInstance documents are created
- [x] Each AgentInstance has a full copy of the template's soul and aieos_identity at snapshot time
- [x] Updating the original AgentTemplate does NOT affect existing AgentInstances
- [x] Updating an AgentInstance's soul/identity does NOT affect the AgentTemplate
- [x] `workspacePath` is correctly computed as `/artifacts/{projectId}/workspaces/{instanceId}/`
- [x] `identifier` is unique within a project
- [x] All unit tests pass

---

## Dependencies
- **Depends on**: 0000003 (Template API), 0000005 (Project API)
