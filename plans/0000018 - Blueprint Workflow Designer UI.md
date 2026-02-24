# 0000018 - Blueprint Workflow Designer UI (React Flow)

**Epic**: EPIC-11: Workflow Engine
**Assigned To**: Frontend Agent
**Status**: [ ] Not Started
**PRD Reference**: PRD.md §5.2 (Project Control Center — Blueprints)
**Knowledge Base**: `knowledge-base/08-ui-design-system.md`

---

## Title
Build Blueprint Workflow Designer using React Flow with node context menus and execution history

## Description
Implement the Blueprints tab in the Project Control Center. This is a visual drag-and-drop workflow designer built with React Flow. Users can create, edit, and manage workflow templates visually. Each node provides a context menu to view its execution history.

## Context
The Blueprint Designer is the visual representation of the Workflow Engine. It makes workflow creation intuitive by allowing users to drag agent role nodes and connect them with edges representing execution order. Approval gate nodes are visually distinct.

---

## Actionable Tasks

- [ ] Install `reactflow` (React Flow v12+) in the frontend
- [ ] Create `BlueprintsView` component at `/app/projects/[id]/blueprints/`:
  - [ ] Left sidebar: list of workflow templates (global + project-specific)
  - [ ] "New Workflow" button → creates blank canvas
  - [ ] Main canvas: React Flow editor
- [ ] Build `WorkflowCanvas` component (React Flow):
  - [ ] Custom node types:
    - [ ] `AgentTaskNode`: shows role icon, description, approval gate toggle, and Kanban status badge (if `kanbanStatus` is set)
    - [ ] `StartNode`: entry point
    - [ ] `EndNode`: completion node — typically configured with `kanbanStatus = done`
    - [ ] `ApprovalGateNode`: visually distinct (orange border) when `requiresHumanApproval = true`
  - [ ] Edges with animated arrows
  - [ ] Drag nodes from a sidebar palette onto canvas
  - [ ] Connect nodes by dragging between handles
  - [ ] Node context menu (right-click or "..." button):
    - [ ] "View Execution History" → opens `NodeExecutionHistoryPanel`
    - [ ] "Configure" → opens node settings popover with:
      - Role, description, approval gate toggle (existing fields)
      - **Kanban Status** dropdown (optional): `— none — | Backlog | Selected for Dev | In Progress | Review | Done`
      - **Move card** toggle (shown only when Kanban Status is set): `When node starts | When node completes`
      - Small inline hint: "When set, the project Kanban card for this story moves to the selected column at the specified moment"
    - [ ] "Delete node"
  - [ ] "Save Workflow" button → `POST /workflows/templates` or `PATCH` if existing
  - [ ] "Trigger" button → `POST /projects/:id/workflows/trigger`
- [ ] Build `NodeExecutionHistoryPanel` (Shadcn Sheet/Drawer):
  - [ ] Lists all executions of this node across all workflow runs
  - [ ] Each entry: date, agent used, duration, status, link to run
  - [ ] Click entry → opens stdout/stderr log viewer
- [ ] Build `WorkflowRunStatusOverlay`:
  - [ ] When a run is active, shows live status on nodes (color: pending/active/done/failed)
  - [ ] Real-time updates via WebSocket
  - [ ] Approval-needed nodes pulse/highlight
- [ ] Write component tests for `WorkflowCanvas` node rendering

---

## Acceptance Criteria

- [ ] Blueprints tab shows list of workflow templates in left sidebar
- [ ] Canvas displays workflow nodes and edges from template data
- [ ] Users can drag and connect nodes to create new workflows
- [ ] "Save" persists the workflow to the backend
- [ ] Right-clicking a node shows context menu with execution history option
- [ ] Execution history panel shows historical node runs
- [ ] Active workflow run highlights the current node in real time
- [ ] Approval-needed nodes are visually distinct (orange)
- [ ] Node settings popover exposes Kanban Status dropdown and Move card trigger toggle
- [ ] Nodes with a `kanbanStatus` set display a small colored status badge on the node card in the canvas (so designers can see at a glance which nodes drive Kanban movement)
- [ ] Component tests pass

---

## Dependencies
- **Depends on**: 0000017 (Workflow Engine API), 0000015 (Project Control Center Layout)
