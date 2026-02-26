# 0000029 - Migrate Frontend Fetches to TanStack Query and Axios

**Epic**: EPIC-10: UI - Project Control Center  
**Assigned To**: Frontend Agent  
**Status**: [x] Completed
**PRD Reference**: PRD.md §14 (Technology Stack)  
**Knowledge Base**: `knowledge-base/03-technology-stack.md`, `knowledge-base/08-ui-design-system.md`

---

## Title
Migrate all raw `fetch()` calls in frontend pages to TanStack Query + Axios

## Description
The frontend currently uses raw `fetch()` calls scattered across page components for all data fetching and mutations. This violates the project convention (AGENTS.md §5: "React Query (TanStack Query) for data fetching and caching") and results in:

- No caching or background refetching
- No loading/error states managed centrally
- No automatic retries
- Duplicated boilerplate across every component
- No request deduplication
- Mutations have no optimistic update support

This story introduces **TanStack Query v5** as the data-fetching layer and **Axios** as the HTTP client (replacing raw `fetch()`), then migrates all existing raw `fetch()` calls in authenticated pages to use `useQuery` / `useMutation` hooks backed by an Axios instance.

## Affected Files (fetch() usage inventory)

All raw `fetch()` calls identified across authenticated pages:

| File | Count | Endpoints hit |
|------|-------|--------------|
| `app/(authenticated)/projects/[id]/page.tsx` | ~40 | agents, stories, epics, sprints, tasks, comments, analytics, kanban, workflows, requirements, librarian, settings |
| `app/(authenticated)/projects/page.tsx` | 3 | projects, templates |
| `app/(authenticated)/templates/page.tsx` | 4 | templates |
| `app/(authenticated)/settings/models/page.tsx` | 1 | models |
| `app/(authenticated)/settings/users/page.tsx` | 4 | users |
| `app/(authenticated)/projects/[id]/blueprints/page.tsx` | 1 | workflows |
| `app/login/page.tsx` | 1 | auth/login (keep as-is — login is pre-auth, no query client) |

---

## Actionable Tasks

### Setup

- [x] Install TanStack Query v5 and Axios:
  ```bash
  pnpm --filter=frontend add @tanstack/react-query axios
  pnpm --filter=frontend add -D @tanstack/react-query-devtools
  ```
- [x] Create `apps/frontend/lib/api/axios.ts`:
  - Configure Axios instance with `baseURL: ''` (relative — same as current fetch pattern)
  - Add response interceptor: on 401, redirect to `/login`
  - Export typed helper functions: `axiosGet<T>`, `axiosPost<T>`, `axiosPatch<T>`, `axiosDelete<T>`
- [x] Add `QueryClientProvider` to `apps/frontend/app/(authenticated)/layout.tsx`:
  - `staleTime: 30_000` (30s default)
  - Include `ReactQueryDevtools` in dev mode only
- [x] Update `apps/frontend/lib/api/client.ts` to use Axios internally (keep same exported API: `apiGet`, `apiPost`, `apiPatch`, `apiDelete`)

### Migrate `projects/[id]/page.tsx`

- [x] Extract each data-fetching concern into a dedicated custom hook in `apps/frontend/hooks/`:
  - `useProject(id)` → `useQuery` on `GET /api/projects/:id`
  - `useAgents(projectId)` → `useQuery` on `GET /api/projects/:id/agents`
  - `useStories(projectId)` → `useQuery` on `GET /api/projects/:id/stories`
  - `useEpics(projectId)` → `useQuery` on `GET /api/projects/:id/epics`
  - `useSprints(projectId)` → `useQuery` on `GET /api/projects/:id/sprints`
  - `useAnalytics(projectId, metric)` → `useQuery` on `GET /api/projects/:id/analytics`
  - `useRequirements(projectId)` → `useQuery` on `GET /api/projects/:id/requirements`
  - `useWorkflows(projectId)` → `useQuery` on `GET /api/projects/:id/workflows`
- [x] Replace all inline `fetch()` mutations with `useMutation` hooks (invalidate relevant queries on success):
  - Create/update story, task, epic, sprint, comment, requirement
  - Kanban drag (PATCH story status)
  - Approve story, answer story
  - Agent save, agent sync
  - Librarian ingest trigger
  - Project settings save

### Migrate remaining pages

- [x] `projects/page.tsx` — replace `fetch("/api/projects")` and `fetch("/api/templates")` with `useQuery`
- [x] `templates/page.tsx` — replace all template fetches with `useQuery` / `useMutation`
- [x] `settings/models/page.tsx` — replace with `useQuery` / `useMutation`
- [x] `settings/users/page.tsx` — replace with `useQuery` / `useMutation`
- [x] `projects/[id]/blueprints/page.tsx` — replace workflow fetch with `useQuery`

### Query key conventions

- [x] Define query key constants in `apps/frontend/lib/api/query-keys.ts`:
  ```ts
  export const KEYS = {
    projects: () => ['projects'],
    project: (id: string) => ['projects', id],
    agents: (projectId: string) => ['projects', projectId, 'agents'],
    stories: (projectId: string) => ['projects', projectId, 'stories'],
    epics: (projectId: string) => ['projects', projectId, 'epics'],
    sprints: (projectId: string) => ['projects', projectId, 'sprints'],
    templates: () => ['templates'],
    template: (id: string) => ['templates', id],
    users: () => ['users'],
    settings: () => ['settings'],
    models: () => ['models'],
  };
  ```

### Tests

- [x] Update `__tests__/projects/blueprints.test.tsx` to mock `@tanstack/react-query` instead of `@/lib/api/client`

---

## Acceptance Criteria

- [x] Zero raw `fetch()` calls remain in `app/(authenticated)/**` pages (login page excluded)
- [x] `@tanstack/react-query` and `axios` are installed in the frontend package
- [x] A shared Axios instance exists at `lib/api/axios.ts` with 401 redirect interceptor
- [x] `QueryClientProvider` wraps the authenticated layout
- [x] All data-fetching uses `useQuery` with proper query keys from `query-keys.ts`
- [x] All mutations use `useMutation` and call `queryClient.invalidateQueries` on success
- [x] Custom hooks live in `apps/frontend/hooks/` — one file per resource
- [x] Existing tests still pass after migration (40/40 passing)
- [x] No TypeScript errors introduced

---

## Dependencies
- **Depends on**: 0000024 (Frontend Auth + App Shell), 0000026 (Global Settings — lib/api/client.ts baseline)
