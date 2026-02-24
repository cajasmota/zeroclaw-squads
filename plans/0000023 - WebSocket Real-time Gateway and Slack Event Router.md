# 0000023 - WebSocket Real-time Gateway and Slack Event Router

**Epic**: EPIC-05: ZeroClaw Runtime Integration
**Assigned To**: Backend Agent
**Status**: [ ] Not Started
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

- [ ] Create NestJS `@WebSocketGateway()` class `AesGateway`:
  - [ ] Namespace: `/ws` (or global)
  - [ ] JWT authentication for WebSocket connections (verify token on `handleConnection`)
  - [ ] Client join rooms: `client.join(\`project:${projectId}\`)`
  - [ ] Event types emitted:
    - [ ] `agent:log` — tagged stdout/stderr line `{ agentInstanceId, line, type, runId, ticketId, timestamp }`
    - [ ] `agent:status` — agent status change `{ agentInstanceId, status }`
    - [ ] `story:status` — story kanban status change `{ storyId, status }`
    - [ ] `workflow:node` — workflow node execution update `{ runId, nodeId, status }`
    - [ ] `approval:needed` — workflow approval required `{ runId, nodeId, description }`
- [ ] `StreamAggregatorService` (from 0000009) emits `agent:log` events via AesGateway
- [ ] `DevelopmentOrchestrationService` (from 0000014) emits `story:status` events
- [ ] `WorkflowNodeExecutorService` (from 0000017) emits `workflow:node` events

### Slack Event Router

- [ ] Create `SlackEventsController`:
  - [ ] `POST /webhooks/slack` — receives Slack Events API payloads
  - [ ] Verify Slack signature (`X-Slack-Signature` header using `SLACK_SIGNING_SECRET`)
  - [ ] Handle challenge verification (Slack URL verification)
  - [ ] Handle `message` events:
    - [ ] Skip bot messages (prevent loops)
    - [ ] Skip A2A flagged messages (messages starting with `[A2A]`)
    - [ ] Map `channel_id` → `projectId` via `SlackChannelMappingService`
    - [ ] Identify which agent the message is directed to (mention or thread context)
    - [ ] Send SIGUSR1 to agent PID
    - [ ] Inject message via stdin: `USER_MESSAGE: {text}`
  - [ ] Handle `app_mention` events:
    - [ ] Route to the mentioned agent
- [ ] Create `SlackChannelMappingService`:
  - [ ] MongoDB collection: `{ channelId, projectId, tenantId }`
  - [ ] `getProjectByChannel(channelId)` — lookup
  - [ ] Updated when Slack channel is created during project initialization
- [ ] When routing human Slack messages to agents, use `SlackService.postThreadReplyAsAgent()` for all agent responses:
  - [ ] Always pass agent `displayName` as `username` and generated `icon_url` — impersonation applies to ALL responses including human-reply threads
  - [ ] The Slack conversation must look like the actual agent is speaking, not "AES Bot"
- [ ] When parsing agent stdout for Slack output (lines starting with `SLACK_MESSAGE:`):
  - [ ] Extract message body and post via `postAsAgent()` with the spawned agent's identity
  - [ ] Identify the correct `thread_ts` from the story's `storySlackThread` field
- [ ] Write unit tests for `SlackEventsController` signature verification

---

## Acceptance Criteria

- [ ] Frontend WebSocket clients receive `agent:log` events in real time when an agent emits stdout
- [ ] Frontend receives `story:status` events when a story changes kanban status
- [ ] `POST /webhooks/slack` verifies Slack signature and rejects invalid requests
- [ ] Human message in Slack `#project-{slug}` channel wakes the appropriate agent
- [ ] A2A messages (`[A2A] ...`) are not re-processed as user messages
- [ ] Bot messages from the AES Slack App are ignored (no loops)
- [ ] Agent replies to human messages appear in Slack threads
- [ ] Unit tests pass

---

## Dependencies
- **Depends on**: 0000009 (ZeroClaw Process Manager), 0000008 (Slack Setup), 0000011 (GitHub Integration), 0000014 (Dev/Review Loop)
