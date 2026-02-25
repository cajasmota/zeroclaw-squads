# 0000008 - Project Initialization Sequence and Slack Automation

**Epic**: EPIC-04: Project Management
**Assigned To**: Backend Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §4 (Project Initialization & Slack Automation), §4.1, §4.2
**Knowledge Base**: `knowledge-base/05-communication-protocols.md`, `knowledge-base/04-agent-roles.md`, `knowledge-base/07-git-strategy.md`

---

## Title
Implement the automated project initialization sequence (directory, Slack channel, agent activation, greetings)

## Description
After a project is created, execute a multi-step initialization sequence:
1. Create the `/artifacts/{projectId}` workspace directory structure
2. Create a Slack channel `#project-{slug}`
3. Invite users to the Slack channel
4. Spawn all assigned agents (mandatory + optional) via ZeroClaw
5. Send `INITIALIZE_GREETING` event to trigger agent self-introductions in Slack

Note: Knowledge Ingestion (Librarian) is NOT part of this automated sequence — it is triggered manually.

## Context
The initialization sequence is triggered by the `project.created` event emitted from `ProjectsService`. It transforms a database record into a live, operating project with active agents. Slack setup requires a pre-configured Slack App (bot token).

---

## Actionable Tasks

- [x] Create `ProjectInitializerService` (or use NestJS event listeners)
- [x] **Step 1 — Directory Setup**:
  - [ ] Create `/artifacts/{projectId}/` directory
  - [ ] Create `/artifacts/{projectId}/librarian/` subdirectory
  - [ ] Create `/artifacts/{projectId}/workspaces/` subdirectory
  - [ ] For each AgentInstance: create `/artifacts/{projectId}/workspaces/{agentInstanceId}/`
- [x] **Step 2 — Slack Channel Setup**:
  - [ ] Install Slack Web API SDK: `@slack/web-api`
  - [ ] Create `SlackService`:
    - [ ] `createChannel(token, slug)` — creates `#project-{slug}`
    - [ ] `inviteUsers(token, channelId, userIds)` — invites from `inviteUsers` list
    - [ ] `postAsAgent(token, channelId, message, agent: AgentInstance, brandColor)`:
      - [ ] Uses Slack `chat.postMessage` with **user impersonation fields**:
        - [ ] `username`: set to `agent.displayName` (e.g., "R2-D2 · Developer")
        - [ ] `icon_url`: set to `AvatarGeneratorService.generateAvatarUrl(agent, brandColor)`
      - [ ] This makes ALL agent messages appear with the agent's name and colored avatar, not the generic bot name
      - [ ] Works for: greetings, task responses, A2A messages, and ticket replies
    - [ ] `postThreadReplyAsAgent(token, channelId, threadTs, message, agent, brandColor)` — thread reply with full agent impersonation
    - [ ] `postA2AMessage(token, channelId, fromAgent, toAgent, message, brandColor)`:
      - [ ] Posts with `fromAgent` impersonation (username + icon_url)
      - [ ] Message prefixed: `[A2A] {fromAgent.roleEmoji} {fromAgent.displayName} → {toAgent.roleEmoji} {toAgent.displayName}: {message}`
      - [ ] Uses `fromAgent` display name and avatar (natural conversation appearance)
  - [ ] Store `slackChannelId` on Project document after creation
  - [ ] Fall back to global settings if project `inviteUsers` is empty
- [x] **Step 3 — Agent Spawn Delegation**:
  - [ ] Emit `agents.spawn.all` event with `projectId` (actual spawning handled in ZeroClaw story)
  - [ ] For now: update all AgentInstance `status` to `idle` (placeholder until ZeroClaw is implemented)
- [x] **Step 4 — Greetings**:
  - [ ] For each AgentInstance, post introduction message to Slack channel using `postAsAgent()`
  - [ ] Each agent posts its own greeting with its own name and avatar — looks like a natural team intro
  - [ ] Create `AvatarGeneratorService`:
    - [ ] `generateAvatarUrl(agent: AgentInstance, brandColor: string): string`
    - [ ] Generates a transient URL for a PNG with the agent's base transparent avatar overlaid with `brandColor`
    - [ ] Uses `sharp` or `canvas` for image compositing
    - [ ] URL is publicly accessible (served by NestJS static file endpoint or CDN)
- [x] Create `AgentRoleEmojiService`:
  - [ ] Maps role to emoji: `{ librarian: '📚', architect: '🏗️', pm: '📋', developer: '💻', reviewer: '🔍', tester: '🧪' }`
  - [ ] Used in A2A message prefixes and display names
- [x] Create `SlackEventRouterService`:
  - [ ] Maps `channel_id` → `projectId` (stored in MongoDB or in-memory cache)
  - [ ] Routes incoming Slack events to the correct project/agent
- [x] Write `SlackService` unit tests (mock Slack API)
- [x] Write `ProjectInitializerService` integration test

---

## Acceptance Criteria

- [x] After project creation, `/artifacts/{projectId}/workspaces/` exists with a subdirectory per agent instance
- [x] A `#project-{slug}` Slack channel is created via the Slack API
- [x] Users from `inviteUsers` list are invited to the channel
- [x] All agent instances post an introduction message with their own name and colored avatar (not the generic bot name)
- [x] Each agent message in Slack shows the agent's `displayName` as `username` and colored avatar as `icon_url`
- [x] A2A messages show the sending agent's name/avatar and use the `[A2A] emoji→emoji:` prefix format
- [x] Thread replies use `postThreadReplyAsAgent()` — agent identity is preserved in threads
- [x] `channel_id` to `projectId` mapping is stored for event routing
- [x] Unit tests for `SlackService` pass (verify `username` and `icon_url` are set on all calls)
- [x] Initialization is idempotent (can be re-run without duplicating channels/directories)

---

## Dependencies
- **Depends on**: 0000005 (Project API), 0000006 (Agent Instance Snapshot)

## Notes
- A Slack App configuration guide must be documented (see story 0000022)
- Initialization is asynchronous; frontend should poll project status
- **Agent Impersonation**: Slack's `chat.postMessage` supports `username` and `icon_url` to override the bot display name/avatar. This MUST be used on every agent message so the conversation looks natural (not "AES Bot said...")
- The Slack App must have `chat:write.customize` scope enabled to allow username/icon_url overrides
