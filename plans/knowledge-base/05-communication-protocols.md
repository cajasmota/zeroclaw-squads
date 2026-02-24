# AES Knowledge Base — Communication Protocols

## 1. Signal-Based Activation (SIGUSR1 "Poke")

### Purpose
Avoids CPU polling by keeping agents in a "Sleep-on-Idle" state.

### Flow
```
Event received (Slack / GitHub webhook)
      ↓
Backend routes to correct agent by projectId
      ↓
Backend sends SIGUSR1 to agent's PID
      ↓
ZeroClaw wakes up, ingests new input
      ↓
Executes next reasoning step
```

### Implementation Notes
- Backend stores `pid` on AgentInstance in MongoDB
- Must handle process not found (agent may have been killed)
- If agent process is dead, backend re-spawns it first, then signals

## 2. Stdin Injection

### Purpose
Inject real-time messages or PR feedback into the agent's current thought stream.

### Usage
- Backend writes to agent's stdin stream
- Used for: system messages, user-pings, PR review feedback

### Format
```
SYSTEM: <message>
USER_PING: <message>
PR_FEEDBACK: <pr_comment_body>
SPRINT_READY: <sprintId>\nSTORIES: <JSON>\nAVAILABLE_DEVELOPERS: <JSON>
STORY_CONTEXT: <title>\n<description>\n<tasks>
THREAD_CONTEXT: <JSON array of prior messages>
USER_MESSAGE: <incoming slack message text>
TICKET_MESSAGE: <agent-originated comment — parsed from stdout by backend>
WAITING_FOR_ANSWER: <question text — parsed from stdout>
WAITING_FOR_APPROVAL: <reason text — parsed from stdout>
```

## 3. Stdout/Stderr Capture

### Purpose
Capture all agent output for UI broadcasting and archiving.

### Flow
```
ZeroClaw → stdout line emitted
      ↓
Backend log-aggregator receives line
      ↓
Tags with runId + ticketId
      ↓
Broadcasts to WebSocket (UI live view)
      ↓
Archives to MongoDB transcripts collection
```

## 4. Slack Communication

### Routing
- `channel_id` → `projectId` mapping in MongoDB
- Each project has a dedicated `#project-{slug}` Slack channel

### Agent Impersonation (CRITICAL)
Every agent message MUST use Slack's impersonation fields on `chat.postMessage`:
```json
{
  "channel": "C12345",
  "text": "Hello team!",
  "username": "R2-D2 · Developer",
  "icon_url": "https://aes.example.com/avatars/{agentId}?color=%23004176"
}
```
- `username`: agent's `displayName` + role suffix (e.g., "R2-D2 · Developer")
- `icon_url`: dynamically generated avatar URL (transparent PNG overlaid with project `brandColor`)
- This applies to: greetings, task responses, A2A messages, and ticket thread replies
- **Required Slack App scope**: `chat:write.customize`

### Threading
- Agents always reply in threads using `thread_ts`
- Multiple agents can share a thread (shared context)
- Agent impersonation (username + icon_url) is preserved in thread replies

### Multi-Agent Thread Context Sharing
When a second agent (Agent B) is activated for a thread already started by Agent A:
1. Slack webhook fires → backend receives message immediately (event-driven, no polling)
2. Backend looks up the story's `storySlackThread.threadTs` in MongoDB
3. Backend fetches the `TicketComment` history for that story from MongoDB (not from Slack API, to avoid rate limits)
4. Backend sends SIGUSR1 to Agent B's PID
5. Backend injects the thread context via stdin:
   ```
   THREAD_CONTEXT: [{"author": "R2-D2", "text": "..."}, ...]
   USER_MESSAGE: <the new incoming message>
   ```
6. Agent B responds with full context awareness

**Why MongoDB and not Slack API**: Avoids Slack API rate limits and latency. All thread messages are stored as `TicketComment` records in story 0000025, making them immediately available locally.

### A2A (Agent-to-Agent) Messages
- Posted with **sending agent's** impersonation (username + icon_url)
- Message format: `[A2A] 🏗️ Architect → 💻 Developer: {message}`
- Role emojis: `📚 Librarian`, `🏗️ Architect`, `📋 PM`, `💻 Developer`, `🔍 Reviewer`, `🧪 Tester`
- `[A2A]` prefix flags the message to prevent re-processing loops

### Avatar Generation
- Backend generates transient URL by compositing:
  - Agent's base transparent PNG avatar
  - Project `brandColor` as background/tint layer
- Library: `sharp` (image processing) served by NestJS static endpoint
- URL format: `/avatars/{agentInstanceId}?color={hex}`

## 5. GitHub Webhook Events

| Event | Trigger | Action |
|-------|---------|--------|
| `pull_request.opened` | PR created | Signal Reviewer agent via SIGUSR1 |
| PR comment added | Review feedback | Signal Developer via SIGUSR1 + inject via stdin |
| PR label added | Any label | Resume agent workflow via SIGUSR1 |
| Push to main | Merge completed | Trigger Librarian re-index |

## 6. MCP (Model Context Protocol)

- Librarian exposes MCP tools to other agents
- Agents call MCP tools during reasoning loop within ZeroClaw
- Librarian MCP server runs as Docker container on same VPS

## References

- PRD.md §2.1 (Signal-Based Activation)
- PRD.md §4.2 (Slack Identity & A2A)
- PRD.md §8.3 (Signal Injection)
- PRD.md §15.4 (Real-time Event Triggers)
- PRD.md §7.2 (Librarian Communication)
