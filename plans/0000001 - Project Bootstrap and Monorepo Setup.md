# 0000001 - Project Bootstrap and Monorepo Setup

**Epic**: EPIC-01: Foundation & Infrastructure
**Assigned To**: Backend Agent, Frontend Agent
**Status**: [x] Completed
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

- [x] Initialize monorepo using pnpm workspaces (or turborepo)
- [x] Scaffold NestJS application in `apps/backend/`
  - [x] Install dependencies: `@nestjs/core`, `@nestjs/common`, `@nestjs/config`, `@nestjs/mongoose`, `mongoose`
  - [x] Configure `ConfigModule` with `.env` loading and `APP_NAME` variable
  - [x] Set up MongoDB connection module using `@nestjs/mongoose`
- [x] Scaffold Next.js App Router application in `apps/frontend/`
  - [x] Install Shadcn UI and initialize it
  - [x] Install `next-themes` for dark/light mode
  - [x] Configure root layout to read `APP_NAME` from env and use as browser title
  - [x] Apply brand colors: Primary `#004176`, Neutral `#8C8C8C`
- [x] Create root `.env.example` with all required variables:
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
- [x] Create shared `packages/types/` for shared TypeScript interfaces
- [x] Configure TypeScript path aliases across workspaces
- [x] Add root `README.md` with setup instructions
- [x] Write unit tests for ConfigModule loading (backend)
- [x] Write unit test that verifies `APP_NAME` resolves correctly from env

---

## Acceptance Criteria

- [x] `pnpm install` at root installs all dependencies without errors
- [x] `pnpm dev` starts both backend (port 3001) and frontend (port 3000)
- [x] Backend connects to MongoDB successfully on startup
- [x] Frontend browser title reflects `APP_NAME` from environment
- [x] Changing `APP_NAME` in `.env` changes the browser title without code changes
- [x] All unit tests pass
- [x] Dark/light theme toggle is functional in the frontend
- [x] TypeScript compiles without errors in all packages

---

## Dependencies
None — this is the first story.

## Notes
- Use pnpm as the package manager throughout the project
- NestJS should use the standard modular architecture (each feature = one module)
- Next.js should use the App Router exclusively (no Pages Router)
