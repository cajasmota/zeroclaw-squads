# 0000025 - Ticket Dialogue Backend - Comment System API and Slack Thread Mirroring

**Epic**: EPIC-09: Development & Review Loop
**Assigned To**: Backend Agent
**Status**: [ ] Not Started
**PRD Reference**: PRD.md §18 (Agent-User Interaction & Task Dialogue), §18.1 (Dialogue & Visibility), §18.2 (Clarification Logic)
**Knowledge Base**: `knowledge-base/05-communication-protocols.md`, `knowledge-base/02-data-models.md`, `knowledge-base/04-agent-roles.md`

---

## Title
Implement ticket comment/dialogue system: comment API, Slack thread mirroring, and clarification flag management

## Description
PRD §18 specifies that conversations happen on tickets and are **mirrored to Slack threads**. When an agent needs clarification from a human, it sets `waitingForAnswer = true`, pausing execution. When a human responds on the ticket, the reply is injected into the agent's stdin and `waitingForAnswer` is cleared.

This story implements the backend for:
1. **Comment data model** on Stories — stores the human ↔ agent conversation thread
2. **REST API** for posting and fetching comments
3. **Slack thread mirroring** — human comments on a ticket post to the story's Slack thread
4. **Clarification logic** — `waitingForAnswer` and `waitingForApproval` flag management
5. **Human reply injection** — when human answers, inject into agent stdin + clear flag

## Context
The ticket Discussion tab (UI in story 0000016) needs this backend to function. When agents write responses during their reasoning loop, those are already streamed via stdout → WebSocket. Human messages need to flow the other way: UI → API → agent stdin + Slack thread.

---

## Actionable Tasks

- [ ] Define `TicketComment` Mongoose schema:
  - [ ] `storyId` (ObjectId, indexed)
  - [ ] `projectId`, `tenantId`
  - [ ] `author` (enum: `human | agent`)
  - [ ] `authorId` — userId (if human) or agentInstanceId (if agent)
  - [ ] `authorDisplayName` (string)
  - [ ] `content` (string)
  - [ ] `slackThreadTs` (string — Slack thread timestamp for mirroring)
  - [ ] `type` (enum: `message | approval | answer`)
  - [ ] Timestamps
- [ ] Create `TicketDialogueService`:
  - [ ] `getComments(storyId, tenantId)` — list all comments for a story (chronological)
  - [ ] `postHumanComment(storyId, tenantId, userId, content)`:
    - [ ] Creates `TicketComment` with `author: human`
    - [ ] Gets story's assigned agent instance
    - [ ] Sends SIGUSR1 to agent PID
    - [ ] Injects via stdin: `USER_MESSAGE: {content}`
    - [ ] Clears `waitingForAnswer = false` if it was set
    - [ ] Mirrors comment to Slack thread via `SlackService.postThreadReply()`
    - [ ] Broadcasts new comment via WebSocket (`ticket:comment` event on `project:{projectId}` room)
  - [ ] `postAgentComment(storyId, content, agentInstanceId)`:
    - [ ] Called when agent emits a message targeting a ticket (parsed from stdout)
    - [ ] Creates `TicketComment` with `author: agent`
    - [ ] Mirrors to Slack thread
    - [ ] Broadcasts via WebSocket
  - [ ] `approveStory(storyId, tenantId, userId)`:
    - [ ] Clears `waitingForApproval = false`
    - [ ] Triggers PR merge via `GitHubPRService.mergePullRequest()`
    - [ ] Posts approval comment
    - [ ] Signals PM agent
  - [ ] `answerAgent(storyId, tenantId, userId, answer)`:
    - [ ] Posts human comment with `type: answer`
    - [ ] Clears `waitingForAnswer = false`
    - [ ] Injects answer into agent stdin
  - [ ] `setWaitingForAnswer(storyId, agentInstanceId)`:
    - [ ] Sets `story.waitingForAnswer = true`
    - [ ] Called when agent signals it needs clarification (detected from stdout parsing)
  - [ ] `setWaitingForApproval(storyId, agentInstanceId)`:
    - [ ] Sets `story.waitingForApproval = true`
- [ ] Update `StreamAggregatorService` (from 0000009) to parse agent stdout for special signals:
  - [ ] Detect `WAITING_FOR_ANSWER:` prefix → calls `setWaitingForAnswer()`
  - [ ] Detect `WAITING_FOR_APPROVAL:` prefix → calls `setWaitingForApproval()`
  - [ ] Detect `TICKET_MESSAGE:` prefix → calls `postAgentComment()`
- [ ] Create REST endpoints:
  - [ ] `GET /projects/:id/stories/:storyId/comments` — list comments
  - [ ] `POST /projects/:id/stories/:storyId/comments` — human posts comment
  - [ ] `POST /projects/:id/stories/:storyId/approve` — human approves (triggers merge)
  - [ ] `POST /projects/:id/stories/:storyId/answer` — human answers agent question
- [ ] Ensure `SlackService` (from 0000008) stores Slack `thread_ts` on first message per story:
  - [ ] `storySlackThread` field on Story schema: `{ channelId, threadTs }`
  - [ ] First message to a story creates the thread; subsequent ones reply in it
- [ ] Write unit tests for `TicketDialogueService` (mock ZeroClaw signals and Slack)

---

## Acceptance Criteria

- [ ] `POST /projects/:id/stories/:storyId/comments` stores comment and injects into agent stdin
- [ ] Human comment appears in the Slack thread for the story within 2 seconds
- [ ] Agent message (via `TICKET_MESSAGE:` stdout prefix) creates a comment record and posts to Slack
- [ ] `waitingForAnswer = true` is set when agent emits `WAITING_FOR_ANSWER:` on stdout
- [ ] `POST .../answer` clears `waitingForAnswer`, injects answer to agent stdin
- [ ] `POST .../approve` calls PR merge and clears `waitingForApproval`
- [ ] WebSocket broadcasts `ticket:comment` events to connected frontends
- [ ] `GET .../comments` returns chronological list of human + agent messages
- [ ] Unit tests pass

---

## Dependencies
- **Depends on**: 0000009 (ZeroClaw Process Manager), 0000011 (GitHub Integration), 0000012 (Backlog API), 0000023 (WebSocket Gateway), 0000008 (Slack Setup)
