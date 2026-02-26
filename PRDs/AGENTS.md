# PRD Authoring Guide — Ralph Loop

This file explains how to write a good `prd.json` for the Ralph autonomous coding loop.
Read it before creating any new PRD file in this folder.

---

## What is Ralph?

Ralph is an agentic coding loop that:
1. Reads `prd.json` to find the next user story where `passes: false`
2. Spawns a **fresh AI instance** with clean context on every iteration
3. Implements that single story, runs quality checks, commits if checks pass
4. Marks the story `passes: true` and repeats

Because each iteration has **no memory of previous ones** (except git history and `progress.txt`),
the PRD must contain **everything the agent needs to do its job** — no assumptions.

---

## File Naming Convention

```
PRDs/{storyId}-{kebab-case-title}.json

Examples:
  PRDs/0000029-migrate-frontend-fetches-to-tanstack-query-and-axios.json
  PRDs/0000030-add-dark-mode-support.json
```

Always match the story ID from `plans/INDEX.md`.

---

## Top-Level Structure

```jsonc
{
  "project": "AES (Agentic Engineering System)",    // Human-readable project name
  "branchName": "ralph/NNNNNNN-short-description", // Git branch Ralph creates
  "description": "One sentence describing the full feature being built.",

  "storyReference": { ... },   // Link back to the plans/ story file
  "dependencies": [ ... ],     // Stories this one builds on
  "knowledgeBase": [ ... ],    // plans/knowledge-base files to read first
  "referencedFiles": { ... },  // Exact files to modify / create / leave alone
  "conventions": { ... },      // Project-specific rules the agent must follow
  "userStories": [ ... ]       // The actual work items (keep each one SMALL)
}
```

---

## `storyReference` — Link to the plans/ story

```json
"storyReference": {
  "id": "0000029",
  "file": "plans/0000029 - Migrate Frontend Fetches to TanStack Query and Axios.md",
  "epic": "EPIC-10: UI - Project Control Center",
  "assignedTo": "Frontend Agent",
  "status": "Not Started"
}
```

- `id` matches the zero-padded number from `plans/INDEX.md`
- `file` is the relative path to the full story markdown
- `assignedTo` reflects the agent type: `"Frontend Agent"`, `"Backend Agent"`, or `"Backend + Frontend"`

---

## `dependencies` — What must exist before this PRD runs

```json
"dependencies": [
  {
    "storyId": "0000024",
    "title": "Frontend Auth - Login Page, httpOnly Cookie, Route Protection, App Shell",
    "reason": "QueryClientProvider must wrap the same authenticated layout shell"
  }
]
```

- List only **direct** blockers (what this feature builds on top of)
- Include the `reason` so the agent understands **why** the dependency matters
- If a dependency story's output affects files this PRD modifies, say so explicitly

---

## `knowledgeBase` — Reference docs to load before coding

```json
"knowledgeBase": [
  {
    "file": "plans/knowledge-base/03-technology-stack.md",
    "relevance": "Full tech stack — Next.js App Router, NestJS, MongoDB"
  },
  {
    "file": "plans/knowledge-base/02-data-models.md",
    "relevance": "MongoDB schemas for the entities this story touches"
  }
]
```

- Only include files that are **actually relevant** to this PRD
- The `relevance` field tells the agent which parts of that doc to pay attention to
- Available knowledge base files:
  - `00-system-overview.md` — System goals and design principles
  - `01-architecture.md` — Component map, NestJS + ZeroClaw architecture
  - `02-data-models.md` — All MongoDB schemas (always include for backend stories)
  - `03-technology-stack.md` — Full tech stack and file structure conventions
  - `04-agent-roles.md` — Agent roles and permissions
  - `05-communication-protocols.md` — SIGUSR1, stdin, Slack routing, GitHub webhooks
  - `06-aieos-schema.md` — AIEOS v1.1 identity specification
  - `07-git-strategy.md` — Per-agent workspace and git workflow
  - `08-ui-design-system.md` — UI routes, Shadcn components, design tokens
  - `09-zeroclaw-integration.md` — ZeroClaw installation, config.toml, AIEOS integration

---

## `referencedFiles` — Precise file inventory

Split into three buckets so the agent knows exactly what to touch:

```json
"referencedFiles": {
  "toModify": [
    {
      "path": "apps/frontend/app/(authenticated)/layout.tsx",
      "reason": "Add QueryClientProvider wrapper around children"
    }
  ],
  "toCreate": [
    {
      "path": "apps/frontend/lib/api/axios.ts",
      "reason": "Shared Axios instance with 401 redirect interceptor"
    }
  ],
  "toLeave": [
    {
      "path": "apps/frontend/app/login/page.tsx",
      "reason": "Pre-auth page — runs before QueryClientProvider exists, keep as-is"
    }
  ]
}
```

- `toLeave` is as important as the others — it **prevents accidental regressions**
- Be specific about `reason` for every entry; the agent reads these as instructions
- For backend stories, list schema files, service files, controller files, and DTO files separately

---

## `conventions` — Project rules the agent must follow

This is where you embed project-specific constraints that aren't obvious from the code.
Every PRD should include the conventions most relevant to what's being built.

**Common frontend conventions for this project:**
```json
"conventions": {
  "packageManager": "pnpm — always use pnpm --filter=frontend, never npm or yarn",
  "framework": "Next.js App Router — no Pages Router, no getServerSideProps",
  "uiComponents": "Shadcn UI only — do not install other component libraries",
  "apiCalls": "Always through /api/* proxy routes — never call backend port directly",
  "arrayGuard": "All fetch responses that return arrays must guard: Array.isArray(d) ? d : []",
  "typecheck": "Run pnpm --filter=frontend tsc --noEmit after each story"
}
```

**Common backend conventions:**
```json
"conventions": {
  "packageManager": "pnpm — always use pnpm --filter=backend",
  "tenantScope": "EVERY Mongoose query must include tenantId — never query without it",
  "encryption": "ALL sensitive fields (API keys, tokens) must be AES-256 encrypted before MongoDB write",
  "guards": "All routes require JwtAuthGuard unless decorated @Public()",
  "tests": "Every public service method must have a co-located .spec.ts unit test",
  "typecheck": "Run pnpm --filter=backend tsc --noEmit after each story"
}
```

---

## `userStories` — The work items

### Required fields per story

```json
{
  "id": "US-001",              // Sequential, never reuse within a PRD
  "title": "Short verb phrase",
  "description": "As a [role], I need [what] so that [why].",
  "acceptanceCriteria": [      // Concrete, verifiable, ordered
    "...",
    "pnpm --filter=frontend tsc --noEmit passes",
    "Verify in browser: [specific action and expected result]"
  ],
  "priority": 1,               // Execution order — lower = first
  "passes": false,             // Ralph sets this to true when done — never pre-set to true
  "notes": ""                  // Leave empty; Ralph fills this with learnings
}
```

### Story sizing rules (CRITICAL)

Each story must complete in **one context window**. If it's too big, Ralph runs out of context
and produces broken code.

**Right-sized (good):**
- Install a package and configure it
- Create one new hook file
- Migrate one page component to use existing hooks
- Add one new endpoint + DTO
- Add one MongoDB schema field + migration logic

**Too big (split these):**
- "Migrate the entire projects/[id]/page.tsx" → split by tab/component
- "Build the full authentication system"
- "Add all CRUD endpoints for a resource"
- "Refactor all API calls across the frontend"

### Acceptance criteria rules

1. **Be concrete** — "loads correctly" is bad; "shows a list of project cards with name and status" is good
2. **Always include typecheck** — `pnpm --filter=frontend tsc --noEmit passes` or backend equivalent
3. **UI stories must include browser verification** — `"Verify in browser: navigate to /projects — project list renders, no console errors"`
4. **Include the shell command** for install/setup stories
5. **State exact file paths** when a file must be created or modified
6. **Order criteria** from infrastructure → implementation → verification

### Priority ordering

- Setup stories (install, configure, create infrastructure files) always go first (priority 1–5)
- Dependent stories come after what they depend on
- Verification/audit stories always go last
- Never put a story that depends on another story at a lower priority number

---

## Full annotated example

See `PRDs/0000029-migrate-frontend-fetches-to-tanstack-query-and-axios.json` as the
canonical example. It demonstrates:
- Full metadata with `storyReference`, `dependencies`, `knowledgeBase`, `referencedFiles`, `conventions`
- 16 user stories properly sized for one context window each
- Setup stories first (US-001 through US-005), then feature stories (US-006 through US-015), then verification (US-016)
- Concrete acceptance criteria with exact file paths and shell commands
- Browser verification on every UI story

---

## Running Ralph

Once your `prd.json` is ready:

```bash
# From the repo root
./scripts/ralph/ralph.sh --tool claude 20   # 20 iterations max
./scripts/ralph/ralph.sh --tool amp 20
```

Ralph will:
1. Create branch `branchName` from current HEAD
2. Pick highest-priority story where `passes: false`
3. Implement it, run quality checks (typecheck, tests)
4. Commit if checks pass, mark `passes: true`, append learnings to `progress.txt`
5. Repeat until all stories pass or max iterations reached

---

## Checklist before saving a PRD

- [ ] File named `PRDs/{storyId}-{kebab-title}.json`
- [ ] `branchName` follows `ralph/{storyId}-{short-description}`
- [ ] `storyReference.id` matches the story in `plans/INDEX.md`
- [ ] All blocking stories listed in `dependencies` with `reason`
- [ ] Only relevant `knowledgeBase` files listed
- [ ] Every file touched has an entry in `referencedFiles` (modify/create/leave)
- [ ] `conventions` covers the main footguns for this type of work
- [ ] Each user story fits in one context window (no "refactor everything" stories)
- [ ] Every story has typecheck in acceptance criteria
- [ ] Every UI story has browser verification in acceptance criteria
- [ ] All `passes` fields are `false`
- [ ] `notes` fields are empty strings
- [ ] Priority ordering respects dependencies between stories
