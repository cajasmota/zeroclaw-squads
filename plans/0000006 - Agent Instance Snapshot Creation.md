# 0000006 - Agent Instance Snapshot Creation

**Epic**: EPIC-04: Project Management
**Assigned To**: Backend Agent
**Status**: [~] In Progress
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

- [ ] Create `AgentInstancesModule` in NestJS
- [ ] Define `AgentInstance` Mongoose schema with fields:
  - [ ] `projectId` (ObjectId, indexed)
  - [ ] `tenantId` (ObjectId, indexed)
  - [ ] `templateId` (ObjectId, ref AgentTemplate)
  - [ ] `displayName` (string — user override or template default)
  - [ ] `identifier` (string — e.g., `web-app-dev-1`, unique per project)
  - [ ] `tags` (string[])
  - [ ] `pid` (number, nullable — assigned when spawned)
  - [ ] `soul` (string — copied from template at snapshot time)
  - [ ] `aieos_identity` (Mixed — copied from template at snapshot time)
  - [ ] `config.model` (string)
  - [ ] `config.provider` (string)
  - [ ] `config.skills` (string)
  - [ ] `config.canWriteCode` (boolean)
  - [ ] `config.mcpServers` (array)
  - [ ] `status` (enum: `idle | busy | error`)
  - [ ] `workspacePath` (string — computed: `/artifacts/{projectId}/workspaces/{instanceId}/`)
  - [ ] Timestamps
- [ ] Create `AgentInstancesService` with methods:
  - [ ] `createSnapshot(projectId, tenantId, templateId, displayName?)` — creates instance from template
  - [ ] `findByProject(projectId, tenantId)` — list all instances for a project
  - [ ] `findById(id, tenantId)` — single instance
  - [ ] `updateStatus(id, status)` — update process status
  - [ ] `updatePid(id, pid)` — update PID after spawn
  - [ ] `updateSoulOrIdentity(id, tenantId, { soul?, aieos_identity? })` — direct instance edit without affecting template
- [ ] Create `AgentInstancesController` with routes:
  - [ ] `GET /projects/:projectId/agents` — list instances
  - [ ] `GET /projects/:projectId/agents/:id` — single instance
  - [ ] `PATCH /projects/:projectId/agents/:id` — edit soul/identity/displayName
- [ ] Listen to `project.created` event to auto-create instances for assigned templates
- [ ] Write unit tests for `AgentInstancesService`

---

## Acceptance Criteria

- [ ] When a project is created with 5 role assignments, 5 AgentInstance documents are created
- [ ] Each AgentInstance has a full copy of the template's soul and aieos_identity at snapshot time
- [ ] Updating the original AgentTemplate does NOT affect existing AgentInstances
- [ ] Updating an AgentInstance's soul/identity does NOT affect the AgentTemplate
- [ ] `workspacePath` is correctly computed as `/artifacts/{projectId}/workspaces/{instanceId}/`
- [ ] `identifier` is unique within a project
- [ ] All unit tests pass

---

## Dependencies
- **Depends on**: 0000003 (Template API), 0000005 (Project API)
