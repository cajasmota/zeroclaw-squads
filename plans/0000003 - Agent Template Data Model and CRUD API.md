# 0000003 - Agent Template Data Model and CRUD API

**Epic**: EPIC-03: Agent Template System
**Assigned To**: Backend Agent
**Status**: [x] Completed
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

- [x] Create `TemplatesModule` in NestJS
- [x] Define `AgentTemplate` Mongoose schema with fields:
  - [x] `tenantId` (ObjectId, indexed)
  - [x] `displayName` (string)
  - [x] `role` (enum: `librarian | architect | pm | developer | reviewer | tester`)
  - [x] `tags` (string array)
  - [x] `soul` (string, Markdown)
  - [x] `aieos_identity` (Mixed — validated against AIEOS v1.1 structure)
  - [x] `config.model` (string)
  - [x] `config.provider` (enum: `ollama | openai | anthropic | google`)
  - [x] `config.skills` (string, YAML content)
  - [x] `config.canWriteCode` (boolean)
  - [x] `config.mcpServers` (array of objects)
  - [x] `avatarUrl` (string, optional)
  - [x] Timestamps (`createdAt`, `updatedAt`)
- [x] Create `TemplatesService` with methods:
  - [x] `findAll(tenantId, filters?: { role?, tags? })` — paginated list
  - [x] `findById(tenantId, id)` — single template
  - [x] `create(tenantId, dto)` — create template
  - [x] `update(tenantId, id, dto)` — partial update
  - [x] `delete(tenantId, id)` — soft or hard delete
  - [x] `exportJson(tenantId, id)` — export as AIEOS-compatible JSON
  - [x] `importJson(tenantId, payload)` — import from AIEOS-compatible JSON
- [x] Create `TemplatesController` with routes:
  - [x] `GET /templates` — list with optional `?role=&tags=` filters
  - [x] `GET /templates/:id` — single template
  - [x] `POST /templates` — create
  - [x] `PATCH /templates/:id` — update
  - [x] `DELETE /templates/:id` — delete
  - [x] `GET /templates/:id/export` — export JSON
  - [x] `POST /templates/import` — import JSON
- [x] Create `CreateTemplateDto` and `UpdateTemplateDto` with validation
- [x] Add AIEOS v1.1 validation (required sections: `identity`, `psychology`, `role_meta`)
- [x] Write unit tests for `TemplatesService` (mock Mongoose)
- [x] Write integration tests for `TemplatesController` endpoints

---

## Acceptance Criteria

- [x] `GET /templates` returns paginated list filtered by tenantId
- [x] `?role=developer` filter works correctly
- [x] `?tags=starwars` filter matches templates with that tag
- [x] Creating a template with invalid AIEOS payload returns `400 Bad Request`
- [x] All CRUD operations are scoped to the requesting tenant (tenantId)
- [x] Export returns valid AIEOS-compatible JSON
- [x] Import creates a new template from AIEOS JSON
- [x] All unit and integration tests pass

---

## Dependencies
- **Depends on**: 0000001 (Project Bootstrap), 0000002 (Auth & Multi-Tenant)
