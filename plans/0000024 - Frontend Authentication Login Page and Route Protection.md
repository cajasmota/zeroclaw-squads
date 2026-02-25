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
  - [ ] Base fetch wrapper that automatically reads JWT from cookie header (for server components/API routes) or includes credentials for client fetch
  - [ ] `apiGet(path)`, `apiPost(path, body)`, `apiPatch(path, body)`, `apiDelete(path)`

- [x] Create Next.js API route proxies (keeps JWT server-side):
  - [ ] `app/api/auth/login/route.ts`:
    - [ ] `POST` — forwards to `{BACKEND_URL}/auth/login`
    - [ ] On success: sets httpOnly `accessToken` cookie (Secure, SameSite=Strict, path=/)
    - [ ] Returns `{ user }` to client (NOT the token)
  - [ ] `app/api/auth/logout/route.ts`:
    - [ ] `POST` — clears the `accessToken` cookie (maxAge=0)
    - [ ] Returns `{ ok: true }`
  - [ ] `app/api/auth/me/route.ts`:
    - [ ] `GET` — reads cookie, forwards as `Authorization: Bearer {token}` to `{BACKEND_URL}/auth/me`

### Route Protection Middleware

- [x] Create `apps/frontend/middleware.ts`:
  - [ ] Install `jose` for Edge-compatible JWT verification: `pnpm add jose`
  - [ ] Matcher: all paths EXCEPT `/login`, `/api/auth/*`, `/_next/*`, `/favicon.ico`, `/avatars/*`
  - [ ] Read `accessToken` cookie from request
  - [ ] Verify with `jose.jwtVerify(token, JWT_SECRET)` — catch expired/invalid
  - [ ] If invalid/missing: redirect to `/login?redirect={encodeURIComponent(pathname)}`
  - [ ] If authenticated and accessing `/login`: redirect to `/projects`
  - [ ] If authenticated and accessing `/settings/users` with role !== 'admin': redirect to `/projects`
  - [ ] On success: add `x-user-id` and `x-tenant-id` headers to forwarded request (for server components)

### Auth State (Client)

- [x] Create `apps/frontend/context/AuthContext.tsx`:
  - [ ] `AuthProvider` — wraps authenticated layout
  - [ ] On mount: fetches `GET /api/auth/me` to hydrate user state
  - [ ] `useAuth()` hook: `{ user, isLoading, logout, isAdmin }`
  - [ ] `logout()`: calls `POST /api/auth/logout`, redirects to `/login`
  - [ ] `isAdmin`: `user?.role === 'admin'`

### Login Page

- [x] Create `apps/frontend/app/login/page.tsx`:
  - [ ] AES branding: `APP_NAME` title (from `NEXT_PUBLIC_APP_NAME`), primary color `#004176`
  - [ ] Email input (Shadcn `Input`, type="email", autocomplete="email")
  - [ ] Password input (Shadcn `Input`, type="password") with show/hide toggle (`Eye`/`EyeOff` icons)
  - [ ] "Sign In" button (Shadcn `Button`) — loading spinner on submit
  - [ ] Error banner (Shadcn `Alert` variant="destructive") for invalid credentials
  - [ ] **No register link** — users are created by admins
  - [ ] On success: redirect to `/projects` or `?redirect` param destination
  - [ ] Handle `?redirect` param: validate it starts with `/` to prevent open redirect

### Global App Layout (Authenticated Shell)

- [x] Create `apps/frontend/app/(authenticated)/layout.tsx`:
  - [ ] Wraps all authenticated routes
  - [ ] Includes `AuthProvider`
  - [ ] **Sidebar**:
    - [ ] `APP_NAME` at top (Shadcn `Separator` below)
    - [ ] Nav links (Shadcn `Button` variant="ghost" with active state):
      - [ ] Projects → `/projects`
      - [ ] Templates → `/templates`
      - [ ] Models → `/settings/models`
      - [ ] Settings → `/settings`
      - [ ] Users → `/settings/users` (only shown if `isAdmin`)
    - [ ] Collapsible on mobile (hamburger toggle)
  - [ ] **Top bar** (right side):
    - [ ] `ModeToggle` (dark/light/system — Shadcn standard implementation)
    - [ ] User avatar (initials-based, Shadcn `Avatar`)
    - [ ] User name display
    - [ ] Logout button (Shadcn `Button` variant="ghost" with `LogOut` icon)
  - [ ] Move all existing routes under `(authenticated)/` folder

- [x] Configure `ThemeProvider` in `apps/frontend/app/layout.tsx`:
  - [ ] `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`

- [x] Set `<title>` and `<meta>` in root layout using `NEXT_PUBLIC_APP_NAME`

### User Management Page (Admin Only)

- [x] Create `apps/frontend/app/(authenticated)/settings/users/page.tsx`:
  - [ ] Guard: redirect non-admins to `/projects` (also enforced in middleware)
  - [ ] **Users table** (Shadcn `Table`):
    - [ ] Columns: Name, Email, Role badge, Status badge, Created date, Actions
    - [ ] Role badge: `admin` (primary color), `member` (neutral)
    - [ ] Status badge: `active` (green), `inactive` (red)
    - [ ] Actions: Edit role/status (dropdown), Deactivate button
  - [ ] **"Invite User" button** (top-right) → opens `CreateUserDialog`
  - [ ] `CreateUserDialog` (Shadcn `Dialog`):
    - [ ] Name, Email, Password, Role (admin/member) inputs
    - [ ] Validation: all required, password min 8 chars
    - [ ] Submit → `POST /api/users` (proxied to backend)
    - [ ] On success: close dialog, refresh table, show success toast
  - [ ] **Edit User** inline or via dialog:
    - [ ] Change role (admin ↔ member) — updates via `PATCH /api/users/:id`
    - [ ] Deactivate/Reactivate — updates `status` via `PATCH /api/users/:id`
  - [ ] Add `/api/users/*` proxy routes (forward to backend with JWT)

### Tests

- [x] Write component tests:
  - [ ] Login form: submit fires API call, error state renders, redirect on success
  - [ ] Middleware: redirects unauthenticated, allows authenticated, blocks non-admin from `/settings/users`
  - [ ] `CreateUserDialog`: form validation, success/error states

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
