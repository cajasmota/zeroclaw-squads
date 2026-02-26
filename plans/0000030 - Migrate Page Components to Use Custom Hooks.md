# 0000030 - Drop TanStack Query and Axios — Migrate to Plain Fetch via app/api/ Proxy Routes

**Epic**: EPIC-10: UI - Project Control Center  
**Assigned To**: Frontend Agent  
**Status**: [ ] Not Started  
**PRD Reference**: PRDs/0000030-migrate-page-components-to-custom-hooks.json  
**Knowledge Base**: `knowledge-base/03-technology-stack.md`, `knowledge-base/08-ui-design-system.md`

---

## Title
Remove TanStack Query and Axios; replace all data-fetching in page components with plain `fetch()` through the existing `app/api/` Next.js proxy routes

## Decision

Story 0000029 introduced TanStack Query v5 + Axios as the data-fetching layer. On reflection, this
adds significant complexity (dependency installation, `QueryClientProvider`, query keys, cache
invalidation, custom hooks boilerplate) without a clear benefit over the simpler pattern the project
already supports: **plain `fetch()` through the `app/api/` Next.js proxy routes**.

The `app/api/` route handlers already exist and handle all the concerns TanStack was solving:
- Auth token forwarding (reads `accessToken` httpOnly cookie server-side)
- Backend URL abstraction
- Request proxying with proper headers

The `lib/api/client.ts` file already defines a typed fetch wrapper (`apiGet`, `apiPost`, `apiPatch`,
`apiDelete`) that calls these proxy routes. This is the canonical pattern from `AGENTS.md §5`.

**This story removes TanStack Query and Axios entirely and migrates all pages back to the
`lib/api/client.ts` pattern with plain `fetch()` + React `useState`/`useEffect`.**

---

## What the `app/api/` Proxy Routes Provide

These Next.js server-side route handlers already exist and must NOT be changed — they are the API
layer. Client code calls them via `fetch('/api/...')`:

| Route | Methods |
|---|---|
| `app/api/projects/route.ts` | GET, POST |
| `app/api/projects/[id]/route.ts` | GET, PATCH |
| `app/api/projects/[id]/agents/route.ts` | GET |
| `app/api/projects/[id]/agents/[agentId]/route.ts` | PATCH |
| `app/api/projects/[id]/stories/route.ts` | GET, POST |
| `app/api/projects/[id]/stories/[storyId]/route.ts` | PATCH |
| `app/api/projects/[id]/stories/[storyId]/tasks/route.ts` | GET, POST |
| `app/api/projects/[id]/stories/[storyId]/tasks/[taskId]/route.ts` | PATCH |
| `app/api/projects/[id]/stories/[storyId]/comments/route.ts` | GET, POST |
| `app/api/projects/[id]/stories/[storyId]/approve/route.ts` | POST |
| `app/api/projects/[id]/stories/[storyId]/answer/route.ts` | POST |
| `app/api/projects/[id]/epics/route.ts` | GET, POST |
| `app/api/projects/[id]/sprints/route.ts` | GET, POST |
| `app/api/projects/[id]/sprints/[sprintId]/ready/route.ts` | POST |
| `app/api/projects/[id]/requirements/route.ts` | GET, POST |
| `app/api/projects/[id]/requirements/[docId]/route.ts` | PATCH |
| `app/api/projects/[id]/analytics/route.ts` | GET |
| `app/api/projects/[id]/workflows/route.ts` | GET, POST |
| `app/api/projects/[id]/agents/[agentId]/sync/route.ts` | POST |
| `app/api/templates/route.ts` | GET, POST |
| `app/api/templates/[id]/route.ts` | PATCH |
| `app/api/users/route.ts` | GET, POST |
| `app/api/users/[id]/route.ts` | PATCH |
| `app/api/models/route.ts` | GET, POST, PATCH, DELETE |
| `app/api/workflows/templates/route.ts` | GET, POST |

---

## Target Pattern

```ts
// lib/api/client.ts — plain fetch wrappers (already exist, may need minor update)
export async function apiGet<T>(path: string): Promise<T> { ... }
export async function apiPost<T>(path: string, body?: unknown): Promise<T> { ... }
export async function apiPatch<T>(path: string, body?: unknown): Promise<T> { ... }
export async function apiDelete<T>(path: string): Promise<T> { ... }

// In a page component — data loading with useState + useEffect
const [projects, setProjects] = useState<Project[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  apiGet<Project[]>('/api/projects').then(setProjects).finally(() => setLoading(false));
}, []);

// Mutations — direct async calls in event handlers
async function handleCreate(payload: object) {
  const created = await apiPost<Project>('/api/projects', payload);
  setProjects(prev => [...prev, created]);
}
```

---

## Affected Files — Current State

| File | Current data-fetching | Action |
|---|---|---|
| `app/(authenticated)/projects/page.tsx` | `useQuery`/`useMutation` + `axiosGet`/`axiosPost` | Migrate to `apiGet`/`apiPost` + `useState`/`useEffect` |
| `app/(authenticated)/templates/page.tsx` | `useQuery`/`useMutation` + `axiosGet`/`axiosPost`/`axiosPatch` | Migrate to `apiGet`/`apiPost`/`apiPatch` |
| `app/(authenticated)/projects/[id]/page.tsx` | `useQuery`/`useMutation` + `axiosGet`/`axiosPost`/`axiosPatch` | Migrate all 8 tab components |
| `app/(authenticated)/projects/[id]/blueprints/page.tsx` | `useQuery` + `axiosGet` + `apiPost` from `lib/api/client` | Migrate `useQuery` calls to `useEffect`, `apiPost` already correct |
| `app/(authenticated)/settings/users/page.tsx` | TanStack hooks via `hooks/useUsers.ts` | Migrate to `apiGet`/`apiPost`/`apiPatch` inline |
| `app/(authenticated)/settings/models/page.tsx` | TanStack hooks via `hooks/useModels.ts` | Migrate to `apiGet`/`apiPost`/`apiPatch`/`apiDelete` inline |
| `app/(authenticated)/layout.tsx` | `QueryClientProvider` wraps children | Remove `QueryClientProvider` and `ReactQueryDevtools` |
| `hooks/` directory | All hooks use `useQuery`/`useMutation` from TanStack | Delete all hook files that only exist to wrap TanStack |
| `lib/api/axios.ts` | Axios instance + helpers | Delete |
| `lib/api/query-keys.ts` | TanStack query key constants | Delete |
| `lib/api/client.ts` | Already wraps axios — rewrite to use plain `fetch` | Rewrite to call `fetch('/api/...')` directly |

---

## Actionable Tasks

### Phase 0 — Audit and create missing `app/api/` proxy routes

Before migrating any page component, audit every API call that will be made and confirm
the corresponding `app/api/` route handler exists. Create any that are missing.

The following routes are **already confirmed to exist** (verified as of story creation):

```
app/api/projects/route.ts                                           GET, POST
app/api/projects/[id]/route.ts                                      GET, PATCH
app/api/projects/[id]/agents/route.ts                               GET
app/api/projects/[id]/agents/[agentId]/route.ts                     PATCH
app/api/projects/[id]/agents/[agentId]/sync/route.ts                POST
app/api/projects/[id]/stories/route.ts                              GET, POST
app/api/projects/[id]/stories/[storyId]/route.ts                    PATCH
app/api/projects/[id]/stories/[storyId]/tasks/route.ts              GET, POST
app/api/projects/[id]/stories/[storyId]/tasks/[taskId]/route.ts     PATCH
app/api/projects/[id]/stories/[storyId]/comments/route.ts           GET, POST
app/api/projects/[id]/stories/[storyId]/approve/route.ts            POST
app/api/projects/[id]/stories/[storyId]/answer/route.ts             POST
app/api/projects/[id]/epics/route.ts                                GET, POST
app/api/projects/[id]/epics/[epicId]/route.ts                       PATCH
app/api/projects/[id]/sprints/route.ts                              GET, POST
app/api/projects/[id]/sprints/[sprintId]/route.ts                   PATCH
app/api/projects/[id]/sprints/[sprintId]/ready/route.ts             POST
app/api/projects/[id]/requirements/route.ts                         GET, POST
app/api/projects/[id]/requirements/[docId]/route.ts                 PATCH
app/api/projects/[id]/analytics/route.ts                            GET
app/api/projects/[id]/workflows/route.ts                            GET, POST
app/api/projects/[id]/workflows/runs/[runId]/route.ts               GET
app/api/templates/route.ts                                          GET, POST
app/api/templates/[id]/route.ts                                     PATCH
app/api/users/route.ts                                              GET, POST
app/api/users/[id]/route.ts                                         PATCH
app/api/models/route.ts                                             GET, POST, PATCH, DELETE
app/api/settings/route.ts                                           GET, PATCH
app/api/workflows/templates/route.ts                                GET, POST
```

**Before migrating each page, check that every `apiGet`/`apiPost`/`apiPatch`/`apiDelete` call
you are about to write has a corresponding route handler. If one is missing, create it first
using the same pattern as existing route handlers (read `app/api/projects/route.ts` as the
canonical template).**

- [ ] Read every file in `apps/frontend/app/api/` and build a map of existing routes + methods
- [ ] For each page migration (Phases 6–11 below), list required routes and cross-check the map
- [ ] Create any missing route handlers before starting that page's migration
- [ ] Pattern for new route handlers: extract `accessToken` from cookie via `getAuth(req)`, proxy to `BACKEND_URL/<resource>`, forward `Authorization` header and body

### Phase 1 — Remove TanStack Query and Axios packages

- [ ] Uninstall packages:
  ```bash
  pnpm --filter=frontend remove @tanstack/react-query @tanstack/react-query-devtools axios
  ```
- [ ] Verify `package.json` no longer lists those packages

### Phase 2 — Rewrite `lib/api/client.ts` to use plain fetch

- [ ] Rewrite `apps/frontend/lib/api/client.ts`:
  - `apiGet<T>(path)` — `fetch(path, { credentials: 'include' })`, throw on non-ok
  - `apiPost<T>(path, body?)` — `fetch(path, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' }, credentials: 'include' })`
  - `apiPatch<T>(path, body?)` — same pattern with `method: 'PATCH'`
  - `apiDelete<T>(path)` — same pattern with `method: 'DELETE'`
  - On 401 response: `window.location.href = '/login'` (keep the same redirect behaviour)
  - Export a typed `ApiError` class for error handling
- [ ] Delete `apps/frontend/lib/api/axios.ts`
- [ ] Delete `apps/frontend/lib/api/query-keys.ts`

### Phase 3 — Remove QueryClientProvider from layout

- [ ] Edit `apps/frontend/app/(authenticated)/layout.tsx`:
  - Remove `QueryClient`, `QueryClientProvider`, `ReactQueryDevtools` imports
  - Remove the `queryClient` constant
  - Remove `<QueryClientProvider>` wrapper and `<ReactQueryDevtools>` from JSX

### Phase 4 — Delete TanStack-dependent hooks

- [ ] Delete all files in `apps/frontend/hooks/` that only exist to wrap TanStack Query:
  - `hooks/useAgents.ts`, `hooks/useAnalytics.ts`, `hooks/useEpics.ts`, `hooks/useModels.ts`
  - `hooks/useProject.ts`, `hooks/useRequirements.ts`, `hooks/useSprints.ts`, `hooks/useStories.ts`
  - `hooks/useTemplates.ts`, `hooks/useUsers.ts`, `hooks/useWorkflows.ts`
  - Keep `hooks/useProjectSocket.ts` — this is a WebSocket hook, unrelated to TanStack

### Phase 5 — Migrate `app/(authenticated)/layout.tsx` and `context/AuthContext.tsx`

- [ ] Confirm `AuthContext.tsx` does not use TanStack — if it does, migrate its data call to plain `fetch`

### Phase 6 — Migrate `projects/page.tsx`

- [ ] Replace `useQuery` for projects with `useState` + `useEffect` calling `apiGet<Project[]>('/api/projects')`
- [ ] Replace `useQuery` for templates with `useState` + `useEffect` calling `apiGet<Template[]>('/api/templates')`
- [ ] Replace `useMutation` for create project with direct `apiPost<Project>('/api/projects', payload)` in handler
- [ ] Remove all `@tanstack/react-query`, `@/lib/api/axios`, `@/lib/api/query-keys` imports
- [ ] Add `@/lib/api/client` import

### Phase 7 — Migrate `templates/page.tsx`

- [ ] Replace `useQuery` for templates with `useState` + `useEffect` + `apiGet`
- [ ] Replace `useMutation` save template with direct `apiPost`/`apiPatch` in handler
- [ ] Replace `useMutation` import template with direct `apiPost` in handler
- [ ] Remove all TanStack and axios imports; add `@/lib/api/client`

### Phase 8 — Migrate `projects/[id]/blueprints/page.tsx`

- [ ] Replace `useQuery` for workflow templates with `useState` + `useEffect` + `apiGet`
- [ ] Replace `useQuery` for workflow runs with `useState` + `useEffect` + `apiGet`
- [ ] `saveWorkflow()` and `triggerWorkflow()` already use `apiPost` from `lib/api/client` — keep as-is
- [ ] Remove `@tanstack/react-query` and `@/lib/api/axios` imports

### Phase 9 — Migrate `projects/[id]/page.tsx` (tab by tab)

- [ ] **Main project query**: `useState` + `useEffect` + `apiGet<Project>(\`/api/projects/${id}\`)`
- [ ] **Dashboard tab**: `useState` + `useEffect` + `apiGet` for analytics (burn rate, distribution)
- [ ] **Agents tab**: `useState` + `useEffect` + `apiGet` for agents + stories; `apiPatch`/`apiPost` in handlers
- [ ] **Backlog tab**: `useState` + `useEffect` + `apiGet` for stories/epics/sprints; direct `apiPost`/`apiPatch` in handlers
- [ ] **Kanban tab**: `useState` + `useEffect` + `apiGet` for stories; `apiPatch` for drag-and-drop
- [ ] **Ticket Dialogue tab**: `useState` + `useEffect` + `apiGet` for stories; direct `apiPost`/`apiGet` for comments/tasks/approve/answer
- [ ] **Workflows tab**: `useState` + `useEffect` + `apiGet` for workflows; `apiPost` to trigger
- [ ] **Requirements tab**: `useState` + `useEffect` + `apiGet` for docs; `apiPatch`/`apiPost` in handlers
- [ ] **Project Settings tab**: `apiPatch` in save handler
- [ ] Remove all `@tanstack/react-query`, `@/lib/api/axios`, `@/lib/api/query-keys` imports

### Phase 10 — Migrate `settings/users/page.tsx`

- [ ] Remove `useUsers`, `useCreateUser`, `useUpdateUser` hook imports
- [ ] Replace with `useState` + `useEffect` + `apiGet<User[]>('/api/users')`, `apiPost`, `apiPatch` directly
- [ ] Remove any TanStack/axios imports

### Phase 11 — Migrate `settings/models/page.tsx`

- [ ] Remove all TanStack hook imports (`useModelStatus`, `usePullModel`, etc.)
- [ ] Replace with `useState` + `useEffect` + `apiGet`/`apiPost`/`apiPatch`/`apiDelete` directly
- [ ] Remove TanStack/axios imports; add `@/lib/api/client`

### Phase 12 — Update tests

- [ ] Update `__tests__/projects/agents.test.tsx`:
  - Remove `QueryClient`/`QueryClientProvider` wrapper
  - Change mock from `@/lib/api/axios` → `@/lib/api/client` (`apiGet`, `apiPost`, `apiPatch`)
  - Update assertions to check `apiGet`/`apiPatch` instead of `axiosGet`/`axiosPatch`
- [ ] Update `__tests__/projects/kanban.test.tsx`:
  - Same pattern — remove TanStack wrapper, mock `@/lib/api/client`
- [ ] Update `__tests__/projects/blueprints.test.tsx`:
  - Remove `QueryClient`/`QueryClientProvider` wrapper
  - Remove `@/lib/api/axios` mock (already uses `@/lib/api/client` for save/trigger)
  - Mock `global.fetch` for the `useEffect` data loads

### Phase 13 — Verification

- [ ] `grep -r "@tanstack/react-query" apps/frontend/app` — output must be empty
- [ ] `grep -r "from.*@/lib/api/axios" apps/frontend/app` — output must be empty
- [ ] `pnpm --filter=frontend tsc --noEmit` passes
- [ ] `pnpm --filter=frontend test` passes (all tests green)

---

## Acceptance Criteria

- [ ] `@tanstack/react-query`, `@tanstack/react-query-devtools`, and `axios` are removed from `apps/frontend/package.json`
- [ ] `lib/api/client.ts` uses plain `fetch()` — no axios import
- [ ] `lib/api/axios.ts` is deleted
- [ ] `lib/api/query-keys.ts` is deleted
- [ ] `QueryClientProvider` is removed from `app/(authenticated)/layout.tsx`
- [ ] All hooks in `hooks/` that wrapped TanStack are deleted; `hooks/useProjectSocket.ts` remains
- [ ] No `@tanstack/react-query` imports anywhere in `app/(authenticated)/`
- [ ] No `axiosGet`/`axiosPost`/`axiosPatch`/`axiosDelete` imports anywhere in `app/(authenticated)/`
- [ ] All pages call `apiGet`/`apiPost`/`apiPatch`/`apiDelete` from `lib/api/client` for data fetching
- [ ] All pages use `useState`/`useEffect` for loading state (no `useQuery`)
- [ ] All mutation handlers call the `api*` functions directly (no `useMutation`)
- [ ] `pnpm --filter=frontend tsc --noEmit` passes
- [ ] `pnpm --filter=frontend test` passes (all tests green)
- [ ] All pages load correctly in browser with no console errors

---

## Dependencies
- **Depends on**: 0000029 (completed) — the `app/api/` proxy routes must exist (they do)
- The `app/api/` proxy routes are **not changed** by this story — only client-side code changes

---

## Notes

The `app/api/` proxy routes in `apps/frontend/app/api/` handle all concerns that TanStack/Axios
were providing at a higher level:
- Auth token is read from the `accessToken` httpOnly cookie server-side in each route handler
- Backend URL is resolved server-side via `BACKEND_URL` env var
- All routes are already defined and tested

The `lib/api/client.ts` `apiGet`/`apiPost` helpers with plain `fetch()` are the correct client-side
abstraction for this project. No TanStack Query caching is needed given the real-time updates
already come through the WebSocket layer (`hooks/useProjectSocket.ts`).
