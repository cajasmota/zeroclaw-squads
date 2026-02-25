# 0000025 - Ticket Dialogue Backend - Comment System API and Slack Thread Mirroring

**Epic**: EPIC-09: Development & Review Loop
**Assigned To**: Backend Agent
**Status**: [x] Completed
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

- [x] Define `TicketComment` Mongoose schema:
  - [x] `storyId` (ObjectId, indexed)
  - [x] `projectId`, `tenantId`
  - [x] `author` (enum: `human | agent`)
  - [x] `authorId` — userId (if human) or agentInstanceId (if agent)
  - [x] `authorDisplayName` (string)
  - [x] `content` (string)
  - [x] `slackThreadTs` (string — Slack thread timestamp for mirroring)
  - [x] `type` (enum: `message | approval | answer`)
  - [x] Timestamps
- [x] Create `TicketDialogueService`:
  - [x] `getComments(storyId, tenantId)` — list all comments for a story (chronological)
  - [x] `postHumanComment(storyId, tenantId, userId, content)`:
    - [x] Creates `TicketComment` with `author: human`
    - [x] Gets story's assigned agent instance
    - [x] Sends SIGUSR1 to agent PID
    - [x] Injects via stdin: `USER_MESSAGE: {content}`
    - [x] Clears `waitingForAnswer = false` if it was set
    - [x] Mirrors comment to Slack thread via `SlackService.postThreadReply()`
    - [x] Broadcasts new comment via WebSocket (`ticket:comment` event on `project:{projectId}` room)
  - [x] `postAgentComment(storyId, content, agentInstanceId)`:
    - [x] Called when agent emits a message targeting a ticket (parsed from stdout)
    - [x] Creates `TicketComment` with `author: agent`
    - [x] Mirrors to Slack thread
    - [x] Broadcasts via WebSocket
  - [x] `approveStory(storyId, tenantId, userId)`:
    - [x] Clears `waitingForApproval = false`
    - [x] Triggers PR merge via `GitHubPRService.mergePullRequest()`
    - [x] Posts approval comment
    - [x] Signals PM agent
  - [x] `answerAgent(storyId, tenantId, userId, answer)`:
    - [x] Posts human comment with `type: answer`
    - [x] Clears `waitingForAnswer = false`
    - [x] Injects answer into agent stdin
  - [x] `setWaitingForAnswer(storyId, agentInstanceId)`:
    - [x] Sets `story.waitingForAnswer = true`
    - [x] Called when agent signals it needs clarification (detected from stdout parsing)
  - [x] `setWaitingForApproval(storyId, agentInstanceId)`:
    - [x] Sets `story.waitingForApproval = true`
- [x] Update `StreamAggregatorService` (from 0000009) to parse agent stdout for special signals:
  - [x] Detect `WAITING_FOR_ANSWER:` prefix → calls `setWaitingForAnswer()`
  - [x] Detect `WAITING_FOR_APPROVAL:` prefix → calls `setWaitingForApproval()`
  - [x] Detect `TICKET_MESSAGE:` prefix → calls `postAgentComment()`
- [x] Create REST endpoints:
  - [x] `GET /projects/:id/stories/:storyId/comments` — list comments
  - [x] `POST /projects/:id/stories/:storyId/comments` — human posts comment
  - [x] `POST /projects/:id/stories/:storyId/approve` — human approves (triggers merge)
  - [x] `POST /projects/:id/stories/:storyId/answer` — human answers agent question
- [x] Ensure `SlackService` (from 0000008) stores Slack `thread_ts` on first message per story:
  - [x] `storySlackThread` field on Story schema: `{ channelId, threadTs }`
  - [x] First message to a story creates the thread; subsequent ones reply in it
- [x] Write unit tests for `TicketDialogueService` (mock ZeroClaw signals and Slack)

---

## Acceptance Criteria

- [x] `POST /projects/:id/stories/:storyId/comments` stores comment and injects into agent stdin
- [x] Human comment appears in the Slack thread for the story within 2 seconds
- [x] Agent message (via `TICKET_MESSAGE:` stdout prefix) creates a comment record and posts to Slack
- [x] `waitingForAnswer = true` is set when agent emits `WAITING_FOR_ANSWER:` on stdout
- [x] `POST .../answer` clears `waitingForAnswer`, injects answer to agent stdin
- [x] `POST .../approve` calls PR merge and clears `waitingForApproval`
- [x] WebSocket broadcasts `ticket:comment` events to connected frontends
- [x] `GET .../comments` returns chronological list of human + agent messages
- [x] Unit tests pass

---

## Dependencies
- **Depends on**: 0000009 (ZeroClaw Process Manager), 0000011 (GitHub Integration), 0000012 (Backlog API), 0000023 (WebSocket Gateway), 0000008 (Slack Setup)
