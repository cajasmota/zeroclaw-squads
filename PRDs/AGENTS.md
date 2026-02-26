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

## `storyReference` — Human-readable tracking only

```json
"storyReference": {
  "id": "0000029",
  "file": "plans/0000029 - Migrate Frontend Fetches to TanStack Query and Axios.md",
  "epic": "EPIC-10: UI - Project Control Center",
  "assignedTo": "Frontend Agent",
  "status": "Not Started"
}
```

**This field is for humans only.** The agent does not use it to decide what to implement.
The `prd.json` itself — specifically `userStories`, `conventions`, `referencedFiles`, and
`description` — is the **single source of truth** for what the agent builds.

The `plans/` story file is a design document written before coding started. The PRD.json
may diverge from it as you refine scope. That is fine — the agent follows the PRD.json.
Do not instruct the agent to "read the story file first" or to reconcile differences;
that introduces confusion. The `storyReference.file` is purely for your own cross-referencing.

- `status` is updated by the human author as stories complete — not by Ralph
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

## `referencedFiles` — Starting point, not a constraint

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

**This field is a helpful head-start, not a hard constraint.**
The agent is free — and expected — to read, modify, or create any additional files
needed to make the acceptance criteria pass. `referencedFiles` exists to:

1. Quickly orient a fresh-context agent to *where* the relevant code lives
2. Flag files that should **not** be touched (the `toLeave` bucket is the only one that carries a real constraint)
3. Help you as the author think through scope before writing acceptance criteria

If the agent discovers during implementation that it needs to touch a file not listed
here, it should do so without hesitation. The acceptance criteria are what matter —
not the file list.

- `toLeave` **is** a real guard — include files that must not be broken or changed
- `toModify` and `toCreate` are informational hints only
- For backend stories, listing schema / service / controller / DTO files here helps
  the agent orient faster, but it does not prevent it from creating additional DTOs,
  interfaces, or utility files as needed

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

## How to run a PRD with Ralph — full prompt example

Ralph requires a `prd.json` at the **repo root** (or the path your `ralph.sh` script
expects). Copy or symlink the PRD file before running:

```bash
# From repo root — copy the PRD you want to run into prd.json
cp PRDs/0000029-migrate-frontend-fetches-to-tanstack-query-and-axios.json prd.json

# Then run Ralph (adjust iterations as needed)
./scripts/ralph/ralph.sh --tool claude 20
```

### The prompt Ralph passes to each agent iteration

Ralph reads `prd.json` and constructs a prompt for each iteration automatically.
But when you **manually** start a Ralph-style session (e.g. in Windsurf/Cursor/Claude),
use the following prompt template. Copy it verbatim and fill in the bracketed parts:

---

```
You are an autonomous coding agent working on the AES (Agentic Engineering System) codebase.
Your ONLY job this session is to implement ONE user story from the PRD below and make all
its acceptance criteria pass. Do not implement any other stories.

SOURCE OF TRUTH: prd.json (the file below). Ignore any other planning documents
unless they are listed in the PRD's knowledgeBase array.

--- PRD ---
[paste the full contents of the prd.json here]
-----------

INSTRUCTIONS:
1. Read the full PRD above. Note the `conventions` and `referencedFiles.toLeave` fields —
   these are hard constraints. Everything else is a guide.
2. Find the lowest-priority user story where `passes` is false. That is your story.
3. Read every file in `referencedFiles.toModify` and any files those reference before
   writing a single line of code.
4. Implement the story. You may read, modify, or create any file necessary to make
   the acceptance criteria pass. You are NOT limited to the files in `referencedFiles`.
5. After implementation, run the quality checks listed in acceptanceCriteria
   (typecheck, tests, browser verification if applicable).
6. If all checks pass:
   a. Commit with message: "feat(US-XXX): [story title]"
   b. Update prd.json: set `passes: true` on this story, add a one-sentence learning
      to its `notes` field.
   c. Output a brief summary of what you did and what you learned.
7. If a check fails, fix the code — do not mark `passes: true` until all criteria pass.
8. Stop after completing ONE story. Do not proceed to the next.
```

---

### When to use the manual prompt vs. `ralph.sh`

| Situation | Use |
|-----------|-----|
| Running the full automated loop unattended | `./scripts/ralph/ralph.sh --tool claude 20` |
| Doing one story interactively with oversight | Paste the manual prompt above into your AI IDE |
| Debugging a failing story | Paste the manual prompt, add the failure output at the end |
| Resuming after a mid-loop failure | Just re-run `ralph.sh` — it skips stories where `passes: true` |

### Tips for reliable Ralph runs

- **Keep `prd.json` at root** — `ralph.sh` reads it from the working directory
- **Commit before starting** — Ralph creates a branch from your current HEAD; a clean
  git state prevents merge conflicts
- **One PRD at a time** — only one `prd.json` exists at root at a time; swap files
  between PRDs
- **Watch `progress.txt`** — Ralph appends learnings after each iteration; read it
  if something goes wrong to understand what the previous iteration discovered
- **Bump `totalThoughts` if stories are failing** — if the agent is consistently
  running out of context mid-story, split that story into two smaller ones in `prd.json`
  and reset `passes: false`

---

## Checklist before saving a PRD

**Structure**
- [ ] File named `PRDs/{storyId}-{kebab-title}.json`
- [ ] `branchName` follows `ralph/{storyId}-{short-description}`
- [ ] `storyReference.id` matches the story in `plans/INDEX.md` (for human tracking)
- [ ] `description` is one clear sentence — the agent reads this as context for all stories

**Context fields**
- [ ] All blocking stories listed in `dependencies` with `reason`
- [ ] Only relevant `knowledgeBase` files listed (don't pad with irrelevant docs)
- [ ] `referencedFiles.toLeave` covers all files that must not be broken
- [ ] `referencedFiles.toModify` and `toCreate` list the *likely* starting files (not exhaustive)
- [ ] `conventions` covers the main footguns for this type of work

**User stories**
- [ ] Each story fits in one context window (no "refactor everything" stories)
- [ ] Every story has typecheck in acceptance criteria
- [ ] Every UI story has "Verify in browser" in acceptance criteria
- [ ] Acceptance criteria are concrete and verifiable (no vague "works correctly")
- [ ] All `passes` fields are `false`
- [ ] All `notes` fields are empty strings `""`
- [ ] Priority ordering: setup (1–N) → features → verification (last)
- [ ] No story has a lower priority number than a story it depends on

**Before running**
- [ ] `git status` is clean
- [ ] `cp PRDs/{file}.json prd.json` done
- [ ] You know how many iterations to allow (`N stories × 1.5` is a safe estimate)
