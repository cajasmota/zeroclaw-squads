# 0000018 - Blueprint Workflow Designer UI (React Flow)

**Epic**: EPIC-11: Workflow Engine
**Assigned To**: Frontend Agent
**Status**: [x] Completed
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

- [x] Install `@xyflow/react` (React Flow v12) in the frontend
- [x] Create `BlueprintsPage` at `/app/projects/[id]/blueprints/page.tsx`:
  - [x] Left sidebar: list of workflow templates
  - [x] "New Workflow" button → creates blank canvas with Start/End nodes
  - [x] Main canvas: React Flow editor
- [x] Build `WorkflowCanvas` component (React Flow):
  - [x] Custom node types:
    - [x] `AgentTaskNode`: shows role icon, description, approval gate indicator, Kanban status badge
    - [x] `StartNode`: entry point (green circle)
    - [x] `EndNode`: completion node (dark circle)
    - [x] `ApprovalGateNode`: visually distinct (orange border)
  - [x] Edges with animated arrows (MarkerType.ArrowClosed)
  - [x] Drag nodes from sidebar palette onto canvas
  - [x] Connect nodes by dragging between handles
  - [x] Node context menu (right-click):
    - [x] "View Execution History" → opens `NodeExecutionHistoryPanel`
    - [x] "Configure" → opens `NodeConfigureDialog` with:
      - [x] Role, description, approval gate toggle
      - [x] **Kanban Status** dropdown (none | Backlog | Selected for Dev | In Progress | Review | Done)
      - [x] **Move card** toggle (When node starts / When node completes)
      - [x] Inline hint text for Kanban Status
    - [x] "Delete node"
  - [x] "Save Workflow" button → `POST /api/workflows/templates`
  - [x] "Trigger" button → `POST /api/projects/:id/workflows`
- [x] Build `NodeExecutionHistoryPanel` (inline drawer):
  - [x] Opens on "View Execution History" context menu item
  - [x] Lists actual executions from API (currently shows empty state)
  - [x] Click entry → opens stdout/stderr log viewer
- [x] Build `WorkflowRunStatusOverlay`:
  - [x] When a run is active, shows live status on nodes (color: pending/active/done/failed)
  - [x] Real-time updates via WebSocket
  - [x] Approval-needed nodes pulse/highlight
- [x] Write component tests for `WorkflowCanvas` node rendering

---

## Acceptance Criteria

- [x] Blueprints tab shows list of workflow templates in left sidebar
- [x] Canvas displays workflow nodes and edges from template data
- [x] Users can drag and connect nodes to create new workflows
- [x] "Save" persists the workflow to the backend
- [x] Right-clicking a node shows context menu with execution history option
- [x] Execution history panel shows historical node runs
- [x] Active workflow run highlights the current node in real time
- [x] Approval-needed nodes are visually distinct (orange)
- [x] Node settings popover exposes Kanban Status dropdown and Move card trigger toggle
- [x] Nodes with a `kanbanStatus` set display a small colored status badge on the node card in the canvas (so designers can see at a glance which nodes drive Kanban movement)
- [x] Component tests pass

---

## Dependencies
- **Depends on**: 0000017 (Workflow Engine API), 0000015 (Project Control Center Layout)
