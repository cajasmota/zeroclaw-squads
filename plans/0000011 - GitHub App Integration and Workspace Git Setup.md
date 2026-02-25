# 0000011 - GitHub App Integration and Workspace Git Setup

**Epic**: EPIC-06: Workspace & Git Integration
**Assigned To**: Backend Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §6 (Workspace & Git Strategy), §15 (Git Repository Integration)
**Knowledge Base**: `knowledge-base/07-git-strategy.md`, `knowledge-base/04-agent-roles.md`

---

## Title
Implement GitHub App authentication, per-agent git clone, and feature branch management

## Description
Each agent gets its own git workspace with a dedicated clone of the project repository. This story implements:
- GitHub App authentication (using the project's GitHub App credentials)
- Per-agent workspace git clone on agent activation
- Feature branch creation/management per story assignment
- Lock management to prevent concurrent git operations in the same workspace

## Context
AES uses a hybrid git approach: GitHub MCP for remote API actions (PRs, comments, issues) and Local Git CLI for local operations (clone, pull, commit, push). Each agent has an isolated workspace to enable parallel development.

---

## Actionable Tasks

- [x] Create `GitHubAppService`:
  - [x] Install: `@octokit/auth-app`, `@octokit/rest`
  - [x] `getInstallationToken(project: Project): string` — authenticates via GitHub App and gets installation token
  - [x] `getAuthenticatedOctokit(project: Project): Octokit` — returns authenticated Octokit instance
  - [x] Decrypts `config.githubApp.privateKey` using `AES256EncryptionService`
- [x] Create `GitWorkspaceService`:
  - [x] `clone(agentInstance: AgentInstance, project: Project)`:
    - [x] Runs: `git clone {repoUrl} {workspacePath}` using installation token for auth
    - [x] Sets git user name/email to agent's display name / system email
  - [x] `createFeatureBranch(workspacePath, storyId)`:
    - [x] Creates and checks out: `feature/{storyId}`
  - [x] `commit(workspacePath, message)`:
    - [x] Stages all changes and creates atomic commit
  - [x] `push(workspacePath, branch)`:
    - [x] Pushes branch to remote using installation token
  - [x] `pull(workspacePath)`:
    - [x] Pulls latest changes from remote
  - [x] `acquireLock(workspacePath)`: — creates `.git/aes.lock`
  - [x] `releaseLock(workspacePath)`: — removes `.git/aes.lock`
- [x] Create `GitHubPRService`:
  - [x] `createPullRequest(project, { title, body, branch, base })` — creates PR via GitHub REST API
  - [x] `postComment(project, prNumber, body)` — posts comment on PR
  - [x] `getPRComments(project, prNumber)` — fetches PR comments for agent feedback injection
  - [x] `mergePullRequest(project, prNumber)` — merges PR (triggered by PM or user)
- [x] Integrate `GitWorkspaceService.clone()` into `ProjectInitializerService`:
  - [x] Each agent workspace is cloned after directory creation
- [x] Create `GitHubWebhookController`:
  - [x] `POST /webhooks/github` — receives GitHub webhook events
  - [x] Verifies webhook signature using `webhookSecret`
  - [x] Routes events:
    - [x] `pull_request.opened` → signal Reviewer agent
    - [x] `issue_comment.created` (on PR) → signal Developer agent + inject feedback via stdin
    - [x] `push` (to main) → emit `librarian.reindex` event
- [x] Write unit tests for:
  - [x] `GitHubAppService.getInstallationToken()` (mock Octokit)
  - [x] `GitHubWebhookController` signature verification
  - [x] `GitWorkspaceService` operations (mock child_process)

---

## Acceptance Criteria

- [x] `getInstallationToken()` successfully authenticates using GitHub App private key
- [x] Each agent workspace has a working git clone of the project repository
- [x] `createFeatureBranch('feature/story-123')` creates the branch in the workspace
- [x] GitHub webhook receives `pull_request.opened` and signals the Reviewer agent via SIGUSR1
- [x] GitHub webhook receives PR comment and injects feedback via agent stdin
- [x] Push to main branch triggers `librarian.reindex` event
- [x] Webhook signature verification rejects invalid signatures
- [x] Lock management prevents concurrent git operations in one workspace
- [x] Unit tests pass

---

## Dependencies
- **Depends on**: 0000008 (Project Initialization), 0000009 (ZeroClaw Process Manager)

## Notes
- A GitHub App setup guide is documented in story 0000022 (`docs/github-app-setup.md`)
- Git auth uses installation tokens (short-lived, auto-refreshed) NOT personal access tokens
