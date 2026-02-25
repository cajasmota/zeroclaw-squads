# AES Project Backlog — Epic Index

> **System**: Agentic Engineering System (AES)
> **Status Legend**: `[ ]` Not Started | `[~]` In Progress | `[x]` Completed

---

## EPIC-01: Foundation & Infrastructure

> Bootstrap the monorepo, environment configuration, and core database connection.

| # | Story | Status | Agent |
|---|-------|--------|-------|
| [0000001](0000001%20-%20Project%20Bootstrap%20and%20Monorepo%20Setup.md) | Project Bootstrap and Monorepo Setup (NestJS + Next.js + MongoDB) | `[x]` | Backend + Frontend |

---

## EPIC-02: Authentication & Multi-Tenancy

> MongoDB-based email/password auth, JWT session management, per-tenant data isolation, frontend login and route protection. No Firebase, no public registration.

| # | Story | Status | Agent |
|---|-------|--------|-------|
| [0000002](0000002%20-%20Authentication%20and%20Multi-Tenant%20Middleware.md) | MongoDB Auth + bcrypt + JWT + Multi-Tenant Middleware (Backend) | `[x]` | Backend |
| [0000024](0000024%20-%20Frontend%20Authentication%20Login%20Page%20and%20Route%20Protection.md) | Frontend Auth - Login Page, httpOnly Cookie, Route Protection, App Shell | `[x]` | Frontend |

---

## EPIC-03: Agent Template System

> Global library of reusable agent configurations with AIEOS v1.1 identity support.

| # | Story | Status | Agent |
|---|-------|--------|-------|
| [0000003](0000003%20-%20Agent%20Template%20Data%20Model%20and%20CRUD%20API.md) | AgentTemplate Schema and CRUD API | `[x]` | Backend |
| [0000004](0000004%20-%20Template%20Designer%20UI.md) | Template Designer UI at /templates (Grid, Modal, AIEOS Builder) | `[x]` | Frontend |
| [0000027](0000027%20-%20Sync%20Agent%20Instance%20from%20Template.md) | Sync Agent Instance from Template (manual sync button + API) | `[x]` | Backend + Frontend |

---

## EPIC-04: Project Management

> Project lifecycle: creation wizard, role assignment, initialization sequence, Slack automation.

| # | Story | Status | Agent |
|---|-------|--------|-------|
| [0000005](0000005%20-%20Project%20Data%20Model%20and%20CRUD%20API.md) | Project Schema and CRUD API with AES-256 encryption | `[x]` | Backend |
| [0000006](0000006%20-%20Agent%20Instance%20Snapshot%20Creation.md) | AgentInstance Snapshot Creation on Template Assignment | `[x]` | Backend |
| [0000007](0000007%20-%20Project%20List%20and%20New%20Project%20Wizard%20UI.md) | Project List UI and Multi-step New Project Wizard at /projects | `[x]` | Frontend |
| [0000008](0000008%20-%20Project%20Initialization%20Sequence%20and%20Slack%20Automation.md) | Project Initialization Sequence (Directory, Slack, Agent Spawn, Greetings) | `[x]` | Backend |

---

## EPIC-05: ZeroClaw Runtime Integration

> Integration with the ZeroClaw Rust agent runtime, process management, and agent configuration.

| # | Story | Status | Agent |
|---|-------|--------|-------|
| [0000009](0000009%20-%20ZeroClaw%20Rust%20Kernel%20-%20Core%20Setup%20and%20CLI%20Interface.md) | ZeroClaw NestJS Process Manager (spawn, SIGUSR1, stdin, stream capture) | `[x]` | Backend |
| [0000010](0000010%20-%20ZeroClaw%20LLM%20Reasoning%20Loop%20and%20Session%20Persistence.md) | AIEOS v1.1 Generator and ZeroClaw config.toml Generator | `[x]` | Backend |
| [0000023](0000023%20-%20WebSocket%20Real-time%20Gateway%20and%20Slack%20Event%20Router.md) | WebSocket Real-time Gateway and Slack Event Router | `[x]` | Backend |

---

## EPIC-06: Workspace & Git Integration

> Per-agent git workspaces, GitHub App authentication, webhooks, and hybrid git tooling.

| # | Story | Status | Agent |
|---|-------|--------|-------|
| [0000011](0000011%20-%20GitHub%20App%20Integration%20and%20Workspace%20Git%20Setup.md) | GitHub App Auth, Per-agent Git Clone, PR Service, Webhook Handler | `[x]` | Backend |

---

## EPIC-07: Backlog & Sprint Management

> Epic → Story → Task hierarchy, Jira-style backlog, sprint management, PM agent integration.

| # | Story | Status | Agent |
|---|-------|--------|-------|
| [0000012](0000012%20-%20Backlog%20Data%20Model%20-%20Epics%20Stories%20Tasks%20API.md) | Epic, Story, Task, Sprint Data Models and REST API | `[x]` | Backend |

---

## EPIC-08: Librarian MCP

> Knowledge authority with Treesitter parser, code graph engine, and MCP tool server.

| # | Story | Status | Agent |
|---|-------|--------|-------|
| [0000013](0000013%20-%20Librarian%20MCP%20Server%20Setup.md) | Librarian MCP Server with Treesitter Parser and Code Graph Engine | `[x]` | Backend + DevOps |

---

## EPIC-09: Development & Review Loop

> Full developer-reviewer agent feedback loop from story assignment through PR merge, including ticket dialogue and Slack mirroring.

| # | Story | Status | Agent |
|---|-------|--------|-------|
| [0000014](0000014%20-%20Development%20and%20Review%20Agent%20Loop.md) | Developer-Reviewer Agent Loop (Assignment, PR, Feedback, Merge) | `[x]` | Backend |
| [0000025](0000025%20-%20Ticket%20Dialogue%20Backend%20-%20Comment%20System%20and%20Slack%20Mirroring.md) | Ticket Dialogue Backend - Comment API, Slack Thread Mirroring, Clarification Logic | `[x]` | Backend |

---

## EPIC-10: UI - Project Control Center

> All UI tabs within the project control center at /projects/[id].

| # | Story | Status | Agent |
|---|-------|--------|-------|
| [0000015](0000015%20-%20Project%20Control%20Center%20UI%20Dashboard%20and%20Agents.md) | Control Center Layout, Dashboard Tab, and Agents Tab | `[x]` | Frontend |
| [0000016](0000016%20-%20Backlog%20and%20Kanban%20Board%20UI.md) | Backlog (Epic/Story/Task hierarchy) and Kanban Board Tabs | `[x]` | Frontend |
| [0000019](0000019%20-%20Requirements%20Space%20and%20Project%20Settings%20UI.md) | Requirements Space (Tiptap) and Project Settings Tab | `[x]` | Frontend |

---

## EPIC-11: Workflow Engine

> Workflow templates, run tracking, approval gates, React Flow blueprint designer, and dual-status story sync.

| # | Story | Status | Agent |
|---|-------|--------|-------|
| [0000017](0000017%20-%20Workflow%20Engine%20-%20Templates%20and%20Runs.md) | Workflow Template Data Model, WorkflowRun Tracking, Approval Gates | `[x]` | Backend |
| [0000018](0000018%20-%20Blueprint%20Workflow%20Designer%20UI.md) | Blueprint Workflow Designer UI (React Flow) | `[~]` | Frontend |
| [0000028](0000028%20-%20Workflow%20to%20Story%20Status%20Sync.md) | Workflow Node → Story.workflowNodeStatus Dual-Status Sync | `[x]` | Backend |

---

## EPIC-12: Analytics & Archiving

> LLM usage monitoring, transcript archiving, and analytics charts.

| # | Story | Status | Agent |
|---|-------|--------|-------|
| [0000020](0000020%20-%20Analytics%20and%20Transcript%20Archiving.md) | Usage Monitoring (Chokidar), Transcript Archiving, and Analytics Charts | `[x]` | Backend + Frontend |

---

## EPIC-13: Deployment & Operations

> Model administration, Ollama management, global settings, LLM key hierarchy, setup script, and configuration guides.

| # | Story | Status | Agent |
|---|-------|--------|-------|
| [0000021](0000021%20-%20Model%20Administration%20UI%20and%20Ollama%20Integration.md) | Model Admin UI at /settings/models and Ollama Integration | `[x]` | Backend + Frontend |
| [0000022](0000022%20-%20Unified%20Setup%2C%20Update%2C%20and%20Uninstall%20Scripts.md) | Unified setup-aes.sh + update-aes.sh + uninstall-aes.sh + Setup Guides | `[x]` | DevOps |
| [0000026](0000026%20-%20Global%20Settings%20API%20and%20LLM%20Key%20Hierarchy.md) | Global Settings API + LLM Key Hierarchy + /settings Global UI | `[x]` | Backend + Frontend |

---

## Implementation Order

Stories should be implemented in numbered order (0000001 → 0000026). Dependencies are respected by this ordering.

**Critical path**: 0000001 → 0000002 → 0000024 → 0000005 → 0000006 → 0000008 → 0000009 → 0000014 → 0000025

> Note: 0000024 (Frontend Auth) must come before any UI story. 0000026 (Global Settings) should come before final deployment (0000022).

---

## Progress Summary

| Epic | Total Stories | Completed | In Progress | Not Started |
|------|--------------|-----------|-------------|-------------|
| EPIC-01: Foundation | 1 | 1 | 0 | 0 |
| EPIC-02: Auth | 2 | 2 | 0 | 0 |
| EPIC-03: Templates | 3 | 3 | 0 | 0 |
| EPIC-04: Projects | 4 | 4 | 0 | 0 |
| EPIC-05: ZeroClaw | 3 | 3 | 0 | 0 |
| EPIC-06: Git | 1 | 1 | 0 | 0 |
| EPIC-07: Backlog | 1 | 1 | 0 | 0 |
| EPIC-08: Librarian | 1 | 1 | 0 | 0 |
| EPIC-09: Dev Loop | 2 | 2 | 0 | 0 |
| EPIC-10: UI Control | 3 | 1 | 2 | 0 |
| EPIC-11: Workflows | 3 | 2 | 1 | 0 |
| EPIC-12: Analytics | 1 | 1 | 0 | 0 |
| EPIC-13: Deployment | 3 | 3 | 0 | 0 |
| **TOTAL** | **28** | **25** | **3** | **0** |

---

## Knowledge Base Reference

The knowledge base is located at `plans/knowledge-base/`. Agents should consult these files for context:

| File | Content |
|------|---------|
| `00-system-overview.md` | System goals, core concepts, design principles |
| `01-architecture.md` | Component map, NestJS, ZeroClaw architecture |
| `02-data-models.md` | All MongoDB schemas (Project, Agent, Story, Epic, Task, etc.) |
| `03-technology-stack.md` | Full tech stack, file structure conventions |
| `04-agent-roles.md` | Agent roles, permissions, special abilities |
| `05-communication-protocols.md` | SIGUSR1, stdin injection, Slack routing, GitHub webhooks |
| `06-aieos-schema.md` | AIEOS v1.1 identity specification and structure |
| `07-git-strategy.md` | Per-agent workspace, hybrid git tooling, workflow |
| `08-ui-design-system.md` | UI routes, component library, design tokens |
| `09-zeroclaw-integration.md` | ZeroClaw installation, config.toml, AIEOS integration |
