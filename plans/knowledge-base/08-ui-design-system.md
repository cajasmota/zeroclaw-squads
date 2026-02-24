# AES Knowledge Base — UI Design System & Routes

## Design System

- **Component Library**: Shadcn UI
- **Theme**: Dark/light toggle via `next-themes`
- **Primary Color**: `#004176` (Improving.com)
- **Neutral Color**: `#8C8C8C`
- **Theme Toggle**: Located in top-right navigation

## UI Routes

| Route | Page | Description |
|-------|------|-------------|
| `/projects` | Project List | Grid of project cards + "New Project" wizard |
| `/projects/[id]` | Project Control Center | Dashboard, agents, backlog, kanban, blueprints, requirements, settings |
| `/templates` | Template Designer | Global agent library grid |
| `/settings/models` | Model Administration | Ollama + cloud provider management |

## Key UI Components

### Project List (`/projects`)
- Grid of project cards
- "New Project" wizard (multi-step):
  - Step 1: Basic info (name, slug, brandColor)
  - Step 2: Role assignment (5 mandatory roles)
  - Step 3: DisplayName overrides per instance
  - Step 4: Optional additional instances for Developer/Reviewer

### Project Control Center (`/projects/[id]`)
Tabbed interface with:

| Tab | Content |
|-----|---------|
| **Dashboard** | Real-time analytics, agent health, "Trigger Knowledge Ingestion" button |
| **Agents** | Responsive grid of agent cards (avatar, name, role, tags, status, bio) |
| **Backlog** | Jira-style list view, stories grouped by Sprint |
| **Kanban** | Columns: Backlog → Selected for Dev → In Progress → Review → Done |
| **Blueprints** | React-Flow workflow designer |
| **Requirements** | Tiptap-based "Confluence" space |
| **Settings** | Project-level credentials, GitHub App, MCP configs |

### Agent Card
- Shadcn Card component
- Shows: Avatar, Display Name, Role, Tags (badges), Status (Idle/Busy), Bio snippet
- Click → Full-screen Modal (LinkedIn-style)
- Modal has View/Edit toggle

### Kanban Board
- Filters: "Waiting for Approval", "Waiting for Answer"
- Card indicators: blockage icons, Ticket Type badges (Feature/Bugfix/Refactor/Task)
- Ticket Modal: Discussion tab + Live Activity Logs tab

### Template Designer (`/templates`)
- Grid of agent template cards
- Filterable by Role or Tags
- Agent Detail Modal (hero style):
  - Profile view: avatar, role, tags, stats
  - Edit mode: AIEOS Identity Builder, soul editor
- JSON import/export
- "Copy Persona Interviewer Prompt" section

### Model Admin (`/settings/models`)
- Provider toggle: Enable/Disable cloud providers or Local Ollama
- Ollama UI: Status, Active Models, Pull/Delete models
- Resource toggle: free up VPS RAM

## Shadcn UI Component Usage

Key Shadcn components to use:
- `Card`, `CardHeader`, `CardContent` — Agent cards, project cards
- `Dialog` / `Modal` — Agent profile modal, ticket modal
- `Badge` — Tags, status indicators
- `Button` — Actions
- `Tabs` — Control center sections
- `Table` — Backlog list view
- `Select`, `Input`, `Textarea` — Forms

## References

- PRD.md §5 (UI Management Pages)
- PRD.md §19 (Design System & Branding)
- PRD.md §16.3 (Live Activity Logs)
