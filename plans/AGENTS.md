# AES Implementation Agent Guide

This document is for AI agents implementing AES user stories. Read it fully before writing any code.

---

## 1. What You Are Building

The **Agentic Engineering System (AES)** is a platform where AI agents (powered by ZeroClaw) autonomously develop software. You are building the platform itself — the NestJS backend, Next.js frontend, MongoDB schemas, and integrations.

**You are NOT building an AI agent. You are building the system that runs them.**

---

## 2. How to Work (Story Protocol)

### Before Every Session
```
1. Read plans/INDEX.md → find lowest-numbered story with [ ] and all dependencies at [x]
2. Read that story file completely
3. Read all knowledge-base files listed in the story's "Knowledge Base:" header
4. Read CLAUDE.md at root for project-wide rules
```

### Executing a Story
```
1. Mark story as [~] In Progress in both the story file and INDEX.md
2. Commit that status change: git commit -m "chore: start story NNNNNNN"
3. Implement tasks TOP TO BOTTOM — do not reorder or skip
4. After EACH task: mark it [x] in the story file immediately
5. Run tests after each logical group of tasks
6. When ALL tasks are [x] AND all tests pass AND all AC verified:
   - Mark story [x] Completed in story file
   - Mark [x] in INDEX.md
   - Commit: git commit -m "feat(NNNNNNN): <title>"
7. Then and ONLY THEN pick the next story
```

### If Blocked
- If a dependency story is not done: skip to next independent story
- If something is unclear: check the relevant knowledge-base file first
- If still unclear: add a comment in the story file and implement the most reasonable interpretation

---

## 3. Monorepo Structure

```
squads-v2/
├── CLAUDE.md                    ← Claude Code auto-loads this
├── plans/
│   ├── INDEX.md                 ← Backlog / story tracker
│   ├── AGENTS.md                ← This file
│   ├── LOOP.md                  ← Ralph Loop implementation prompt
│   ├── knowledge-base/          ← Reference docs
│   └── 0000001 - *.md           ← Individual user stories
├── apps/
│   ├── backend/                 ← NestJS application
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       └── {feature}/       ← One folder per NestJS module
│   │           ├── {feature}.module.ts
│   │           ├── {feature}.service.ts
│   │           ├── {feature}.controller.ts
│   │           ├── {feature}.schema.ts
│   │           ├── dto/
│   │           └── {feature}.service.spec.ts
│   └── frontend/                ← Next.js App Router application
│       └── app/
│           ├── layout.tsx        ← Root layout (ThemeProvider)
│           ├── login/page.tsx    ← Public (only public page — no /register)
│           ├── api/auth/         ← Auth proxy API routes
│           └── (authenticated)/  ← All protected pages
│               ├── layout.tsx    ← App shell (sidebar + nav)
│               ├── projects/
│               ├── templates/
│               └── settings/
├── packages/
│   └── types/                   ← Shared TypeScript interfaces
├── scripts/
│   └── setup-aes.sh
└── docs/
    ├── github-app-setup.md
    └── slack-app-setup.md
```

---

## 4. NestJS Backend Conventions

### Module Structure (every feature follows this pattern)
```
src/
└── projects/
    ├── projects.module.ts
    ├── projects.service.ts
    ├── projects.controller.ts
    ├── project.schema.ts
    ├── dto/
    │   ├── create-project.dto.ts
    │   └── update-project.dto.ts
    └── projects.service.spec.ts
```

### Key Rules
- **One feature = one NestJS module**
- **tenantId MUST be in every Mongoose query** (see patterns in `knowledge-base/10-code-patterns.md`)
- Use `class-validator` DTOs for all request body validation
- Throw NestJS built-in exceptions: `NotFoundException`, `BadRequestException`, `UnauthorizedException`, `ForbiddenException`
- Use `@nestjs/event-emitter` for cross-module events (don't import modules into each other for side effects)
- All sensitive data (API keys, passwords, tokens) encrypted with AES-256 before MongoDB storage

### Global Setup (AppModule)
```ts
// Apply globally:
JwtAuthGuard            → APP_GUARD provider
TenantMiddleware        → NestModule.configure()
ValidationPipe          → APP_PIPE (whitelist: true, transform: true)
```

### Testing Pattern
- Unit tests: `{feature}.service.spec.ts` — mock Mongoose models with `jest.fn()`
- Test file co-located with the service it tests
- All public service methods must have tests

---

## 5. Next.js Frontend Conventions

### Page Structure
```ts
// Protected page at /projects
// File: apps/frontend/app/(authenticated)/projects/page.tsx
export default function ProjectsPage() {
  // Use React Query or SWR for data fetching
  // Use Shadcn UI components throughout
}
```

### Key Rules
- **App Router only** — no `getServerSideProps`, no `pages/` directory
- **Shadcn UI** for all components — install via `pnpm dlx shadcn@latest add {component}`
- Data fetching: use `fetch()` in Server Components or React Query in Client Components
- Forms: React Hook Form + Zod validation
- State: Zustand for global client state, React Query for server state
- Always use `'use client'` directive only when needed (minimize client components)

### API Communication
All API calls go through `/api/` Next.js proxy routes (handles auth cookie forwarding):
```ts
// NOT: fetch('http://localhost:3001/projects')
// YES: fetch('/api/projects')  ← proxied to backend with auth header
```

Create a base API client: `apps/frontend/lib/api/client.ts` that reads the JWT from cookie and adds Authorization header automatically.

---

## 6. MongoDB / Mongoose Conventions

### Schema Template
```ts
// Always include tenantId. Always use timestamps.
@Schema({ timestamps: true })
export class Project extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  // Sensitive fields: encrypt before save, never return raw
  @Prop()
  encryptedApiKey: string;
}
```

### Query Pattern (always scope to tenantId)
```ts
// CORRECT
async findAll(tenantId: Types.ObjectId) {
  return this.projectModel.find({ tenantId }).exec();
}

// WRONG — missing tenantId filter
async findAll() {
  return this.projectModel.find().exec(); // ← Security violation
}
```

### Encryption Pattern
```ts
// Use AES256EncryptionService for ALL sensitive strings
const encrypted = this.encryption.encrypt(rawApiKey);
await this.model.create({ encryptedApiKey: encrypted });

// Decrypt only when needed for use (never return decrypted to API responses)
const raw = this.encryption.decrypt(doc.encryptedApiKey);
```

---

## 7. Authentication Summary

**Backend** (story 0000002):
- `POST /auth/login` — validates email/password, returns JWT (httpOnly cookie)
- `POST /users` — admin-only, creates new users (no public registration)
- JWT payload: `{ userId, tenantId, email, role }`
- All routes protected by `JwtAuthGuard` unless decorated with `@Public()`
- `@CurrentUser()` decorator extracts user from request
- `@AdminOnly()` decorator enforces admin role check
- Default `Tenant` and admin `User` seeded at startup from env vars

**Frontend** (story 0000024):
- Login page at `/login` only — **no public `/register` page**
- Admin can create users at `/settings/users` (authenticated route)
- JWT stored in httpOnly cookie via Next.js API proxy routes
- `middleware.ts` protects all routes — redirects to `/login` if no valid JWT
- `useAuth()` hook for client-side user state
- Auth library: `jose` for Edge-compatible JWT verification in middleware

---

## 8. ZeroClaw Integration

**ZeroClaw is an existing binary — do NOT build from scratch.**

```bash
# ZeroClaw is installed on the VPS by setup-aes.sh (story 0000022)
# Path stored in: ZEROCLAW_BINARY_PATH env var
```

### Spawning an Agent
```ts
// NestJS ZeroClawProcessManagerService (story 0000009)
const process = spawn(ZEROCLAW_BINARY_PATH, ['daemon'], {
  cwd: agentInstance.workspacePath,
  env: {
    AES_PROJECT_ID: project._id.toString(),
    AES_STORY_ID: story._id.toString(),
    AES_RUN_ID: runId,
    OPENAI_API_KEY: resolvedKeys.openai,      // from GlobalSettingsService.resolveLlmKeys()
    ANTHROPIC_API_KEY: resolvedKeys.anthropic,
    OLLAMA_ENDPOINT: resolvedKeys.ollamaEndpoint,
  },
});
// Store PID in AgentInstance.pid
// Capture stdout/stderr streams → StreamAggregatorService
```

### Waking an Agent (SIGUSR1)
```ts
process.kill(agentInstance.pid, 'SIGUSR1');
// Then inject context via stdin:
agentProcess.stdin.write(`USER_MESSAGE: ${message}\n`);
```

### Files Generated Before Spawn
```
{workspacePath}/
├── zeroclaw.config.toml   ← ZeroClawConfigTomlGenerator (story 0000010)
├── identity.json          ← AIEOS v1.1 JSON (story 0000010)
└── soul.md                ← Copied from AgentInstance.soul
```

### ZeroClaw Daemon Spawn Command
```ts
// Only --host and --port are valid daemon flags. All other config comes from config.toml.
spawn(ZEROCLAW_BINARY_PATH, ['daemon', '--host', '127.0.0.1', '--port', String(gatewayPort)], {
  cwd: workspacePath,   // ← ZeroClaw reads zeroclaw.config.toml from this directory
  env: { AES_PROJECT_ID, AES_STORY_ID, AES_RUN_ID, OPENAI_API_KEY, ... }
})
// There is NO --session, --soul, --identity, or --config flag.
```

### ZeroClaw Actual Output Files (not what the PRD says)
| PRD reference | Actual ZeroClaw file | Purpose |
|---|---|---|
| `usage.json` | `state/costs.jsonl` | LLM cost/token records |
| `transcript.jsonl` | `state/runtime-trace.jsonl` | Tool calls and model replies |
| `session.jsonl` | `memory/brain.db` | SQLite persistent memory (auto-loaded) |

---

## 9. Slack Agent Impersonation (MANDATORY)

Every Slack message from an agent MUST use:
```ts
await slackClient.chat.postMessage({
  channel: channelId,
  text: message,
  username: `${agent.displayName} · ${agent.role}`,  // e.g., "R2-D2 · Developer"
  icon_url: avatarService.generateAvatarUrl(agent, project.brandColor),
});
```

**Required Slack App scope**: `chat:write.customize`

For A2A messages:
```ts
text: `[A2A] ${fromEmoji} ${from.displayName} → ${toEmoji} ${to.displayName}: ${message}`
```

Role emojis: `📚 librarian`, `🏗️ architect`, `📋 pm`, `💻 developer`, `🔍 reviewer`, `🧪 tester`

---

## 10. Event-Driven Communication (NestJS Events)

Use `@nestjs/event-emitter` for cross-module coordination:

```ts
// Emitting
this.eventEmitter.emit('project.created', { projectId, tenantId });

// Listening
@OnEvent('project.created')
async handleProjectCreated(payload: { projectId, tenantId }) { ... }
```

Key events:
| Event | Emitter | Listener |
|-------|---------|---------|
| `project.created` | ProjectsService | ProjectInitializerService |
| `agents.spawn.all` | ProjectInitializerService | ZeroClawProcessManagerService |
| `sprint.ready` | StoriesService | DevelopmentOrchestrationService |
| `story.assigned` | DevelopmentOrchestrationService | SlackService |
| `librarian.reindex` | GitHubWebhookController | LibrarianIndexerService |
| `workflow.approval_needed` | WorkflowNodeExecutorService | WebSocket Gateway |

---

## 11. WebSocket Real-Time Events

Backend emits via `AesGateway` (@WebSocketGateway):
```ts
this.aesGateway.emitToProject(projectId, 'agent:log', {
  agentInstanceId, line, runId, ticketId, timestamp
});
```

Frontend subscribes:
```ts
const socket = io('/ws', { auth: { token: jwt } });
socket.emit('join-project', projectId);
socket.on('agent:log', (data) => { /* update live logs */ });
socket.on('story:status', (data) => { /* update kanban */ });
```

Key event types: `agent:log`, `agent:status`, `story:status`, `workflow:node`, `ticket:comment`, `approval:needed`

---

## 12. Git Branching Convention

- Feature branches: `feature/{storyId}` (e.g., `feature/507f1f77bcf86cd799439011`)
- Each agent uses its own workspace clone — no shared working trees
- PRs created via GitHub MCP (API), commits via local Git CLI

---

## 13. Testing Requirements

Every story requires tests. No exceptions. Test with:

```bash
# Backend tests
pnpm --filter=backend test
pnpm --filter=backend test:cov   # with coverage

# Frontend tests
pnpm --filter=frontend test
```

**Backend unit test template:**
```ts
describe('ProjectsService', () => {
  let service: ProjectsService;
  let model: Model<Project>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getModelToken(Project.name), useValue: mockModel },
      ],
    }).compile();
    service = module.get(ProjectsService);
  });

  it('should find all projects for tenant', async () => {
    mockModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([mockProject]) });
    const result = await service.findAll(tenantId);
    expect(mockModel.find).toHaveBeenCalledWith({ tenantId });
  });
});
```

---

## 14. Common Pitfalls — Avoid These

| Pitfall | Correct Approach |
|---------|-----------------|
| Forgetting `tenantId` in Mongoose query | Always include `{ tenantId }` in every `.find()`, `.findOne()`, `.findOneAndUpdate()` |
| Returning `passwordHash` in API response | Use `select('-passwordHash')` or schema `transform` to exclude it |
| Storing API key as plain text | Always encrypt with `AES256EncryptionService` before saving |
| Importing a module into another for side effects | Use `EventEmitter` events instead |
| Using `npm` or `yarn` | Always use `pnpm` |
| Creating pages outside `(authenticated)/` | All pages except `/login` go under the authenticated route group — no `/register` page |
| Posting to Slack without `username`/`icon_url` | Every agent Slack post MUST include agent identity fields |
| Making API calls directly to `localhost:3001` from frontend | Use `/api/` proxy routes instead |
| Marking story `[x]` with pending tasks | ALL tasks must be `[x]` before marking story complete |

---

## 15. Useful Commands

```bash
# Generate new NestJS module (from apps/backend/)
pnpm nest generate module {feature}
pnpm nest generate service {feature}
pnpm nest generate controller {feature}

# Add Shadcn component (from apps/frontend/)
pnpm dlx shadcn@latest add button card dialog badge table

# Run specific test file
pnpm --filter=backend test -- --testPathPattern=projects.service

# Check TypeScript errors
pnpm --filter=backend tsc --noEmit
pnpm --filter=frontend tsc --noEmit

# MongoDB shell (local)
mongosh mongodb://localhost:27017/aes
```
