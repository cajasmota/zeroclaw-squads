# 0000003 - Agent Template Data Model and CRUD API

**Epic**: EPIC-03: Agent Template System
**Assigned To**: Backend Agent
**Status**: [ ] Not Started
**PRD Reference**: PRD.md §5.3 (Template Designer), §11 (AIEOS Identity Schema), §2.2 (Agent Instancing)
**Knowledge Base**: `knowledge-base/02-data-models.md`, `knowledge-base/06-aieos-schema.md`, `knowledge-base/04-agent-roles.md`

---

## Title
Implement AgentTemplate Mongoose schema and RESTful CRUD API

## Description
Create the NestJS module for agent templates. This includes the Mongoose schema for `AgentTemplate`, a service layer, and RESTful endpoints for creating, reading, updating, and deleting templates. Templates are the global library of reusable agent configurations.

## Context
Agent Templates are the global blueprints for agents. When a user creates a project, they assign templates to roles. A snapshot (AgentInstance) is created at assignment time. Templates include the AIEOS v1.1 identity payload, soul Markdown, and configuration. Templates are scoped to a `tenantId`.

---

## Actionable Tasks

- [ ] Create `TemplatesModule` in NestJS
- [ ] Define `AgentTemplate` Mongoose schema with fields:
  - [ ] `tenantId` (ObjectId, indexed)
  - [ ] `displayName` (string)
  - [ ] `role` (enum: `librarian | architect | pm | developer | reviewer | tester`)
  - [ ] `tags` (string array)
  - [ ] `soul` (string, Markdown)
  - [ ] `aieos_identity` (Mixed — validated against AIEOS v1.1 structure)
  - [ ] `config.model` (string)
  - [ ] `config.provider` (enum: `ollama | openai | anthropic | google`)
  - [ ] `config.skills` (string, YAML content)
  - [ ] `config.canWriteCode` (boolean)
  - [ ] `config.mcpServers` (array of objects)
  - [ ] `avatarUrl` (string, optional)
  - [ ] Timestamps (`createdAt`, `updatedAt`)
- [ ] Create `TemplatesService` with methods:
  - [ ] `findAll(tenantId, filters?: { role?, tags? })` — paginated list
  - [ ] `findById(tenantId, id)` — single template
  - [ ] `create(tenantId, dto)` — create template
  - [ ] `update(tenantId, id, dto)` — partial update
  - [ ] `delete(tenantId, id)` — soft or hard delete
  - [ ] `exportJson(tenantId, id)` — export as AIEOS-compatible JSON
  - [ ] `importJson(tenantId, payload)` — import from AIEOS-compatible JSON
- [ ] Create `TemplatesController` with routes:
  - [ ] `GET /templates` — list with optional `?role=&tags=` filters
  - [ ] `GET /templates/:id` — single template
  - [ ] `POST /templates` — create
  - [ ] `PATCH /templates/:id` — update
  - [ ] `DELETE /templates/:id` — delete
  - [ ] `GET /templates/:id/export` — export JSON
  - [ ] `POST /templates/import` — import JSON
- [ ] Create `CreateTemplateDto` and `UpdateTemplateDto` with validation
- [ ] Add AIEOS v1.1 validation (required sections: `identity`, `psychology`, `role_meta`)
- [ ] Write unit tests for `TemplatesService` (mock Mongoose)
- [ ] Write integration tests for `TemplatesController` endpoints

---

## Acceptance Criteria

- [ ] `GET /templates` returns paginated list filtered by tenantId
- [ ] `?role=developer` filter works correctly
- [ ] `?tags=starwars` filter matches templates with that tag
- [ ] Creating a template with invalid AIEOS payload returns `400 Bad Request`
- [ ] All CRUD operations are scoped to the requesting tenant (tenantId)
- [ ] Export returns valid AIEOS-compatible JSON
- [ ] Import creates a new template from AIEOS JSON
- [ ] All unit and integration tests pass

---

## Dependencies
- **Depends on**: 0000001 (Project Bootstrap), 0000002 (Auth & Multi-Tenant)
