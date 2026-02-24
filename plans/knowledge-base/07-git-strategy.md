# AES Knowledge Base — Git Strategy & Workspace Management

## Per-Agent Workspace Architecture

```
/artifacts/
  {projectId}/
    librarian/              ← Shared knowledge index (Librarian only)
    workspaces/
      {agentInstanceId}/    ← Dedicated workspace per agent
        .git/               ← Independent git clone
        .aes/
          standards.md      ← Synthesized by Librarian
        session.jsonl       ← Agent short-term memory
        transcript.jsonl    ← Action log
        src/                ← Project source code
```

## Key Principles

1. **Dedicated Clones**: Each agent performs its own `git clone` at activation
2. **Feature Branches**: All development work happens on `feature/{storyId}` branches
3. **Atomic Commits**: Frequent, small, structured commits per agent
4. **No Shared Workspace**: Agents never share a workspace directory
5. **Lock Management**: Backend manages `git.lock` within each agent directory

## Hybrid Git Tooling

| Tool | Usage |
|------|-------|
| **GitHub MCP (API Tool)** | Remote API actions: PRs, Comments, Issues, Labels |
| **Local Git CLI (System Tool)** | Local operations: Clone, Pull, Commit, Branch, Push |

## GitHub App Configuration

Required for each project:
- `appId`
- `privateKey` (encrypted in MongoDB)
- `installationId`
- `webhookSecret` (encrypted in MongoDB)

> Note: A GitHub App configuration guide must be provided to users for Private Key and Webhook setup.

## Workflow

```
1. PM assigns story to Developer
2. Backend signals Developer via SIGUSR1
3. Developer creates feature/{storyId} branch in own workspace
4. Developer implements, commits atomically
5. Developer pushes and opens PR via GitHub MCP
6. GitHub webhook: pull_request.opened → Backend signals Reviewer
7. Reviewer calls Librarian.check_convention_compliance
8. Reviewer posts feedback as PR comment
9. GitHub webhook: PR comment → Backend signals Developer via SIGUSR1 + stdin inject
10. Developer addresses feedback, updates PR
11. PR approved → PM/User triggers merge
12. Push to main → Backend triggers Librarian re-index
```

## Session Recovery

If an agent process is killed (VPS RAM optimization):
- Next spawn uses the same `--session <path>` flag
- ZeroClaw reads `session.jsonl` to restore short-term memory instantly
- Agent continues as if uninterrupted

## GitHub Webhooks Required

| Webhook Event | Purpose |
|--------------|---------|
| `pull_request` | Trigger Reviewer activation |
| `issue_comment` | Detect PR comments for signal injection |
| `pull_request_review` | Monitor review state |
| `push` (main branch) | Trigger Librarian re-index |

## References

- PRD.md §6 (Workspace & Git Strategy)
- PRD.md §8 (Development & Review Loop)
- PRD.md §15 (Git Repository Integration)
- PRD.md §2.1 (Session Persistence)
