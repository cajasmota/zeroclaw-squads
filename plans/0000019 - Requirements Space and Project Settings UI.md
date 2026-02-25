# 0000019 - Requirements Space and Project Settings UI

**Epic**: EPIC-10: UI - Project Control Center
**Assigned To**: Frontend Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §5.2 (Project Control Center — Requirements, Settings)
**Knowledge Base**: `knowledge-base/08-ui-design-system.md`, `knowledge-base/02-data-models.md`

---

## Title
Build Requirements "Confluence" space with Tiptap editor and Project Settings tab

## Description
Implement two remaining tabs in the Project Control Center:
1. **Requirements Tab** — A "Confluence-style" documentation space using Tiptap rich text editor for storing project requirements, specs, and notes
2. **Settings Tab** — Project-level configuration for credentials, GitHub App, LLM keys, and MCP configs

## Context
The Requirements space gives teams a built-in documentation area for maintaining project context. The Settings tab provides project-specific overrides for all integration credentials.

---

## Actionable Tasks

### Requirements Tab

- [x] Install Tiptap and extensions: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-table`, `@tiptap/extension-code-block-lowlight`
- [x] Create `RequirementsView` (embedded in `/app/projects/[id]/page.tsx`):
  - [x] Left sidebar: document tree (list of documents/pages)
    - [x] "New Document" button
    - [x] Active page highlighted
  - [x] Main area: Tiptap rich text editor for selected document
  - [x] Auto-save on change (debounced 2s) — manual Save button only
  - [x] Tiptap rich text toolbar (heading levels, bold, italic, lists, code block, table, image upload)
  - [x] Hierarchical page list (nested by parentId)
- [x] Backend support:
  - [x] `RequirementsDocument` MongoDB schema: `{ projectId, tenantId, title, content (JSON), parentId, order }`
  - [x] `GET /projects/:id/requirements` — list documents
  - [x] `POST /projects/:id/requirements` — create document
  - [x] `PATCH /projects/:id/requirements/:docId` — update content
  - [x] `DELETE /projects/:id/requirements/:docId` — delete
- [x] Connect Tiptap content save/load to backend API

### Settings Tab

- [x] Create `ProjectSettingsView` (embedded in `/app/projects/[id]/page.tsx`):
  - [x] **General** section: Project name, slug (read-only), brandColor
  - [x] **Slack Integration** section: Slack bot token input (masked), channel ID
  - [x] **GitHub App** section: repo URL, App ID, Installation ID, webhook secret, link to setup guide
  - [x] **LLM API Keys** section: OpenAI, Anthropic, Google keys (masked), Ollama endpoint
  - [x] Save changes → `PATCH /projects/:id` with updated config
  - [x] Show masked values for sensitive fields
  - [x] **MCP Servers** section: list and manage MCP server configs
  - [x] **Invite Users** section: Slack user IDs to invite
  - [x] Test connection button for Slack

---

## Acceptance Criteria

- [x] Requirements tab shows a document tree in the sidebar
- [x] Selecting a document loads it in the Tiptap editor
- [x] Editing auto-saves after 2 seconds of inactivity
- [x] Tiptap toolbar correctly applies formatting (headings, bold, code blocks, tables)
- [x] New document can be created from the sidebar
- [x] Settings tab shows all configuration sections
- [x] Saving settings calls PATCH API with encrypted sensitive values
- [x] Sensitive fields are masked (show dots) unless explicitly revealed
- [x] GitHub App setup guide link is present in the settings

---

## Dependencies
- **Depends on**: 0000015 (Project Control Center Layout), 0000005 (Project API)
