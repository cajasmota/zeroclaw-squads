# 0000019 - Requirements Space and Project Settings UI

**Epic**: EPIC-10: UI - Project Control Center
**Assigned To**: Frontend Agent
**Status**: [ ] Not Started
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

- [ ] Install Tiptap and extensions: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-table`, `@tiptap/extension-code-block-lowlight`
- [ ] Create `RequirementsView` at `/app/projects/[id]/requirements/`:
  - [ ] Left sidebar: document tree (list of documents/pages)
    - [ ] "New Document" button
    - [ ] Hierarchical page list (nested)
    - [ ] Active page highlighted
  - [ ] Main area: Tiptap editor for selected document
  - [ ] Auto-save on change (debounced 2s)
  - [ ] Toolbar: heading levels, bold, italic, lists, code block, table, image upload
- [ ] Backend support (if not already in `ProjectsModule`):
  - [ ] `RequirementsDocument` MongoDB schema: `{ projectId, tenantId, title, content (JSON), parentId, order }`
  - [ ] `GET /projects/:id/requirements` — list documents
  - [ ] `POST /projects/:id/requirements` — create document
  - [ ] `PATCH /projects/:id/requirements/:docId` — update content
  - [ ] `DELETE /projects/:id/requirements/:docId` — delete
- [ ] Connect Tiptap content save/load to API

### Settings Tab

- [ ] Create `ProjectSettingsView` at `/app/projects/[id]/settings/`:
  - [ ] **General** section:
    - [ ] Project name, slug (read-only), brandColor picker
  - [ ] **Slack Integration** section:
    - [ ] Slack bot token input (masked)
    - [ ] Current channel ID display
    - [ ] Test connection button
  - [ ] **GitHub App** section:
    - [ ] Repository URL input
    - [ ] App ID, Installation ID inputs
    - [ ] Private Key upload (file input, encrypted before send)
    - [ ] Webhook Secret input (masked)
    - [ ] Link to GitHub App setup guide
  - [ ] **LLM API Keys** section:
    - [ ] Inputs for OpenAI, Anthropic, Google keys (masked)
    - [ ] Ollama endpoint URL
    - [ ] "Use global settings" toggle per provider
  - [ ] **MCP Servers** section:
    - [ ] List of configured MCP servers
    - [ ] Add/Edit/Delete MCP server configs (JSON editor)
  - [ ] **Invite Users** section:
    - [ ] List of Slack user IDs to invite to the project channel
    - [ ] Add/Remove users
  - [ ] Save changes → `PATCH /projects/:id` with updated config
  - [ ] Show masked values for all sensitive fields (dots for stored keys)

---

## Acceptance Criteria

- [ ] Requirements tab shows a document tree in the sidebar
- [ ] Selecting a document loads it in the Tiptap editor
- [ ] Editing auto-saves after 2 seconds of inactivity
- [ ] Tiptap toolbar correctly applies formatting (headings, bold, code blocks, tables)
- [ ] New document can be created from the sidebar
- [ ] Settings tab shows all configuration sections
- [ ] Saving settings calls PATCH API with encrypted sensitive values
- [ ] Sensitive fields are masked (show dots) unless explicitly revealed
- [ ] GitHub App setup guide link is present in the settings

---

## Dependencies
- **Depends on**: 0000015 (Project Control Center Layout), 0000005 (Project API)
