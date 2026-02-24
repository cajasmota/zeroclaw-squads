# 0000002 - Authentication, Multi-Tenancy, and User Management

**Epic**: EPIC-02: Authentication & Multi-Tenancy
**Assigned To**: Backend Agent
**Status**: [x] Completed
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

- [x] Define `Tenant` Mongoose schema:
  - [x] `name` (string)
  - [x] `slug` (string, unique, URL-safe)
  - [x] `status` (enum: `active | suspended`, default `active`)
  - [x] Timestamps

- [x] Define `User` Mongoose schema:
  - [x] `tenantId` (ObjectId ref Tenant, indexed)
  - [x] `email` (string, unique within tenant — compound index `{ tenantId, email }`)
  - [x] `passwordHash` (string — bcrypt, min 12 rounds)
  - [x] `name` (string)
  - [x] `role` (enum: `admin | member`, default `member`)
  - [x] `status` (enum: `active | inactive`, default `active`)
  - [x] Timestamps
  - [x] Schema `transform`: exclude `passwordHash` from all `.toJSON()` / `.toObject()` outputs

### Auth Module

- [x] Create `AuthModule` in NestJS:
  - [x] Install: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`, `@types/bcrypt`
  - [x] `AuthService`:
    - [x] `login(email, password, tenantId?)`:
      - [x] If `tenantId` not provided, use default tenant
      - [x] Find user by `{ tenantId, email }`
      - [x] `bcrypt.compare(password, user.passwordHash)` → throw `UnauthorizedException` on mismatch
      - [x] Return `{ accessToken: jwt.sign({ userId, tenantId, email, role }), user }`
    - [x] `createUser(creatorTenantId, dto: CreateUserDto)` — admin-only:
      - [x] Validates creator is `admin` role
      - [x] Hash password: `bcrypt.hash(dto.password, 12)`
      - [x] Create User in same `tenantId` as creator
    - [x] `validateJwt(payload)` — validates token payload, returns user or throws
  - [x] `JwtStrategy` (Passport):
    - [x] Extracts Bearer token from `Authorization` header
    - [x] Validates with `JWT_SECRET`, calls `validateJwt(payload)`
    - [x] Attaches `{ userId, tenantId, email, role }` to `request.user`
  - [x] `JwtAuthGuard` — extends `AuthGuard('jwt')`, applied globally via `APP_GUARD`
  - [x] `@Public()` decorator — marks endpoints that bypass auth guard
  - [x] `@AdminOnly()` decorator — guards requiring `role === 'admin'`
  - [x] `AuthController`:
    - [x] `POST /auth/login` — `@Public()`, calls `AuthService.login()`
    - [x] `GET /auth/me` — protected, returns current user (no passwordHash)
    - [x] `POST /auth/logout` — protected, stateless (client clears token)
  - [x] `UsersController` (admin-only user management):
    - [x] `GET /users` — `@AdminOnly()`, list users in tenant
    - [x] `POST /users` — `@AdminOnly()`, create user in tenant
    - [x] `PATCH /users/:id` — `@AdminOnly()`, update user (name, role, status)
    - [x] `DELETE /users/:id` — `@AdminOnly()`, deactivate user (set `status: inactive`)

### Multi-Tenant Infrastructure

- [x] Create `TenantMiddleware`:
  - [x] Extracts `tenantId` from JWT payload on every authenticated request
  - [x] Attaches `tenantId` to `request.tenantId` as `Types.ObjectId`
  - [x] Applied globally via `AppModule.configure()`
- [x] Create `@CurrentUser()` param decorator:
  - [x] Extracts `{ userId, tenantId, email, role }` from `request.user`
- [x] Implement `validatePath(tenantId: string, path: string): void`:
  - [x] Verifies `path` starts with `{ARTIFACTS_ROOT}/{tenantId}/`
  - [x] Throws `ForbiddenException` if outside boundary
  - [x] Export from a shared `SecurityUtils` file

### Default Tenant and Admin Seeding

- [x] Create `SeedService` (runs once on app bootstrap via `OnApplicationBootstrap`):
  - [x] Check if any `Tenant` document exists
  - [x] If none: create a default Tenant `{ name: APP_NAME, slug: 'default' }`
  - [x] Check if any `User` with `role: admin` exists in default tenant
  - [x] If none: create admin user from env vars:
    - [x] `ADMIN_EMAIL` (required, fallback: `admin@aes.local`)
    - [x] `ADMIN_PASSWORD` (required — must be set in `.env`)
    - [x] `ADMIN_NAME` (optional, default: "Administrator")
  - [x] Log admin credentials to console on first run (never again after)
  - [x] Add `ADMIN_EMAIL` and `ADMIN_PASSWORD` to `.env.example`

### Testing

- [x] Write unit tests for:
  - [x] `AuthService.login()` — success, wrong password, user not found
  - [x] `AuthService.createUser()` — success, duplicate email, non-admin blocked
  - [x] `validatePath()` — valid path, path traversal attempt, outside boundary
  - [x] `JwtAuthGuard` — valid token, missing token, expired token
  - [x] `SeedService` — creates tenant/admin on empty DB, skips if already exists

---

## Acceptance Criteria

- [x] `POST /auth/login` with valid credentials returns a signed JWT containing `{ userId, tenantId, email, role }`
- [x] `POST /auth/login` with wrong password returns 401 `UnauthorizedException`
- [x] `passwordHash` is NEVER present in any API response (schema transform verified in tests)
- [x] Accessing any protected endpoint without JWT returns 401
- [x] Endpoints with `@Public()` are accessible without auth
- [x] `GET /users` returns 403 for non-admin users
- [x] `POST /users` creates a new user in the same tenant as the authenticated admin
- [x] On first app startup with empty DB: default Tenant and admin User are created
- [x] On subsequent startups: seeding is skipped (idempotent)
- [x] `validatePath()` throws `ForbiddenException` for paths outside `{ARTIFACTS_ROOT}/{tenantId}/`
- [x] All unit tests pass

---

## Dependencies
- **Depends on**: 0000001 (Project Bootstrap)

## Notes
- No public self-registration endpoint — users are only created by admins
- The `tenantId` in the JWT always comes from the authenticated user's `tenantId` field in MongoDB — never from the request body
- Multi-tenancy is enforced at the query level via `TenantMiddleware` + `tenantId` filter on every Mongoose query
