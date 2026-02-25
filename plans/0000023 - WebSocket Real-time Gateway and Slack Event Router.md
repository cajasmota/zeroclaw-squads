# 0000023 - WebSocket Real-time Gateway and Slack Event Router

**Epic**: EPIC-05: ZeroClaw Runtime Integration
**Assigned To**: Backend Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §4.2 (Slack Identity & A2A), §2.1 (Stdout/Stderr), §18 (Agent-User Interaction)
**Knowledge Base**: `knowledge-base/05-communication-protocols.md`, `knowledge-base/01-architecture.md`

---

## Title
Implement NestJS WebSocket gateway for real-time UI updates and Slack event routing to agents

## Description
Two real-time communication systems:
1. **WebSocket Gateway**: Broadcasts agent stdout/stderr, story status changes, and workflow events to connected frontend clients
2. **Slack Event Router**: Receives Slack messages (via Slack Events API), maps channel to project, routes messages to the correct agent via SIGUSR1 + stdin injection

## Context
Real-time feedback is central to AES. The UI must reflect agent activity as it happens. Slack is the primary human-agent communication channel. The routing logic ensures messages reach the right agent without loops (A2A messages are flagged and not re-processed).

---

## Actionable Tasks

### WebSocket Gateway

- [x] Create NestJS `@WebSocketGateway()` class `AesGateway`:
  - [x] Namespace: `/ws` (or global)
  - [x] JWT authentication for WebSocket connections (verify token on `handleConnection`)
  - [x] Client join rooms: `client.join(\`project:${projectId}\`)`
  - [x] Event types emitted:
    - [x] `agent:log` — tagged stdout/stderr line `{ agentInstanceId, line, type, runId, ticketId, timestamp }`
    - [x] `agent:status` — agent status change `{ agentInstanceId, status }`
    - [x] `story:status` — story kanban status change `{ storyId, status }`
    - [x] `workflow:node` — workflow node execution update `{ runId, nodeId, status }`
    - [x] `approval:needed` — workflow approval required `{ runId, nodeId, description }`
- [x] `StreamAggregatorService` (from 0000009) emits `agent:log` events via AesGateway
- [x] `DevelopmentOrchestrationService` (from 0000014) emits `story:status` events
- [x] `WorkflowNodeExecutorService` (from 0000017) emits `workflow:node` events

### Slack Event Router

- [x] Create `SlackEventsController`:
  - [x] `POST /webhooks/slack` — receives Slack Events API payloads
  - [x] Verify Slack signature (`X-Slack-Signature` header using `SLACK_SIGNING_SECRET`)
  - [x] Handle challenge verification (Slack URL verification)
  - [x] Handle `message` events:
    - [x] Skip bot messages (prevent loops)
    - [x] Skip A2A flagged messages (messages starting with `[A2A]`)
    - [x] Map `channel_id` → `projectId` via `SlackChannelMappingService`
    - [x] Identify which agent the message is directed to (mention or thread context)
    - [x] Send SIGUSR1 to agent PID
    - [x] Inject message via stdin: `USER_MESSAGE: {text}`
  - [x] Handle `app_mention` events:
    - [x] Route to the mentioned agent
- [x] Create `SlackChannelMappingService`:
  - [x] MongoDB collection: `{ channelId, projectId, tenantId }`
  - [x] `getProjectByChannel(channelId)` — lookup
  - [x] Updated when Slack channel is created during project initialization
- [x] When routing human Slack messages to agents, use `SlackService.postThreadReplyAsAgent()` for all agent responses:
  - [x] Always pass agent `displayName` as `username` and generated `icon_url` — impersonation applies to ALL responses including human-reply threads
  - [x] The Slack conversation must look like the actual agent is speaking, not "AES Bot"
- [x] When parsing agent stdout for Slack output (lines starting with `SLACK_MESSAGE:`):
  - [x] Extract message body and post via `postAsAgent()` with the spawned agent's identity
  - [x] Identify the correct `thread_ts` from the story's `storySlackThread` field
- [x] Write unit tests for `SlackEventsController` signature verification

---

## Acceptance Criteria

- [x] Frontend WebSocket clients receive `agent:log` events in real time when an agent emits stdout
- [x] Frontend receives `story:status` events when a story changes kanban status
- [x] `POST /webhooks/slack` verifies Slack signature and rejects invalid requests
- [x] Human message in Slack `#project-{slug}` channel wakes the appropriate agent
- [x] A2A messages (`[A2A] ...`) are not re-processed as user messages
- [x] Bot messages from the AES Slack App are ignored (no loops)
- [x] Agent replies to human messages appear in Slack threads
- [x] Unit tests pass

---

## Dependencies
- **Depends on**: 0000009 (ZeroClaw Process Manager), 0000008 (Slack Setup), 0000011 (GitHub Integration), 0000014 (Dev/Review Loop)
