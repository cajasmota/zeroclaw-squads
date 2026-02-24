# AES Knowledge Base — Agent Roles & Permissions

## Role Overview

Every project MUST have a minimum of 5 agents covering these mandatory roles:

| Role | Multiplicity | Can Write to Repo | Special Abilities |
|------|-------------|-------------------|-------------------|
| **Librarian** | Singleton (max 1) | No | Indexes codebase, authors `.aes/standards.md`, runs MCP tools |
| **Architect** | Singleton (max 1) | No | Creates TRD documents, technical design |
| **PM** | Singleton (max 1) | No | Manages backlog, creates stories/tickets, coordinates assignments |
| **Developer** | Multi-instance (N) | Yes | Implements features, writes code, creates PRs |
| **Reviewer** | Multi-instance (N) | No | Audits code, posts PR comments via GitHub |
| **Tester** | Multi-instance (N) | No | Test validation (optional) |

## Role Multiplicity Rules

- **Singletons**: Librarian, Architect, PM — UI must prevent creating more than 1 per project
- **Multi-instance**: Developer, Reviewer — Users can add "+" instances with unique names

## `canWriteCode` Flag

- Stored on AgentInstance config
- Only `Developer` role instances have `canWriteCode: true`
- Controls whether the agent can push to the repository

## Special Role Behaviors

### Librarian
- Has dedicated workspace: `/artifacts/{projectId}/librarian/`
- Runs Treesitter parser, call-graph engine
- Triggered manually ("Trigger Knowledge Ingestion" button) or on PR merge
- Provides MCP tools: `find_logic`, `ask_question`, `get_type_definition`, `get_component_sample`, `analyze_impact`, `check_convention_compliance`

### PM
- Monitors sprint readiness (marking sprint "Ready" triggers PM assignment)
- Creates and manages backlog tickets
- Can trigger workflow runs and PR merges

### Reviewer
- Activated automatically when GitHub fires `pull_request.opened` webhook
- Calls Librarian's `check_convention_compliance`
- Posts feedback as PR comments via GitHub MCP

### Developer
- Operates on feature branches: `feature/{storyId}`
- Uses `session.jsonl` for context continuity
- References Librarian standards

## Slack Identity

Each agent posts to Slack with:
- Dynamic avatar: transparent PNG merged with project `brandColor`
- Display name: `displayName` from AgentInstance
- A2A messages prefixed: `[A2A] 🏗️ Architect -> 💻 Developer: ...`

## References

- PRD.md §4.1 (Minimum Team & Onboarding)
- PRD.md §4.2 (Slack Identity & A2A)
- PRD.md §20 (Role Constraints & Permission Logic)
- PRD.md §7 (Librarian MCP)
