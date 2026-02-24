# AES — Claude Code Rules

## Project
**Agentic Engineering System (AES)**: autonomous software development environment using specialized AI agents (ZeroClaw runtime + NestJS backend + Next.js frontend + MongoDB).

## Stack
- **Backend**: NestJS (Node.js) in `apps/backend/`
- **Frontend**: Next.js App Router + Shadcn UI in `apps/frontend/`
- **Database**: MongoDB 8.0 via Mongoose
- **Agent Runtime**: ZeroClaw (existing Rust binary — do NOT reimplement)
- **Package Manager**: pnpm workspaces (always use pnpm, never npm/yarn)
- **Shared Types**: `packages/types/`

## Authentication
Simple **MongoDB-based auth** — no Firebase, no OAuth providers.
- Users stored in MongoDB `users` collection (email + bcrypt-hashed password)
- Login: `POST /auth/login` → returns JWT
- JWT contains: `{ userId, tenantId, email }`
- Protected routes use `JwtAuthGuard`
- Frontend stores JWT in an httpOnly cookie

## Story-Driven Development
All work is tracked in `plans/`. Before coding anything:
1. Read `plans/INDEX.md` — find the current story
2. Read the story file completely
3. Read referenced knowledge-base files
4. Update story status to `[~]` before starting
5. Check off each task `[ ]` → `[x]` as completed — NEVER skip ahead
6. Mark `[x]` Completed in both the story file AND `plans/INDEX.md` only when ALL tasks and tests pass

**Never move to the next story while any task checkbox is still `[ ]`.**

## Critical Invariants — ALWAYS enforce

### Backend (NestJS)
- Every Mongoose query MUST include `tenantId` filter — no exceptions
- Sensitive fields (API keys, tokens, private keys) MUST be AES-256 encrypted before MongoDB storage
- Passwords MUST be hashed with bcrypt (min 12 rounds) — never stored plain
- Every module lives in its own folder under `apps/backend/src/`
- All routes require `JwtAuthGuard` unless explicitly marked `@Public()`
- Every service method must have a unit test

### Frontend (Next.js)
- Use App Router exclusively — no Pages Router
- All pages live under `apps/frontend/app/(authenticated)/` (except `/login` and `/register`)
- Use Shadcn UI components — do not install alternative UI libraries
- Theme via `next-themes` — use `dark:` Tailwind classes for theming
- JWT stored in httpOnly cookie (set by backend on login, cleared on logout)

### Slack Messaging — MANDATORY
Every agent Slack message MUST use impersonation fields:
```ts
{ username: agent.displayName, icon_url: avatarUrl }
```
Never post as the generic bot. See `plans/knowledge-base/05-communication-protocols.md`.

### ZeroClaw
- ZeroClaw is an installed binary, NOT built from source
- Binary path from env: `ZEROCLAW_BINARY_PATH`
- Config generated per-agent as `{workspacePath}/zeroclaw.config.toml`
- LLM keys injected as env vars at spawn — never written to disk

## Environment Variables (required in `.env`)
```
APP_NAME=AES
MONGODB_URI=mongodb://localhost:27017/aes
JWT_SECRET=<generated 32+ char random>
JWT_EXPIRES_IN=7d
AES_ENCRYPTION_KEY=<32-byte hex>
ZEROCLAW_BINARY_PATH=/usr/local/bin/zeroclaw
ARTIFACTS_ROOT=/artifacts
OLLAMA_ENDPOINT=http://localhost:11434
```

## Commands
```bash
pnpm install                    # install all dependencies
pnpm dev                        # start backend + frontend (turbo)
pnpm test                       # run all tests
pnpm --filter=backend test      # backend tests only
pnpm --filter=frontend test     # frontend tests only
pnpm build                      # production build
```

## Key Reference Files
| File | Purpose |
|------|---------|
| `plans/INDEX.md` | Backlog — all stories and status |
| `plans/AGENTS.md` | Detailed implementation guide and code patterns |
| `plans/knowledge-base/02-data-models.md` | All MongoDB schemas |
| `plans/knowledge-base/04-agent-roles.md` | Agent roles and permissions |
| `plans/knowledge-base/05-communication-protocols.md` | SIGUSR1, Slack, GitHub webhooks |
| `plans/knowledge-base/09-zeroclaw-integration.md` | ZeroClaw config.toml and spawn |
| `plans/knowledge-base/10-code-patterns.md` | NestJS and Next.js code templates |
