# 0000020 - Analytics, Usage Monitoring, and Transcript Archiving

**Epic**: EPIC-12: Analytics & Archiving
**Assigned To**: Backend Agent, Frontend Agent
**Status**: [ ] Not Started
**PRD Reference**: PRD.md §9 (Analytics & Execution Archiving)
**Knowledge Base**: `knowledge-base/02-data-models.md`, `knowledge-base/03-technology-stack.md`, `knowledge-base/09-zeroclaw-integration.md`

---

## Title
Implement usage monitoring with Chokidar, runtime-trace archiving, and analytics charts

## Description
Implement the analytics pipeline:
1. **Usage monitoring**: `chokidar` watches ZeroClaw `state/costs.jsonl` files for LLM token/cost data
2. **Runtime-trace archiving**: Archive agent `state/runtime-trace.jsonl` entries to MongoDB after execution; clear from local disk
3. **Analytics UI**: Burn rate chart (cost over time) and distribution pie chart (by agent role)

## Context
Analytics enable users to monitor LLM spending and agent activity patterns. ZeroClaw writes cost data to `state/costs.jsonl` and diagnostic traces to `state/runtime-trace.jsonl` — these are the **actual file names** from ZeroClaw source code (`src/cost/tracker.rs` and `src/observability/runtime_trace.rs`). The PRD references `usage.json` and `transcript.jsonl` — these names do not exist; use the actual ZeroClaw file names below.

### Actual ZeroClaw output files (per agent workspace)
```
{workspacePath}/
├── state/
│   ├── costs.jsonl          ← LLM cost records (one JSON object per line)
│   └── runtime-trace.jsonl  ← Tool calls, model replies, diagnostic events
├── memory/
│   └── brain.db             ← SQLite hybrid vector memory (do NOT archive or delete)
```

### `state/costs.jsonl` record format (from ZeroClaw `src/cost/tracker.rs`)
```json
{
  "session_id": "string",
  "usage": {
    "model": "qwen2.5-coder:1.5b",
    "cost_usd": 0.0012,
    "total_tokens": 1450,
    "timestamp": "2026-02-24T10:00:00Z"
  }
}
```

### `state/runtime-trace.jsonl` record format (from `src/observability/runtime_trace.rs`)
```json
{
  "id": "uuid",
  "timestamp": "RFC3339",
  "event_type": "tool_call | llm_response | system",
  "channel": "optional",
  "provider": "optional",
  "model": "optional",
  "turn_id": "optional",
  "success": true,
  "message": "optional",
  "payload": {}
}
```

---

## Actionable Tasks

### Backend

- [ ] Create `AnalyticsModule` in NestJS
- [ ] Create `UsageMonitorService`:
  - [ ] Uses `chokidar` to watch `/artifacts/**/state/costs.jsonl` (glob pattern)
  - [ ] On file change: reads all new lines since last read position (use file offset tracking)
  - [ ] Parses each JSONL line and extracts: `session_id`, `usage.model`, `usage.cost_usd`, `usage.total_tokens`, `usage.timestamp`
  - [ ] Correlates `session_id` to `AgentInstance` via a lookup in MongoDB (store `session_id` on AgentInstance at spawn time — see story 0000009)
  - [ ] Ingests usage data into MongoDB `usage_events` collection:
    - [ ] `{ agentInstanceId, projectId, tenantId, model, totalTokens, costUsd, timestamp }`
  - [ ] Calculates running cost totals per project
- [ ] Create `RuntimeTraceArchiveService`:
  - [ ] `archiveTrace(agentInstanceId, runId)`:
    - [ ] Reads `{workspacePath}/state/runtime-trace.jsonl`
    - [ ] Parses all entries and stores in MongoDB `transcripts` collection:
      - [ ] `{ agentInstanceId, projectId, runId, tenantId, entries: [...], archivedAt }`
    - [ ] Clears (truncates) the local `runtime-trace.jsonl` after successful archiving
  - [ ] Triggered at end of each agent task run (listen to `story.done` or `workflow.node.completed`)
- [ ] Create REST endpoints for analytics:
  - [ ] `GET /projects/:id/analytics/burn-rate` — daily cost aggregation from `usage_events`
  - [ ] `GET /projects/:id/analytics/distribution` — cost/usage grouped by agent role
  - [ ] `GET /projects/:id/analytics/transcripts` — paginated list of archived runs
  - [ ] `GET /projects/:id/analytics/transcripts/:runId` — full runtime-trace for a run

### Frontend

- [ ] Install `recharts`
- [ ] Create `AnalyticsSection` component (in Dashboard tab, story 0000015):
  - [ ] **Burn Rate Chart** (Recharts `LineChart` or `AreaChart`):
    - [ ] X-axis: dates, Y-axis: USD cost
    - [ ] One line per project or aggregated total
  - [ ] **Distribution Pie Chart** (Recharts `PieChart`):
    - [ ] Segments by agent role (Librarian, Architect, PM, Developer, Reviewer, Tester)
    - [ ] Tooltip shows role name + total cost
  - [ ] Total cost badge and token count summary
- [ ] Create `TranscriptViewer` component:
  - [ ] Accessible from Ticket Modal (Live Activity Logs tab, story 0000016)
  - [ ] Shows historical runtime-trace entries for a given runId
  - [ ] Entry types styled: `llm_response` (blue), `tool_call` (yellow), `system` (gray)

---

## Acceptance Criteria

- [ ] When ZeroClaw appends to `state/costs.jsonl`, Chokidar detects it within 1 second
- [ ] Usage data is persisted to MongoDB with correct fields mapped from `costs.jsonl` format
- [ ] After a run completes, `state/runtime-trace.jsonl` is archived to MongoDB and truncated on disk
- [ ] `GET /projects/:id/analytics/burn-rate` returns daily cost aggregation
- [ ] `GET /projects/:id/analytics/distribution` returns cost per agent role
- [ ] Burn rate line chart renders correctly in UI
- [ ] Distribution pie chart shows segments per role with correct labels
- [ ] Historical runtime-traces are viewable in the TranscriptViewer with color-coded event types

---

## Dependencies
- **Depends on**: 0000009 (ZeroClaw Process Manager — provides session_id at spawn time), 0000015 (Project Control Center Layout)

## Notes
- `memory/brain.db` (SQLite) must NEVER be archived or deleted — it is ZeroClaw's live memory
- The PRD mentions `usage.json` and `transcript.jsonl` — these file names do not exist in ZeroClaw. Use `state/costs.jsonl` and `state/runtime-trace.jsonl` respectively.
- ZeroClaw's `[observability]` config.toml section controls `runtime_trace_mode` (`none`, `rolling`, `full`) and `runtime_trace_path` — set these in `ZeroClawConfigTomlGenerator` (story 0000010)
