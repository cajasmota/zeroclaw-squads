# 0000001 - Project Bootstrap and Monorepo Setup

**Epic**: EPIC-01: Foundation & Infrastructure
**Assigned To**: Backend Agent, Frontend Agent
**Status**: [~] In Progress
**PRD Reference**: PRD.md §14 (Technology Stack Summary), §12.1 (Setup Script)
**Knowledge Base**: `knowledge-base/03-technology-stack.md`, `knowledge-base/00-system-overview.md`

---

## Title
Initialize monorepo with NestJS backend and Next.js frontend

## Description
Set up the foundational monorepo structure containing:
- A **NestJS** backend application (control plane)
- A **Next.js** (App Router) frontend application
- Shared TypeScript configuration
- MongoDB connection baseline
- Environment variable structure with `APP_NAME` branding support

This is the first story and all subsequent stories depend on it.

## Context
The AES system is built as a full-stack TypeScript monorepo. The backend (NestJS) acts as the control plane managing agent lifecycles, Slack routing, and GitHub webhooks. The frontend (Next.js App Router) provides the management UI. Both share MongoDB 8.0 as the primary database.

The `APP_NAME` environment variable must propagate to all surfaces (installer, Web UI browser title, headers, Slack/GitHub messages).

---

## Actionable Tasks

- [ ] Initialize monorepo using pnpm workspaces (or turborepo)
- [ ] Scaffold NestJS application in `apps/backend/`
  - [ ] Install dependencies: `@nestjs/core`, `@nestjs/common`, `@nestjs/config`, `@nestjs/mongoose`, `mongoose`
  - [ ] Configure `ConfigModule` with `.env` loading and `APP_NAME` variable
  - [ ] Set up MongoDB connection module using `@nestjs/mongoose`
- [ ] Scaffold Next.js App Router application in `apps/frontend/`
  - [ ] Install Shadcn UI and initialize it
  - [ ] Install `next-themes` for dark/light mode
  - [ ] Configure root layout to read `APP_NAME` from env and use as browser title
  - [ ] Apply brand colors: Primary `#004176`, Neutral `#8C8C8C`
- [ ] Create root `.env.example` with all required variables:
  - `APP_NAME`
  - `NEXT_PUBLIC_APP_NAME`
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `AES_ENCRYPTION_KEY`
  - `ZEROCLAW_BINARY_PATH`
  - `ARTIFACTS_ROOT`
  - `OLLAMA_ENDPOINT`
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - `BACKEND_PORT`
  - `FRONTEND_PORT`
  - `BACKEND_URL`
  - `NEXT_PUBLIC_BACKEND_WS_URL`
- [ ] Create shared `packages/types/` for shared TypeScript interfaces
- [ ] Configure TypeScript path aliases across workspaces
- [ ] Add root `README.md` with setup instructions
- [ ] Write unit tests for ConfigModule loading (backend)
- [ ] Write unit test that verifies `APP_NAME` resolves correctly from env

---

## Acceptance Criteria

- [ ] `pnpm install` at root installs all dependencies without errors
- [ ] `pnpm dev` starts both backend (port 3001) and frontend (port 3000)
- [ ] Backend connects to MongoDB successfully on startup
- [ ] Frontend browser title reflects `APP_NAME` from environment
- [ ] Changing `APP_NAME` in `.env` changes the browser title without code changes
- [ ] All unit tests pass
- [ ] Dark/light theme toggle is functional in the frontend
- [ ] TypeScript compiles without errors in all packages

---

## Dependencies
None — this is the first story.

## Notes
- Use pnpm as the package manager throughout the project
- NestJS should use the standard modular architecture (each feature = one module)
- Next.js should use the App Router exclusively (no Pages Router)
