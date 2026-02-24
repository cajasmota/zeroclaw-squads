# AES Implementation Loop

This file contains the prompt for running a Ralph Loop to implement the AES stories.

---

## How to Use

Run the following command from the project root:

```bash
/ralph-loop:ralph-loop "<paste prompt below>" --max-iterations 60
```

---

## Implementation Loop Prompt

````
You are an expert software engineer implementing the Agentic Engineering System (AES).

Your task is to implement user stories from the plans/ folder in this project.

## Context Files You Must Read First
Before starting any implementation:
1. Read plans/INDEX.md - understand all epics, stories, and their current status
2. Read plans/knowledge-base/00-system-overview.md - system architecture
3. Read plans/knowledge-base/02-data-models.md - all data schemas
4. Read plans/knowledge-base/03-technology-stack.md - tech stack
5. Read the specific knowledge-base files referenced in each story before implementing it

## Implementation Rules

### Picking a Story
1. Read plans/INDEX.md and find the lowest-numbered story with status `[ ]` (Not Started)
2. Read that story file completely before writing any code
3. Check all "Depends on:" lines — verify each dependency story is marked `[x]` in its own file
4. If ANY dependency is still `[ ]` or `[~]`, skip this story and pick the next available independent one
5. NEVER start a story that has unmet dependencies

### Starting a Story
1. Update the story file's Status line to `[~]` (In Progress):
   BEFORE: **Status**: [ ] Not Started
   AFTER:  **Status**: [~] In Progress
2. Update plans/INDEX.md: change the story's status cell from `[ ]` to `[~]`
3. COMMIT this status change before writing any implementation code

### Implementing a Story
1. Follow the Actionable Tasks list in order, top to bottom — do NOT skip tasks
2. After completing each individual task, immediately update its checkbox in the story file:
   BEFORE: - [ ] Task description
   AFTER:  - [x] Task description
3. NEVER move on to the next task until the current one is fully complete
4. NEVER move to the next story if ANY checkbox in the current story is still `[ ]`
5. Write tests for every service/component as specified in the tasks — tests are mandatory
6. Follow existing patterns (NestJS modules, Next.js App Router, Shadcn UI)

### Completing a Story
1. Run tests: `pnpm test` in the relevant app directory — ALL tests must pass
2. Verify every Acceptance Criterion in the story is satisfied
3. If any Acceptance Criterion is not met, go back and implement what's missing
4. Only when ALL tasks are checked [x] AND all tests pass AND all AC are met:
   - Update story Status: `[~]` → `[x]` Completed
   - Update plans/INDEX.md: change status cell from `[~]` to `[x]`
5. Commit all implementation + status update together with a descriptive message
6. Then and ONLY THEN pick the next story

### Progress Tracking Rules (STRICTLY ENFORCED)
- The story file is the SINGLE SOURCE OF TRUTH for progress
- Every completed task must be marked [x] in the story file immediately after completion
- plans/INDEX.md must always reflect the correct status of every story
- NEVER mark a story [x] if any task checkbox is still [ ]
- NEVER mark a story [x] if any test is failing
- NEVER mark a story [x] if any Acceptance Criterion is not verified

## CLI-First Scaffolding Rule (SAVES TOKENS)

**Always prefer CLI commands over writing files by hand for scaffolding tasks.**

### NestJS — generate via CLI, never manually scaffold:
```bash
# From apps/backend/ directory:
npx nest generate module {feature}
npx nest generate service {feature}
npx nest generate controller {feature}
# Creates the module folder, files, and wires up imports automatically
```

### Shadcn UI — install components via CLI, never copy/paste:
```bash
# From apps/frontend/ directory (or from root with filter):
pnpm dlx shadcn@latest add button card dialog badge table sheet tabs toast select
# This generates the component file with correct styles automatically
```

### File operations — use shell commands:
```bash
mkdir -p apps/backend/src/{feature}/dto
cp existing-pattern.ts new-feature.ts    # copy as template then edit
mv old-name.ts new-name.ts               # rename files
rm obsolete-file.ts                      # delete files
```

### pnpm workspaces — install dependencies via CLI:
```bash
pnpm --filter=backend add @nestjs/jwt @nestjs/passport passport-jwt bcrypt
pnpm --filter=frontend add @tanstack/react-query zustand react-hook-form zod
```

### Non-Empty Directory Problem (CLI scaffolding rejects existing folders)
Some CLI tools (`nest new`, `create-next-app`, etc.) refuse to scaffold into a non-empty directory.
**Solution: temporarily move AGENTS.md, scaffold, then restore it.**

```bash
# 1. Save AGENTS.md
mv apps/backend/AGENTS.md /tmp/backend-AGENTS.md

# 2. Clear the folder (keep git history intact — only remove files, not .git)
rm -rf apps/backend/*

# 3. Scaffold the app
cd apps && npx @nestjs/cli new backend --package-manager pnpm --skip-git

# 4. Restore AGENTS.md
mv /tmp/backend-AGENTS.md apps/backend/AGENTS.md
```

Apply the same pattern for `apps/frontend/`:
```bash
mv apps/frontend/AGENTS.md /tmp/frontend-AGENTS.md
rm -rf apps/frontend/*
cd apps && npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*"
mv /tmp/frontend-AGENTS.md apps/frontend/AGENTS.md
```

**Why**: The AGENTS.md files contain critical instructions. Losing them during scaffolding breaks subsequent iterations.
**Why**: Manually writing boilerplate consumes 10x more tokens. CLI commands produce correct, idiomatic output in one step.

## Pattern Documentation Rule

**When you implement a pattern you'll reuse, document it immediately.**

After implementing a reusable pattern for the first time:

1. **Update the relevant AGENTS.md file** in that package/app folder with:
   - A code example of the pattern
   - When to use it
   - Any gotchas

2. **Update `plans/knowledge-base/10-code-patterns.md`** with the canonical template

3. **If it's a cross-cutting rule** (affects all packages), add it to root `CLAUDE.md`

Examples of patterns to document:
- New NestJS guard, interceptor, or decorator you create and reuse
- New Next.js hook or context pattern
- New Mongoose query pattern for a complex operation
- New Shadcn component composition pattern used in multiple places

Format for pattern entries in AGENTS.md / 10-code-patterns.md:
```markdown
### Pattern Name
**When to use**: Brief description of the use case
**File**: Path to the canonical implementation
(code example here)
```

## Technology Conventions
- Package manager: pnpm (workspaces)
- Backend: NestJS with @nestjs/mongoose, @nestjs/config — each feature = one NestJS module
- Frontend: Next.js App Router, Shadcn UI, next-themes
- Database: MongoDB via Mongoose — ALL queries must include tenantId filter
- Tests: Jest for backend, React Testing Library for frontend
- All API routes require JWT auth guard unless explicitly marked as public
- Agent Slack messages MUST use username + icon_url impersonation (not the bot's default name)

## Working Directory Structure
- apps/backend/     — NestJS backend
- apps/frontend/    — Next.js frontend
- packages/types/   — Shared TypeScript types
- plans/            — User stories and knowledge base (only update status/checkboxes, no other changes)
- scripts/          — Shell scripts
- docs/             — Configuration guides (GitHub App, Slack App)

## Story Status Format
```text
**Status**: [ ] Not Started    ← not yet picked up
**Status**: [~] In Progress    ← currently being implemented
**Status**: [x] Completed      ← all tasks done, all tests pass, all AC verified
```

## Starting Point
1. Read plans/INDEX.md
2. Find the first story with `[ ]` that has all dependencies at `[x]`
3. Start implementing it following the rules above
4. After completing it, return to INDEX.md and repeat

Continue until all 28 stories are marked `[x]` in INDEX.md, then output:
LOOP COMPLETE - All 28 AES stories implemented and verified.
````

---

## Notes

- The loop implements one story per iteration (or continues an in-progress one)
- Stories are numbered in dependency order — lower numbers generally must come before higher ones
- The loop will skip stories with unmet dependencies and pick the next available one
- Estimated iterations: 30-50 (some stories span multiple loop turns due to complexity)
- Set `--max-iterations` to at least 60 to allow for complex stories needing multiple turns
- The strict checkbox-before-moving rule prevents partial implementations that break dependent stories
