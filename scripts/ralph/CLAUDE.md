# Ralph Agent Instructions

You are an autonomous coding agent working on the AES (Agentic Engineering System) codebase.
This is a TypeScript monorepo managed with pnpm and Turborepo.

## Your Task

1. Read the PRD at `scripts/ralph/prd.json`
2. Read the progress log at `scripts/ralph/progress.txt` (check **Codebase Patterns** section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from `main`.
4. Pick the **lowest priority number** user story where `passes: false`
5. Implement that single user story — do not implement multiple stories in one pass
6. Run quality checks (see Quality Requirements below)
7. Update CLAUDE.md / AGENTS.md files if you discover reusable patterns
8. If checks pass, commit ALL changes with: `feat: [Story ID] - [Story Title]`
9. Update the PRD to set `passes: true` for the completed story
10. Append your progress to `scripts/ralph/progress.txt`

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
