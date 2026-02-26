# Ralph Agent Instructions

You are an autonomous coding agent working on the AES (Agentic Engineering System) codebase.
This is a TypeScript monorepo managed with pnpm and Turborepo.

## ⚠️ CRITICAL RULES — READ BEFORE ANYTHING ELSE

1. **ONE story per iteration. Exactly one. No more.**
   - Implement the single highest-priority (`passes: false`) story, then STOP.
   - Do NOT start, peek at, or partially implement any other story.
   - Do NOT continue to the next story even if the current one was trivial.

2. **You MUST APPEND to `scripts/ralph/progress.txt` before ending.**
   - This is not optional. Every iteration MUST leave a log entry.
   - If you write nothing to progress.txt, the next iteration has no memory of what you did.

3. **End your response after writing the progress log.**
   - Once you have: committed ✓, updated prd.json ✓, written progress.txt ✓ — stop.
   - The loop script will spawn a fresh instance for the next story.

4. **Never ask questions. You are running non-interactively — there is no human to answer.**
   - If something is ambiguous, make the most conservative reasonable decision and document it in `progress.txt` under a `**Decisions made:**` heading.
   - If you hit a blocker you truly cannot resolve (e.g. a missing secret, a broken dependency), set `passes: false` and add a `"notes"` field to that story in `prd.json` explaining exactly what is needed, then write to `progress.txt` and stop. The human will read it before the next run.
   - Do NOT output questions, do NOT stall, do NOT produce partial work while waiting for input.

---

## Your Exact Steps This Iteration

1. Read `scripts/ralph/prd.json`
2. Read `scripts/ralph/progress.txt` — check the **Codebase Patterns** section first
3. Verify you are on the branch in PRD `branchName`. If not, check it out or create it from `main`.
4. Find the **lowest `priority` number** story where `passes: false` — that is your ONE story for this iteration
5. Implement that story completely
6. Run quality checks (see below) — fix any errors before continuing
7. If checks pass, commit ALL changes: `feat: [Story ID] - [Story Title]`
8. In `scripts/ralph/prd.json` set `passes: true` for that story
9. **MANDATORY: Append your progress entry to `scripts/ralph/progress.txt`** (see format below)
10. Check if ALL stories now have `passes: true` — if so output `<promise>COMPLETE</promise>`, otherwise end your response here

## Project Structure

```
squads-v2/
├── apps/
│   ├── backend/          ← NestJS API (port 3001)
│   └── frontend/         ← Next.js App Router (port 3000)
├── packages/
│   └── types/            ← Shared TypeScript interfaces
├── plans/
│   ├── INDEX.md          ← Story backlog tracker
│   ├── AGENTS.md         ← Implementation conventions (READ THIS)
│   └── knowledge-base/   ← Architecture and design docs
├── PRDs/                 ← PRD JSON files (source of truth)
└── scripts/ralph/        ← Ralph loop files (this directory)
```

## Key Conventions (from plans/AGENTS.md)

- **Package manager**: `pnpm` — always use `pnpm --filter=frontend` or `pnpm --filter=backend`
- **API calls**: Always through `/api/` Next.js proxy routes — never call backend port directly
- **Auth**: httpOnly JWT cookie — read by proxy routes server-side
- **tenantId**: Every Mongoose query MUST include `tenantId`
- **Encryption**: All sensitive fields (API keys, tokens) must be AES-256 encrypted before MongoDB write
- **UI**: Shadcn UI only — `pnpm dlx shadcn@latest add <component>`
- **Data fetching**: `apiGet`/`apiPost`/`apiPatch`/`apiDelete` from `lib/api/client.ts` + `useState`/`useEffect`

## Quality Requirements

Run after every story implementation:

```bash
# Frontend
pnpm --filter=frontend tsc --noEmit

# Backend
pnpm --filter=backend tsc --noEmit

# Tests (run whichever is relevant to what you changed)
pnpm --filter=frontend test
pnpm --filter=backend test
```

ALL checks must pass before committing. Do NOT commit broken code.

## Progress Report Format

APPEND to `scripts/ralph/progress.txt` (never replace):

```
## [Date/Time] - [Story ID] - [Story Title]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas
  - Useful context
---
```

## Consolidate Patterns

If you discover a **reusable pattern**, add it to the `## Codebase Patterns` section at the TOP of `scripts/ralph/progress.txt`. Examples:

```
## Codebase Patterns
- lib/api/client.ts exports apiGet/apiPost/apiPatch/apiDelete — import from there, not axios
- app/api/ proxy routes use getAuth(req) helper to read accessToken cookie
- Backend schema sensitive fields: always encrypt with Aes256EncryptionService before saving
- Every Mongoose query in backend must scope to { tenantId }
```

## Update AGENTS.md Files

Before committing, check if any edited files have learnings worth preserving:
- `plans/AGENTS.md` — project-wide conventions
- `apps/backend/AGENTS.md` — backend-specific patterns
- `apps/frontend/AGENTS.md` — frontend-specific patterns

Only add **genuinely reusable knowledge** — not story-specific details.

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete:
<promise>COMPLETE</promise>

If stories remain with `passes: false`, end your response normally — the next iteration will continue.

## Important

- Work on ONE story per iteration
- Commit after each story
- Keep both `pnpm --filter=frontend tsc --noEmit` and `pnpm --filter=backend tsc --noEmit` green
- Read `plans/AGENTS.md` and the relevant `knowledge-base/` files before implementing any story
