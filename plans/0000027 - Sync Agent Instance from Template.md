# 0000027 - Sync Agent Instance from Template

**Epic**: EPIC-03: Agent Template System
**Assigned To**: Backend Agent, Frontend Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §2.2 (Agent Instancing & Snapshots)
**Knowledge Base**: `knowledge-base/02-data-models.md`, `knowledge-base/04-agent-roles.md`, `knowledge-base/06-aieos-schema.md`

---

## Title
Allow manual sync of an AgentInstance from its source AgentTemplate

## Description
When a Template is assigned to a Project, an independent snapshot (`AgentInstance`) is created. Over time, the global template may be improved (new soul, updated AIEOS identity, config changes). This story implements a "Sync from Template" feature that allows a user to pull the latest template changes into a specific agent instance.

**Key design rules:**
- Sync is always **manual** — never automatic
- Only updates fields the user confirms (soul, AIEOS identity, config — one or all)
- Preserves instance-specific overrides (displayName, custom tags) unless explicitly replaced
- The instance's `pid` and runtime state are NOT affected by sync (sync updates only the stored config)

## Context
PRD §2.2: "Changes to global templates do not propagate to instances unless manually triggered."

---

## Actionable Tasks

### Backend

- [x] Add `syncFromTemplate` method to `AgentInstancesService`:
  - [x] `syncFromTemplate(tenantId, projectId, agentInstanceId, fields: SyncFields)`:
    - [x] `SyncFields`: `{ soul?: boolean, aieos?: boolean, config?: boolean }`
    - [x] Fetches the source `AgentTemplate` using `instance.templateId`
    - [x] Conditionally updates: `instance.soul`, `instance.aieos_identity`, `instance.config`
    - [x] Never updates: `displayName`, `identifier`, `pid`, `status`, `workspacePath`
    - [x] Returns the updated `AgentInstance`
- [x] Add `POST /projects/:projectId/agents/:agentInstanceId/sync` endpoint:
  - [x] Body: `{ fields: { soul: true, aieos: true, config: false } }`
  - [x] Calls `syncFromTemplate()`
  - [x] Returns updated `AgentInstance`
  - [x] Requires `JwtAuthGuard`; scoped to `tenantId` from JWT
- [x] Write unit tests for `syncFromTemplate()`:
  - [x] Only syncs requested fields
  - [x] Does not modify `displayName` or `pid`
  - [x] Throws `NotFoundException` if template not found

### Frontend

- [x] Add "Sync from Template" button to Agent Profile Modal (in Edit Mode, story 0000015):
  - [x] Shows only if `instance.templateId` exists
  - [x] Opens a confirmation `Dialog` with checkboxes:
    - [x] "Sync Soul (personality prompt)"
    - [x] "Sync AIEOS Identity (personality JSON)"
    - [x] "Sync Config (model, provider, MCP servers)"
  - [x] "Sync" button calls `POST /api/projects/:id/agents/:agentId/sync`
  - [x] On success: refreshes the Agent Profile Modal with updated data, shows success toast

---

## Acceptance Criteria

- [x] `POST .../sync` with `{ fields: { soul: true } }` updates only the soul, leaving AIEOS and config unchanged
- [x] `POST .../sync` with `{ fields: { soul: true, aieos: true, config: true } }` updates all three fields
- [x] `displayName` and `pid` are never modified by sync
- [x] Syncing a non-existent agent instance returns 404
- [x] UI sync dialog shows three checkboxes and a confirmation step
- [x] Successful sync shows a toast and refreshes the agent card
- [x] Unit tests pass

---

## Dependencies
- **Depends on**: 0000006 (Agent Instance Snapshot), 0000015 (Project Control Center UI — Agent Profile Modal)
