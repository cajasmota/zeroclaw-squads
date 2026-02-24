# Types Package Guide — packages/types/

You are working on the **shared TypeScript types** package used by both the backend and frontend.

## Purpose
This package contains TypeScript interfaces and types shared between:
- `apps/backend/` — NestJS backend
- `apps/frontend/` — Next.js frontend

Keep this package lean: only types that are genuinely used on both sides.

## What Goes Here
- Request/response DTO interfaces (the shape data takes over the wire)
- Shared enum values
- Common utility types

## What Does NOT Go Here
- Mongoose schemas (backend-only, stay in `apps/backend/`)
- React components (frontend-only)
- Business logic

## Structure

```
packages/types/
├── AGENTS.md           ← This file
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        ← Re-exports everything
    ├── auth.types.ts   ← User, JWT payload, auth DTOs
    ├── project.types.ts
    ├── agent.types.ts  ← AgentInstance, AgentTemplate, AIEOS
    ├── story.types.ts  ← Epic, Story, Task, Sprint
    ├── workflow.types.ts
    └── common.types.ts ← Pagination, error shapes, etc.
```

## Key Shared Types to Define

```ts
// auth.types.ts
export interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'member';
}

export interface UserDto {
  _id: string;
  tenantId: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  status: 'active' | 'inactive';
  createdAt: string;
}

// agent.types.ts
export type AgentRole = 'librarian' | 'architect' | 'pm' | 'developer' | 'reviewer' | 'tester';
export type AgentStatus = 'idle' | 'busy' | 'error';
export type LlmProvider = 'ollama' | 'openai' | 'anthropic' | 'google';

// story.types.ts
export type StoryType = 'feature' | 'bugfix' | 'refactor' | 'task';
export type StoryStatus = 'backlog' | 'selected' | 'in_progress' | 'review' | 'done';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
```

## Usage
```ts
// In backend:
import type { JwtPayload, AgentRole } from '@aes/types';

// In frontend:
import type { StoryStatus, UserDto } from '@aes/types';
```

## Running
```bash
pnpm --filter=types build    # compile TypeScript
pnpm --filter=types dev      # watch mode
```
