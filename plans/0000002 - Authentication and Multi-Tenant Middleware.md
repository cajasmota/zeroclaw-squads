# 0000002 - Authentication, Multi-Tenancy, and User Management

**Epic**: EPIC-02: Authentication & Multi-Tenancy
**Assigned To**: Backend Agent
**Status**: [~] In Progress
**PRD Reference**: PRD.md §10.1 (Data Isolation), §10.2 (Auth: JWT-based session management)
**Knowledge Base**: `knowledge-base/02-data-models.md`, `knowledge-base/00-system-overview.md`, `knowledge-base/10-code-patterns.md`

---

## Title
Implement MongoDB-based auth with JWT, proper multi-tenant data model, default tenant seeding, and admin user management API

## Description
Implement authentication and multi-tenancy:
- **`Tenant`** model — the top-level isolation unit (separate from User)
- **`User`** model — belongs to a `Tenant`, with bcrypt-hashed password
- A **default Tenant** is created at first startup if none exists
- An **admin user** is created in the default tenant at first startup (credentials from env vars)
- Login: email + password → JWT containing `{ userId, tenantId, email, role }`
- Admin-only API for creating additional users (no public self-registration)
- `TenantMiddleware` scoping all queries by `tenantId`
- Filesystem boundary enforcement per `tenantId`

## Context
Multi-tenancy is a core architectural requirement. The `Tenant` is the top-level isolation boundary — all data (projects, agents, stories) belongs to a `Tenant`. `Users` belong to a `Tenant` and log in with their credentials. There is no public self-registration; users are created by an admin through the management API or the setup process seeds the first admin.

---

## Actionable Tasks

### Data Models

- [ ] Define `Tenant` Mongoose schema:
  - [ ] `name` (string)
  - [ ] `slug` (string, unique, URL-safe)
  - [ ] `status` (enum: `active | suspended`, default `active`)
  - [ ] Timestamps

- [ ] Define `User` Mongoose schema:
  - [ ] `tenantId` (ObjectId ref Tenant, indexed)
  - [ ] `email` (string, unique within tenant — compound index `{ tenantId, email }`)
  - [ ] `passwordHash` (string — bcrypt, min 12 rounds)
  - [ ] `name` (string)
  - [ ] `role` (enum: `admin | member`, default `member`)
  - [ ] `status` (enum: `active | inactive`, default `active`)
  - [ ] Timestamps
  - [ ] Schema `transform`: exclude `passwordHash` from all `.toJSON()` / `.toObject()` outputs

### Auth Module

- [ ] Create `AuthModule` in NestJS:
  - [ ] Install: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`, `@types/bcrypt`
  - [ ] `AuthService`:
    - [ ] `login(email, password, tenantId?)`:
      - [ ] If `tenantId` not provided, use default tenant
      - [ ] Find user by `{ tenantId, email }`
      - [ ] `bcrypt.compare(password, user.passwordHash)` → throw `UnauthorizedException` on mismatch
      - [ ] Return `{ accessToken: jwt.sign({ userId, tenantId, email, role }), user }`
    - [ ] `createUser(creatorTenantId, dto: CreateUserDto)` — admin-only:
      - [ ] Validates creator is `admin` role
      - [ ] Hash password: `bcrypt.hash(dto.password, 12)`
      - [ ] Create User in same `tenantId` as creator
    - [ ] `validateJwt(payload)` — validates token payload, returns user or throws
  - [ ] `JwtStrategy` (Passport):
    - [ ] Extracts Bearer token from `Authorization` header
    - [ ] Validates with `JWT_SECRET`, calls `validateJwt(payload)`
    - [ ] Attaches `{ userId, tenantId, email, role }` to `request.user`
  - [ ] `JwtAuthGuard` — extends `AuthGuard('jwt')`, applied globally via `APP_GUARD`
  - [ ] `@Public()` decorator — marks endpoints that bypass auth guard
  - [ ] `@AdminOnly()` decorator — guards requiring `role === 'admin'`
  - [ ] `AuthController`:
    - [ ] `POST /auth/login` — `@Public()`, calls `AuthService.login()`
    - [ ] `GET /auth/me` — protected, returns current user (no passwordHash)
    - [ ] `POST /auth/logout` — protected, stateless (client clears token)
  - [ ] `UsersController` (admin-only user management):
    - [ ] `GET /users` — `@AdminOnly()`, list users in tenant
    - [ ] `POST /users` — `@AdminOnly()`, create user in tenant
    - [ ] `PATCH /users/:id` — `@AdminOnly()`, update user (name, role, status)
    - [ ] `DELETE /users/:id` — `@AdminOnly()`, deactivate user (set `status: inactive`)

### Multi-Tenant Infrastructure

- [ ] Create `TenantMiddleware`:
  - [ ] Extracts `tenantId` from JWT payload on every authenticated request
  - [ ] Attaches `tenantId` to `request.tenantId` as `Types.ObjectId`
  - [ ] Applied globally via `AppModule.configure()`
- [ ] Create `@CurrentUser()` param decorator:
  - [ ] Extracts `{ userId, tenantId, email, role }` from `request.user`
- [ ] Implement `validatePath(tenantId: string, path: string): void`:
  - [ ] Verifies `path` starts with `{ARTIFACTS_ROOT}/{tenantId}/`
  - [ ] Throws `ForbiddenException` if outside boundary
  - [ ] Export from a shared `SecurityUtils` file

### Default Tenant and Admin Seeding

- [ ] Create `SeedService` (runs once on app bootstrap via `OnApplicationBootstrap`):
  - [ ] Check if any `Tenant` document exists
  - [ ] If none: create a default Tenant `{ name: APP_NAME, slug: 'default' }`
  - [ ] Check if any `User` with `role: admin` exists in default tenant
  - [ ] If none: create admin user from env vars:
    - [ ] `ADMIN_EMAIL` (required, fallback: `admin@aes.local`)
    - [ ] `ADMIN_PASSWORD` (required — must be set in `.env`)
    - [ ] `ADMIN_NAME` (optional, default: "Administrator")
  - [ ] Log admin credentials to console on first run (never again after)
  - [ ] Add `ADMIN_EMAIL` and `ADMIN_PASSWORD` to `.env.example`

### Testing

- [ ] Write unit tests for:
  - [ ] `AuthService.login()` — success, wrong password, user not found
  - [ ] `AuthService.createUser()` — success, duplicate email, non-admin blocked
  - [ ] `validatePath()` — valid path, path traversal attempt, outside boundary
  - [ ] `JwtAuthGuard` — valid token, missing token, expired token
  - [ ] `SeedService` — creates tenant/admin on empty DB, skips if already exists

---

## Acceptance Criteria

- [ ] `POST /auth/login` with valid credentials returns a signed JWT containing `{ userId, tenantId, email, role }`
- [ ] `POST /auth/login` with wrong password returns 401 `UnauthorizedException`
- [ ] `passwordHash` is NEVER present in any API response (schema transform verified in tests)
- [ ] Accessing any protected endpoint without JWT returns 401
- [ ] Endpoints with `@Public()` are accessible without auth
- [ ] `GET /users` returns 403 for non-admin users
- [ ] `POST /users` creates a new user in the same tenant as the authenticated admin
- [ ] On first app startup with empty DB: default Tenant and admin User are created
- [ ] On subsequent startups: seeding is skipped (idempotent)
- [ ] `validatePath()` throws `ForbiddenException` for paths outside `{ARTIFACTS_ROOT}/{tenantId}/`
- [ ] All unit tests pass

---

## Dependencies
- **Depends on**: 0000001 (Project Bootstrap)

## Notes
- No public self-registration endpoint — users are only created by admins
- The `tenantId` in the JWT always comes from the authenticated user's `tenantId` field in MongoDB — never from the request body
- Multi-tenancy is enforced at the query level via `TenantMiddleware` + `tenantId` filter on every Mongoose query
