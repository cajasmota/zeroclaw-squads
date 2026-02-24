# 0000005 - Project Data Model and CRUD API

**Epic**: EPIC-04: Project Management
**Assigned To**: Backend Agent
**Status**: [ ] Not Started
**PRD Reference**: PRD.md §3.1 (Project Schema), §4 (Project Initialization)
**Knowledge Base**: `knowledge-base/02-data-models.md`, `knowledge-base/04-agent-roles.md`

---

## Title
Implement Project Mongoose schema and RESTful CRUD API

## Description
Create the NestJS module for projects. Includes the Mongoose schema for `Project`, a service layer with initialization logic, and RESTful endpoints for project lifecycle management.

## Context
A project is the central entity in AES. It contains role assignments (LibrarianID, ArchitectID, etc.), encrypted credentials (Slack token, GitHub App config, LLM keys), and project metadata. When a project is created, it triggers a multi-step initialization sequence (directory setup, Slack channel creation, agent activation, greetings).

---

## Actionable Tasks

- [ ] Create `ProjectsModule` in NestJS
- [ ] Define `Project` Mongoose schema with fields:
  - [ ] `tenantId` (ObjectId, indexed)
  - [ ] `name` (string)
  - [ ] `slug` (string, unique per tenant, URL-safe)
  - [ ] `brandColor` (string, hex)
  - [ ] `status` (enum: `active | archived`)
  - [ ] `roles.librarian` (ObjectId ref AgentInstance)
  - [ ] `roles.architect` (ObjectId ref AgentInstance)
  - [ ] `roles.pm` (ObjectId ref AgentInstance)
  - [ ] `roles.developer` (ObjectId[] ref AgentInstance)
  - [ ] `roles.reviewer` (ObjectId[] ref AgentInstance)
  - [ ] `roles.optional` (ObjectId[] ref AgentInstance)
  - [ ] `config.slackToken` (string, encrypted)
  - [ ] `config.slackChannelId` (string)
  - [ ] `config.repoUrl` (string)
  - [ ] `config.githubApp.appId` (string)
  - [ ] `config.githubApp.privateKey` (string, encrypted)
  - [ ] `config.githubApp.installationId` (string)
  - [ ] `config.githubApp.webhookSecret` (string, encrypted)
  - [ ] `config.inviteUsers` (string[])
  - [ ] `config.llmKeys.openai` (string, encrypted)
  - [ ] `config.llmKeys.anthropic` (string, encrypted)
  - [ ] `config.llmKeys.google` (string, encrypted)
  - [ ] `config.llmKeys.ollama_endpoint` (string)
  - [ ] Timestamps
- [ ] Create `AES256EncryptionService` utility:
  - [ ] `encrypt(value: string): string`
  - [ ] `decrypt(value: string): string`
  - [ ] Uses `AES_ENCRYPTION_KEY` from env
- [ ] Create `ProjectsService` with methods:
  - [ ] `findAll(tenantId)` — list projects
  - [ ] `findById(tenantId, id)` — single project (with roles populated)
  - [ ] `create(tenantId, dto)` — create project + trigger initialization
  - [ ] `update(tenantId, id, dto)` — update project metadata/config
  - [ ] `archive(tenantId, id)` — set status to archived
- [ ] Create `ProjectsController` with routes:
  - [ ] `GET /projects` — list
  - [ ] `GET /projects/:id` — single (populated roles)
  - [ ] `POST /projects` — create
  - [ ] `PATCH /projects/:id` — update
  - [ ] `DELETE /projects/:id` — archive
- [ ] Create `CreateProjectDto` and `UpdateProjectDto` with validation
- [ ] Implement slug generation from project name (auto-generated, unique)
- [ ] Emit `project.created` event after project creation (for initialization pipeline)
- [ ] Write unit tests for `ProjectsService` and `AES256EncryptionService`

---

## Acceptance Criteria

- [ ] `POST /projects` creates a project with all mandatory fields
- [ ] Slug is auto-generated from name (e.g., "My Project" → `my-project`) and unique
- [ ] Sensitive fields (Slack token, GitHub keys, LLM keys) are AES-256 encrypted in MongoDB
- [ ] Decrypted values are never returned in API responses (use transform/exclude)
- [ ] `GET /projects/:id` returns role fields populated with AgentInstance data
- [ ] `project.created` event is emitted after successful creation
- [ ] All unit tests pass

---

## Dependencies
- **Depends on**: 0000001 (Project Bootstrap), 0000002 (Auth & Multi-Tenant)
