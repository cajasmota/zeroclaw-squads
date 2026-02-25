# 0000014 - Development and Review Agent Loop

**Epic**: EPIC-09: Development & Review Loop
**Assigned To**: Backend Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §8 (Development & Review Loop)
**Knowledge Base**: `knowledge-base/05-communication-protocols.md`, `knowledge-base/07-git-strategy.md`, `knowledge-base/04-agent-roles.md`, `knowledge-base/09-zeroclaw-integration.md`

---

## Title
Implement the full developer-reviewer agent feedback loop: story assignment through PR merge

## Description
Orchestrate the complete development workflow:
1. Sprint marked as "Ready" → PM agent assigns stories to Developer agents
2. Developer agent gets story context, creates branch, implements, opens PR
3. GitHub webhook detects PR → signals Reviewer agent
4. Reviewer calls Librarian compliance check, posts feedback
5. GitHub webhook detects PR comment → signals Developer with injected feedback
6. Developer addresses feedback, updates PR
7. PR approved → PM/user triggers merge
8. Merge → Librarian re-index

## Context
This is the core operational loop that makes AES self-sustaining. The NestJS backend acts as the orchestrator, routing events between GitHub, Slack, and agent processes via SIGUSR1 and stdin injection.

---

## Actionable Tasks

- [x] Create `DevelopmentOrchestrationService`:
  - [x] Listen to `sprint.ready` event (PM agent-mediated — do NOT assign directly):
    - [x] Fetch all "selected" stories in the sprint
    - [x] Fetch all available Developer agents for the project
    - [x] Find the PM agent instance for the project
    - [x] Send SIGUSR1 to PM agent PID
    - [x] Inject via stdin: `SPRINT_READY: {sprintId}\nSTORIES: {JSON story list}\nAVAILABLE_DEVELOPERS: {JSON agent list}`
    - [x] The PM agent reasons over the sprint and calls `POST /projects/:id/stories/:storyId/assign` for each story
  - [x] Create `POST /projects/:id/stories/:storyId/assign` endpoint (called by PM agent via tool):
    - [x] Body: `{ agentInstanceId: string }`
    - [x] Updates story `assignedTo`, `branchName = feature/{storyId}`
    - [x] Calls `StoriesService.updateStatus(storyId, projectId, tenantId, 'in_progress')` — emits `story:status` WebSocket event so Kanban card auto-moves to In Progress column
    - [x] Emits `story.assigned` event
    - [x] Decorated `@Public()` is NOT correct — this endpoint is JWT-protected; the PM agent uses its project credentials
  - [x] Listen to `story.assigned` event:
    - [x] Find the assigned Developer agent instance
    - [x] Send SIGUSR1 to Developer agent PID
    - [x] Inject via stdin: story context (title, description, tasks, acceptance criteria)
    - [x] Post assignment notification to Slack via `SlackService`
- [x] Update `GitHubWebhookController` (from story 0000011):
  - [x] `pull_request.opened`:
    - [x] Match PR branch to `storyId` via `branchName`
    - [x] Find available Reviewer agents for the project
    - [x] Send SIGUSR1 to Reviewer agent PID
    - [x] Inject via stdin: PR URL, PR diff summary, story context
    - [x] Call `StoriesService.updateStatus(storyId, projectId, tenantId, 'review')` — this updates MongoDB AND emits the `story:status` WebSocket event so the Kanban card auto-moves to the Review column
  - [x] `pull_request_review.submitted` or `issue_comment.created`:
    - [x] Extract PR comment body
    - [x] Find Developer agent assigned to the story
    - [x] Send SIGUSR1 to Developer agent PID
    - [x] Inject via stdin: `PR_FEEDBACK: {comment_body}`
  - [x] `pull_request.closed` (merged):
    - [x] Call `StoriesService.updateStatus(storyId, projectId, tenantId, 'done')` — emits `story:status` WebSocket event so Kanban card auto-moves to Done
    - [x] Emit `librarian.reindex`
- [x] Create `StoryContextSerializer`:
  - [x] `serialize(story: Story): string` — converts story data to LLM-friendly context string
  - [x] Includes: title, description, type, tasks list, acceptance criteria
  - [x] Injected via stdin when signaling an agent
- [x] Create `AgentAvailabilityService`:
  - [x] `getAvailableAgent(projectId, role): AgentInstance | null`
  - [x] Returns first agent with `status = idle` for the given role
  - [x] Sets agent `status = busy` atomically (to prevent double-assignment)
- [x] Add `canWriteCode` guard in `AgentAvailabilityService`:
  - [x] `getAvailableAgent()` must only return agents where `config.canWriteCode === true` for Developer role
  - [x] Log a warning and skip `canWriteCode: false` agents when assigning code work
- [x] Add Reviewer → Librarian MCP configuration note:
  - [x] The Reviewer agent's `zeroclaw.config.toml` must include the Librarian MCP endpoint in `[mcp_servers]`
  - [x] This is configured by `ZeroClawConfigTomlGenerator` in story 0000010 — ensure Reviewer role agents get Librarian MCP registered
  - [x] The `check_convention_compliance` tool from the Librarian MCP must be available in the Reviewer's tool set
- [x] Note: `POST /projects/:id/stories/:storyId/approve` is implemented in story 0000025 (Ticket Dialogue Backend)
- [x] Write integration tests for orchestration flow (mock ZeroClaw signals)

---

## Acceptance Criteria

- [x] Marking sprint as "Ready" triggers story assignment to idle Developer agents
- [x] Developer agent receives story context via stdin injection
- [x] Opening a PR triggers Reviewer agent with SIGUSR1 + PR context
- [x] PR comment triggers Developer agent with PR_FEEDBACK stdin injection
- [x] Story status transitions correctly through: backlog → selected → in_progress → review → done
- [x] Each status transition emits a `story:status` WebSocket event (via `StoriesService.updateStatus()`) so Kanban cards auto-move without page refresh
- [x] **IMPORTANT**: All status updates in this service MUST use `StoriesService.updateStatus()` — never update `story.status` directly in MongoDB from this service
- [x] Agent status transitions correctly: idle ↔ busy
- [x] Merge trigger updates story to done and emits librarian reindex
- [x] Integration tests pass

---

## Dependencies
- **Depends on**: 0000009 (ZeroClaw Process Manager), 0000011 (GitHub Integration), 0000012 (Backlog API), 0000013 (Librarian MCP), 0000025 (Ticket Dialogue — for /approve endpoint)
