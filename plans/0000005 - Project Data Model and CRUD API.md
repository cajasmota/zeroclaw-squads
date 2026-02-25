# 0000005 - Project Data Model and CRUD API

**Epic**: EPIC-04: Project Management
**Assigned To**: Backend Agent
**Status**: [x] Completed
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

- [x] Create `ProjectsModule` in NestJS
- [x] Define `Project` Mongoose schema with fields:
  - [x] `tenantId` (ObjectId, indexed)
  - [x] `name` (string)
  - [x] `slug` (string, unique per tenant, URL-safe)
  - [x] `brandColor` (string, hex)
  - [x] `status` (enum: `active | archived`)
  - [x] `roles.librarian` (ObjectId ref AgentInstance)
  - [x] `roles.architect` (ObjectId ref AgentInstance)
  - [x] `roles.pm` (ObjectId ref AgentInstance)
  - [x] `roles.developer` (ObjectId[] ref AgentInstance)
  - [x] `roles.reviewer` (ObjectId[] ref AgentInstance)
  - [x] `roles.optional` (ObjectId[] ref AgentInstance)
  - [x] `config.slackToken` (string, encrypted)
  - [x] `config.slackChannelId` (string)
  - [x] `config.repoUrl` (string)
  - [x] `config.githubApp.appId` (string)
  - [x] `config.githubApp.privateKey` (string, encrypted)
  - [x] `config.githubApp.installationId` (string)
  - [x] `config.githubApp.webhookSecret` (string, encrypted)
  - [x] `config.inviteUsers` (string[])
  - [x] `config.llmKeys.openai` (string, encrypted)
  - [x] `config.llmKeys.anthropic` (string, encrypted)
  - [x] `config.llmKeys.google` (string, encrypted)
  - [x] `config.llmKeys.ollama_endpoint` (string)
  - [x] Timestamps
- [x] Create `AES256EncryptionService` utility:
  - [x] `encrypt(value: string): string`
  - [x] `decrypt(value: string): string`
  - [x] Uses `AES_ENCRYPTION_KEY` from env
- [x] Create `ProjectsService` with methods:
  - [x] `findAll(tenantId)` — list projects
  - [x] `findById(tenantId, id)` — single project (with roles populated)
  - [x] `create(tenantId, dto)` — create project + trigger initialization
  - [x] `update(tenantId, id, dto)` — update project metadata/config
  - [x] `archive(tenantId, id)` — set status to archived
- [x] Create `ProjectsController` with routes:
  - [x] `GET /projects` — list
  - [x] `GET /projects/:id` — single (populated roles)
  - [x] `POST /projects` — create
  - [x] `PATCH /projects/:id` — update
  - [x] `DELETE /projects/:id` — archive
- [x] Create `CreateProjectDto` and `UpdateProjectDto` with validation
- [x] Implement slug generation from project name (auto-generated, unique)
- [x] Emit `project.created` event after project creation (for initialization pipeline)
- [x] Write unit tests for `ProjectsService` and `AES256EncryptionService`

---

## Acceptance Criteria

- [x] `POST /projects` creates a project with all mandatory fields
- [x] Slug is auto-generated from name (e.g., "My Project" → `my-project`) and unique
- [x] Sensitive fields (Slack token, GitHub keys, LLM keys) are AES-256 encrypted in MongoDB
- [x] Decrypted values are never returned in API responses (use transform/exclude)
- [x] `GET /projects/:id` returns role fields populated with AgentInstance data
- [x] `project.created` event is emitted after successful creation
- [x] All unit tests pass

---

## Dependencies
- **Depends on**: 0000001 (Project Bootstrap), 0000002 (Auth & Multi-Tenant)
