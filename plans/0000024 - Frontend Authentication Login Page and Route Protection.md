# 0000024 - Frontend Authentication - Login Page, Route Protection, App Shell, and User Management

**Epic**: EPIC-02: Authentication & Multi-Tenancy
**Assigned To**: Frontend Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §10.2 (Auth: JWT-based session management), §19.1 (Design System & Branding)
**Knowledge Base**: `knowledge-base/08-ui-design-system.md`, `knowledge-base/10-code-patterns.md`

---

## Title
Frontend auth: login page, httpOnly JWT cookie, Next.js route protection, global app shell, and admin user management page

## Description
Frontend authentication using simple email/password (no public registration, no OAuth):
1. **Login page** at `/login` — email + password, no register link
2. **JWT cookie management** — JWT stored in httpOnly cookie via Next.js API proxy routes
3. **Next.js middleware** — protects all routes, redirects unauthenticated users to `/login`
4. **Global App Layout** — authenticated shell: sidebar nav, theme toggle, user info, logout
5. **User Management page** at `/settings/users` — admin-only, create/view/manage team members

## Context
Story 0000002 provides the backend auth endpoints. There is **no public self-registration**. Users are created by admins through the User Management page. The login page is the only public UI entry point.

The JWT is stored as an **httpOnly cookie** (set by a Next.js API route proxy) so JavaScript cannot access it — protection against XSS.

---

## Actionable Tasks

### Auth API Proxy (Next.js API Routes)

- [x] Create `apps/frontend/lib/api/client.ts`:
  - [x] Base fetch wrapper that automatically reads JWT from cookie header (for server components/API routes) or includes credentials for client fetch
  - [x] `apiGet(path)`, `apiPost(path, body)`, `apiPatch(path, body)`, `apiDelete(path)`

- [x] Create Next.js API route proxies (keeps JWT server-side):
  - [x] `app/api/auth/login/route.ts`:
    - [x] `POST` — forwards to `{BACKEND_URL}/auth/login`
    - [x] On success: sets httpOnly `accessToken` cookie (Secure, SameSite=Strict, path=/)
    - [x] Returns `{ user }` to client (NOT the token)
  - [x] `app/api/auth/logout/route.ts`:
    - [x] `POST` — clears the `accessToken` cookie (maxAge=0)
    - [x] Returns `{ ok: true }`
  - [x] `app/api/auth/me/route.ts`:
    - [x] `GET` — reads cookie, forwards as `Authorization: Bearer {token}` to `{BACKEND_URL}/auth/me`

### Route Protection Middleware

- [x] Create `apps/frontend/middleware.ts`:
  - [x] Install `jose` for Edge-compatible JWT verification: `pnpm add jose`
  - [x] Matcher: all paths EXCEPT `/login`, `/api/auth/*`, `/_next/*`, `/favicon.ico`, `/avatars/*`
  - [x] Read `accessToken` cookie from request
  - [x] Verify with `jose.jwtVerify(token, JWT_SECRET)` — catch expired/invalid
  - [x] If invalid/missing: redirect to `/login?redirect={encodeURIComponent(pathname)}`
  - [x] If authenticated and accessing `/login`: redirect to `/projects`
  - [x] If authenticated and accessing `/settings/users` with role !== 'admin': redirect to `/projects`
  - [x] On success: add `x-user-id` and `x-tenant-id` headers to forwarded request (for server components)

### Auth State (Client)

- [x] Create `apps/frontend/context/AuthContext.tsx`:
  - [x] `AuthProvider` — wraps authenticated layout
  - [x] On mount: fetches `GET /api/auth/me` to hydrate user state
  - [x] `useAuth()` hook: `{ user, isLoading, logout, isAdmin }`
  - [x] `logout()`: calls `POST /api/auth/logout`, redirects to `/login`
  - [x] `isAdmin`: `user?.role === 'admin'`

### Login Page

- [x] Create `apps/frontend/app/login/page.tsx`:
  - [x] AES branding: `APP_NAME` title (from `NEXT_PUBLIC_APP_NAME`), primary color `#004176`
  - [x] Email input (Shadcn `Input`, type="email", autocomplete="email")
  - [x] Password input (Shadcn `Input`, type="password") with show/hide toggle (`Eye`/`EyeOff` icons)
  - [x] "Sign In" button (Shadcn `Button`) — loading spinner on submit
  - [x] Error banner (Shadcn `Alert` variant="destructive") for invalid credentials
  - [x] **No register link** — users are created by admins
  - [x] On success: redirect to `/projects` or `?redirect` param destination
  - [x] Handle `?redirect` param: validate it starts with `/` to prevent open redirect

### Global App Layout (Authenticated Shell)

- [x] Create `apps/frontend/app/(authenticated)/layout.tsx`:
  - [x] Wraps all authenticated routes
  - [x] Includes `AuthProvider`
  - [x] **Sidebar**:
    - [x] `APP_NAME` at top (Shadcn `Separator` below)
    - [x] Nav links (Shadcn `Button` variant="ghost" with active state):
      - [x] Projects → `/projects`
      - [x] Templates → `/templates`
      - [x] Models → `/settings/models`
      - [x] Settings → `/settings`
      - [x] Users → `/settings/users` (only shown if `isAdmin`)
    - [x] Collapsible on mobile (hamburger toggle)
  - [x] **Top bar** (right side):
    - [x] `ModeToggle` (dark/light/system — Shadcn standard implementation)
    - [x] User avatar (initials-based, Shadcn `Avatar`)
    - [x] User name display
    - [x] Logout button (Shadcn `Button` variant="ghost" with `LogOut` icon)
  - [x] Move all existing routes under `(authenticated)/` folder

- [x] Configure `ThemeProvider` in `apps/frontend/app/layout.tsx`:
  - [x] `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`

- [x] Set `<title>` and `<meta>` in root layout using `NEXT_PUBLIC_APP_NAME`

### User Management Page (Admin Only)

- [x] Create `apps/frontend/app/(authenticated)/settings/users/page.tsx`:
  - [x] Guard: redirect non-admins to `/projects` (also enforced in middleware)
  - [x] **Users table** (Shadcn `Table`):
    - [x] Columns: Name, Email, Role badge, Status badge, Created date, Actions
    - [x] Role badge: `admin` (primary color), `member` (neutral)
    - [x] Status badge: `active` (green), `inactive` (red)
    - [x] Actions: Edit role/status (dropdown), Deactivate button
  - [x] **"Invite User" button** (top-right) → opens `CreateUserDialog`
  - [x] `CreateUserDialog` (Shadcn `Dialog`):
    - [x] Name, Email, Password, Role (admin/member) inputs
    - [x] Validation: all required, password min 8 chars
    - [x] Submit → `POST /api/users` (proxied to backend)
    - [x] On success: close dialog, refresh table, show success toast
  - [x] **Edit User** inline or via dialog:
    - [x] Change role (admin ↔ member) — updates via `PATCH /api/users/:id`
    - [x] Deactivate/Reactivate — updates `status` via `PATCH /api/users/:id`
  - [x] Add `/api/users/*` proxy routes (forward to backend with JWT)

### Tests

- [x] Write component tests:
  - [x] Login form: submit fires API call, error state renders, redirect on success
  - [x] Middleware: redirects unauthenticated, allows authenticated, blocks non-admin from `/settings/users`
  - [x] `CreateUserDialog`: form validation, success/error states

---

## Acceptance Criteria

- [x] `/login` renders without auth, all other routes redirect to `/login` if not authenticated
- [x] Login with valid credentials sets httpOnly `accessToken` cookie and redirects to `/projects`
- [x] Login with wrong credentials shows error message, no redirect
- [x] JWT cookie is httpOnly — `document.cookie` in browser JS does NOT expose the token
- [x] Logout clears the cookie and redirects to `/login`
- [x] Sidebar shows "Users" link only for admin role users
- [x] `/settings/users` redirects non-admins to `/projects`
- [x] Admin can create a new user via the Create User dialog
- [x] Admin can change a user's role and status
- [x] `APP_NAME` appears in browser tab title and sidebar header
- [x] Dark/light theme toggle works and persists across page refresh
- [x] All component tests pass

---

## Dependencies
- **Depends on**: 0000001 (Project Bootstrap), 0000002 (Backend Auth API)
