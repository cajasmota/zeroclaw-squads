# Frontend Agent Guide — apps/frontend/

You are working on the **Next.js App Router frontend** of the AES system.

## Your Role
The frontend provides the management UI for:
- Project creation and management
- Agent template library
- Real-time project control center (kanban, agents, workflows)
- Model administration and global settings

## Project Rules (also see root CLAUDE.md)
- Package manager: **pnpm**
- Framework: **Next.js App Router** (no Pages Router — ever)
- UI components: **Shadcn UI only** — do not install other component libraries
- Theme: `next-themes` with `dark:` Tailwind classes
- Auth: httpOnly JWT cookie — never store token in localStorage
- API calls: always through `/api/` proxy routes (never directly to backend port)
- Forms: **React Hook Form + Zod** for validation
- Server state: **React Query (TanStack Query)** for data fetching and caching
- Global state: **Zustand** for client-side state (modals, UI state)

## Folder Structure

```
app/
├── layout.tsx                          ← Root layout (ThemeProvider, fonts)
├── login/
│   └── page.tsx                        ← Public login page (Story 0000024)
├── api/                                ← Next.js API proxy routes (server-side)
│   ├── auth/
│   │   ├── login/route.ts              ← Sets httpOnly JWT cookie
│   │   ├── logout/route.ts             ← Clears cookie
│   │   └── me/route.ts                 ← Returns current user
│   ├── projects/[[...slug]]/route.ts   ← Proxy to backend /projects
│   ├── templates/[[...slug]]/route.ts
│   ├── users/[[...slug]]/route.ts
│   └── ...                             ← One proxy per backend resource
└── (authenticated)/                    ← Protected routes (require JWT cookie)
    ├── layout.tsx                      ← App shell: sidebar + nav + theme toggle
    ├── projects/
    │   ├── page.tsx                    ← /projects list + wizard (Story 0000007)
    │   └── [id]/
    │       ├── page.tsx                ← redirect to /dashboard
    │       ├── dashboard/page.tsx      ← Story 0000015
    │       ├── agents/page.tsx         ← Story 0000015
    │       ├── backlog/page.tsx        ← Story 0000016
    │       ├── kanban/page.tsx         ← Story 0000016
    │       ├── blueprints/page.tsx     ← Story 0000018
    │       ├── requirements/page.tsx   ← Story 0000019
    │       └── settings/page.tsx       ← Story 0000019
    ├── templates/
    │   └── page.tsx                    ← Story 0000004
    └── settings/
        ├── page.tsx                    ← Global settings (Story 0000026)
        ├── models/page.tsx             ← Model admin (Story 0000021)
        └── users/page.tsx              ← User management (Story 0000024)

components/
├── ui/                                 ← Shadcn UI auto-generated components
├── layout/
│   ├── sidebar.tsx
│   ├── top-bar.tsx
│   └── mode-toggle.tsx
├── agents/
│   ├── agent-card.tsx
│   ├── agent-profile-modal.tsx
│   └── aieos-builder.tsx
├── projects/
│   ├── project-card.tsx
│   └── new-project-wizard.tsx
├── kanban/
│   ├── kanban-board.tsx
│   ├── kanban-card.tsx
│   └── ticket-modal.tsx
└── ...

context/
└── auth-context.tsx                    ← useAuth() hook

lib/
├── api/
│   ├── client.ts                       ← Base fetch wrapper with auth
│   ├── auth.ts                         ← Auth API calls
│   ├── projects.ts                     ← Projects API calls
│   └── ...                             ← One file per resource
├── websocket.ts                        ← Socket.IO client setup
└── utils.ts                            ← Shared utilities

middleware.ts                           ← Route protection (JWT check)
```

## API Client Pattern
All API calls go through `/api/` proxy routes — never call the backend directly:

```ts
// lib/api/client.ts
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, await res.json());
  return res.json();
}

// Usage in a component:
const { data: projects } = useQuery({
  queryKey: ['projects'],
  queryFn: () => apiGet<Project[]>('/projects'),
});
```

## Page Template (Server Component)
```tsx
// app/(authenticated)/projects/page.tsx
import { ProjectList } from '@/components/projects/project-list';

export const metadata = { title: `Projects | ${process.env.NEXT_PUBLIC_APP_NAME}` };

export default function ProjectsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Projects</h1>
      <ProjectList />
    </div>
  );
}
```

## Client Component Template
```tsx
// components/projects/project-list.tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';

export function ProjectList() {
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiGet('/projects'),
  });

  if (isLoading) return <ProjectListSkeleton />;
  return <div>{data?.map(p => <ProjectCard key={p._id} project={p} />)}</div>;
}
```

## Adding Shadcn Components
```bash
# From squads-v2/ root:
pnpm dlx shadcn@latest add button card dialog badge table sheet tabs toast
```

## WebSocket Connection (real-time)
```ts
// lib/websocket.ts
import { io } from 'socket.io-client';

export const socket = io(process.env.NEXT_PUBLIC_BACKEND_WS_URL, {
  auth: { token: getCookieValue('accessToken') },  // read from cookie
  autoConnect: false,
});

// In a component:
useEffect(() => {
  socket.connect();
  socket.emit('join-project', projectId);
  socket.on('agent:log', handleLog);
  return () => { socket.off('agent:log', handleLog); socket.disconnect(); };
}, [projectId]);
```

## Running the Frontend
```bash
pnpm --filter=frontend dev     # development with hot reload (port 3000)
pnpm --filter=frontend build   # production build
pnpm --filter=frontend test    # run tests
```

## Key Environment Variables
```
NEXT_PUBLIC_APP_NAME          ← App branding name (browser-visible)
NEXT_PUBLIC_BACKEND_WS_URL    ← WebSocket URL (e.g., http://localhost:3001)
BACKEND_URL                   ← Internal backend URL (server-side only, e.g., http://localhost:3001)
JWT_SECRET                    ← For middleware JWT verification (server-side only)
```
