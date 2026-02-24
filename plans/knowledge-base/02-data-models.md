# AES Knowledge Base — Data Models

> These are suggested schemas from the PRD. Agents performing implementation should refine them as needed.

## Tenant

```json
{
  "_id": "ObjectId",
  "name": "string",
  "slug": "string (unique, URL-safe)",
  "status": "active | suspended"
}
```

The top-level isolation boundary. All data (Projects, AgentInstances, Stories, etc.) belongs to a Tenant via `tenantId`. A **default Tenant** is seeded at first startup from `APP_NAME`.

## User (Authentication)

```json
{
  "_id": "ObjectId",
  "tenantId": "ObjectId (ref Tenant, indexed)",
  "email": "string (compound index: { tenantId, email } unique)",
  "passwordHash": "string (bcrypt min 12 rounds — NEVER returned in API responses)",
  "name": "string",
  "role": "admin | member",
  "status": "active | inactive"
}
```

**Auth**: Simple MongoDB-based. No Firebase, no OAuth, no public registration.
- Login: `POST /auth/login` → returns JWT `{ userId, tenantId, email, role }`
- JWT stored as httpOnly cookie on the frontend
- Users created only by admins via `POST /users` (admin-only)
- Default admin seeded at startup from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars

## Project

```json
{
  "_id": "ObjectId",
  "tenantId": "ObjectId",
  "name": "Project Name",
  "slug": "web-app",
  "brandColor": "#3b82f6",
  "status": "active | archived",
  "roles": {
    "librarian": "AgentInstanceID",
    "architect": "AgentInstanceID",
    "pm": "AgentInstanceID",
    "developer": ["AgentInstanceID"],
    "reviewer": ["AgentInstanceID"],
    "optional": ["AgentInstanceID"]
  },
  "config": {
    "slackToken": "EncryptedString",
    "repoUrl": "https://github.com/org/repo",
    "githubApp": {
      "appId": "String",
      "privateKey": "EncryptedString",
      "installationId": "String",
      "webhookSecret": "EncryptedString"
    },
    "inviteUsers": ["U123"],
    "llmKeys": {
      "openai": "EncryptedString",
      "anthropic": "EncryptedString",
      "google": "EncryptedString",
      "ollama_endpoint": "http://localhost:11434"
    }
  }
}
```

## AgentTemplate

```json
{
  "_id": "ObjectId",
  "tenantId": "ObjectId",
  "displayName": "R2-D2",
  "role": "developer | reviewer | librarian | architect | pm",
  "tags": ["starwars", "rust-expert"],
  "soul": "soul.md (Markdown String)",
  "aieos_identity": { /* AIEOS v1.1 payload */ },
  "config": {
    "model": "qwen2.5-coder:1.5b",
    "provider": "ollama | openai | anthropic | google",
    "skills": "skills.yaml",
    "canWriteCode": true,
    "mcpServers": [{ "name": "github", "config": {} }]
  },
  "avatarUrl": "String"
}
```

## AgentInstance (Snapshot)

```json
{
  "_id": "ObjectId",
  "projectId": "ObjectId",
  "templateId": "ObjectId",
  "displayName": "web-ro-gr-1",
  "identifier": "web-app-dev-1",
  "tags": ["starwars", "droids", "rust-expert"],
  "pid": 12345,
  "soul": "soul.md (Markdown String)",
  "aieos_identity": { /* snapshot at creation time */ },
  "config": {
    "model": "qwen2.5-coder:1.5b",
    "provider": "ollama",
    "skills": "skills.yaml",
    "canWriteCode": true,
    "mcpServers": [{ "name": "github", "config": {} }]
  },
  "status": "idle | busy | error",
  "workspacePath": "/artifacts/{projectId}/workspaces/{agentInstanceId}/"
}
```

## Epic

```json
{
  "_id": "ObjectId",
  "projectId": "ObjectId",
  "tenantId": "ObjectId",
  "title": "String",
  "description": "String",
  "color": "#3b82f6",
  "status": "open | in_progress | done",
  "order": 1
}
```

## Story

```json
{
  "_id": "ObjectId",
  "projectId": "ObjectId",
  "epicId": "ObjectId",
  "sprintId": "ObjectId",
  "tenantId": "ObjectId",
  "title": "String",
  "description": "String",
  "type": "feature | bugfix | refactor | task",
  "priority": "high | medium | low",
  "status": "backlog | selected | in_progress | review | done",
  "workflowNodeStatus": "String",
  "assignedTo": ["AgentInstanceID"],
  "waitingForApproval": false,
  "waitingForAnswer": false,
  "branchName": "feature/{storyId}",
  "runId": "String",
  "order": 1
}
```

## Task (sub-item of Story)

```json
{
  "_id": "ObjectId",
  "storyId": "ObjectId",
  "projectId": "ObjectId",
  "tenantId": "ObjectId",
  "title": "String",
  "description": "String",
  "status": "todo | in_progress | done",
  "assignedTo": "AgentInstanceID",
  "order": 1
}
```

**Hierarchy**: Epic → Stories → Tasks (3-level structure matching Jira-style project management)

## WorkflowTemplate

```json
{
  "_id": "ObjectId",
  "name": "Feature Development",
  "nodes": [
    {
      "id": "node-1",
      "type": "agent_task",
      "agentRole": "developer",
      "requiresHumanApproval": false,
      "description": "Implement feature",
      "kanbanStatus": "in_progress",         // optional — backlog|selected|in_progress|review|done
      "kanbanStatusTrigger": "on_start"      // on_start | on_complete — when to move the Kanban card
    }
  ],
  "edges": []
}
```

## WorkflowRun

```json
{
  "_id": "ObjectId",
  "workflowTemplateId": "ObjectId",
  "projectId": "ObjectId",
  "storyId": "ObjectId",
  "startedAt": "ISODate",
  "completedAt": "ISODate",
  "nodeExecutions": []
}
```

## Transcript

```json
{
  "_id": "ObjectId",
  "agentInstanceId": "ObjectId",
  "projectId": "ObjectId",
  "runId": "String",
  "storyId": "ObjectId",
  "entries": [],
  "archivedAt": "ISODate"
}
```

## References

- PRD.md §3 (Data Models)
- PRD.md §17 (Global Backlog)
- PRD.md §16 (Workflow Templates)
- PRD.md §9 (Analytics & Archiving)
