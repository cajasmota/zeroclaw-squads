# 0000022 - Unified Setup, Update, and Uninstall Scripts

**Epic**: EPIC-13: Deployment & Operations
**Assigned To**: DevOps Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §12 (Deployment & Installation Script), §10 (Multi-Tenant Security & Deployment)
**Knowledge Base**: `knowledge-base/03-technology-stack.md`, `knowledge-base/09-zeroclaw-integration.md`

---

## Title
Create setup-aes.sh (install), update-aes.sh, uninstall-aes.sh scripts plus GitHub App and Slack App configuration guides

## Description
Three lifecycle management scripts for AES on a VPS:
1. **`setup-aes.sh`** — one-command fresh install: installs all dependencies, generates `.env`, seeds default admin, starts the application behind SSL
2. **`update-aes.sh`** — zero-downtime update: pulls latest code, migrates DB if needed, rebuilds, restarts
3. **`uninstall-aes.sh`** — clean removal: stops services, optionally removes data, removes all installed components

Plus documentation guides for GitHub App and Slack App setup.
Instead of a single massive script for setup, update, or uninstall, create separate modular and scoped scripts that the main scripts (setup, update, uninstall) will call, so the main scripts will be mostly orchestrators.

## Context
AES is designed to run on a VPS (Ubuntu 22.04 LTS, 8GB RAM minimum). The default Ollama model is `qwen2.5-coder:1.5b` to optimize for 8GB RAM. All scripts must be safe to run as root or sudo-capable user.

---

## Actionable Tasks

### `scripts/setup-aes.sh` (Fresh Installation)

- [x] Create `scripts/setup-aes.sh` with a shebang `#!/usr/bin/env bash` and `set -euo pipefail`
- [x] **Pre-flight checks**:
  - [ ] Verify OS: Ubuntu 20.04+ or Debian 11+ (warn on other systems)
  - [ ] Verify running as root or with sudo access
  - [ ] Verify internet connectivity
  - [ ] Check minimum RAM (warn if < 4GB, error if < 2GB)
- [x] **Interactive configuration** (with defaults, skippable via `--non-interactive` flag):
  - [ ] `APP_NAME` (default: "AES")
  - [ ] `DOMAIN` — the public domain name (e.g., `aes.example.com`)
  - [ ] `ADMIN_EMAIL` — first admin user email
  - [ ] `ADMIN_PASSWORD` — first admin user password (min 6 chars, validated)
  - [ ] MongoDB: local install OR external URI (`MONGODB_URI`)
  - [ ] Default Ollama model (default: `qwen2.5-coder:1.5b`)
  - [ ] SSL: Caddy (auto HTTPS) or Nginx + certbot
- [x] **Install system dependencies**:
  - [ ] `apt-get update && apt-get install -y curl git build-essential`
  - [ ] Docker CE + Docker Compose plugin (via official Docker repo)
  - [ ] Node.js LTS via nvm (`~/.nvm/`)
  - [ ] pnpm: `npm install -g pnpm`
  - [ ] pm2: `pnpm add -g pm2`
- [x] **Install MongoDB 8.0** (if local install chosen):
  - [ ] Add MongoDB 8.0 official docker image and create a container with docker compose 
- [x] **Install ZeroClaw**:
  - [ ] Download latest release binary from `https://github.com/zeroclaw-labs/zeroclaw/releases`
  - [ ] Place at `/usr/local/bin/zeroclaw`
  - [ ] `chmod +x /usr/local/bin/zeroclaw`
  - [ ] Verify: `zeroclaw --version`
- [x] **Install Ollama**:
  - [ ] `curl -fsSL https://ollama.ai/install.sh | sh`
  - [ ] Enable and start `ollama` systemd service
  - [ ] Pull default model: `ollama pull qwen2.5-coder:1.5b`
- [x] **Clone/copy application** (if not already present):
  - [ ] Copy source to `/opt/aes/` or use current directory
- [x] **Generate `.env` file** at app root:
  - [ ] `APP_NAME` (from user input)
  - [ ] `NEXT_PUBLIC_APP_NAME` (same value)
  - [ ] `MONGODB_URI` (local or provided)
  - [ ] `JWT_SECRET` — auto-generate: `openssl rand -hex 32`
  - [ ] `JWT_EXPIRES_IN=7d`
  - [ ] `AES_ENCRYPTION_KEY` — auto-generate: `openssl rand -hex 32`
  - [ ] `ZEROCLAW_BINARY_PATH=/usr/local/bin/zeroclaw`
  - [ ] `OLLAMA_ENDPOINT=http://localhost:11434`
  - [ ] `ARTIFACTS_ROOT=/artifacts`
  - [ ] `ADMIN_EMAIL` (from user input)
  - [ ] `ADMIN_PASSWORD` (from user input)
  - [ ] `ADMIN_NAME=Administrator`
  - [ ] `BACKEND_PORT=3001`
  - [ ] `FRONTEND_PORT=3000`
  - [ ] Set file permissions: `chmod 600 .env`
- [x] **Create artifacts directory**:
  - [ ] `mkdir -p /artifacts && chown -R $USER:$USER /artifacts`
- [x] **Build application**:
  - [ ] `pnpm install --frozen-lockfile`
  - [ ] `pnpm build`
- [x] **Start with pm2**:
  - [ ] Create `ecosystem.config.js` for pm2 (backend + frontend processes)
  - [ ] `pm2 start ecosystem.config.js`
  - [ ] `pm2 save && pm2 startup` (survive reboots)
- [x] **Configure reverse proxy**:
  - [ ] Check and choose if Caddy or Nginx is installed, if none, ask the user which one to install and proceed with instalation
  - [ ] If Caddy: generate `/etc/caddy/Caddyfile` with auto HTTPS, proxy to backend (`:3001`) and frontend (`:3000`)
  - [ ] If Nginx: generate `/etc/nginx/sites-available/aes.conf`
  - [ ] Check if SSL certificates exist
  - [ ] Run certbot for SSL or equivalently Let's encrypt script for Caddy (Skip if certificates already exist)
  - [ ] Reload/restart proxy
- [x] **Post-install summary**:
  - [ ] Print: frontend URL, backend URL, admin email
  - [ ] Print next steps: configure GitHub App, configure Slack App
  - [ ] Print links to `docs/github-app-setup.md` and `docs/slack-app-setup.md`
  - [ ] **Do NOT print the admin password** to console; remind user to save it

### `scripts/update-aes.sh` (Update Existing Installation)

- [x] Create `scripts/update-aes.sh` with `set -euo pipefail`
- [x] **Pre-flight**:
  - [ ] Check AES is installed (`.env` exists and pm2 process is running)
  - [ ] Backup `.env` file to `.env.backup.{timestamp}`
  - [ ] Backup MongoDB: `mongodump --out /tmp/aes-backup-{timestamp}/`
  - [ ] Print backup paths
- [x] **Pull latest code**:
  - [ ] `git pull origin main` (or specified branch via `--branch` flag)
- [x] **Dependency check**:
  - [ ] Check if ZeroClaw has a newer version; prompt to update (auto-update with `--auto`)
  - [ ] Check if Ollama has a newer version; prompt to update
- [x] **Rebuild application**:
  - [ ] `pnpm install --frozen-lockfile`
  - [ ] `pnpm build`
- [x] **Zero-downtime restart**:
  - [ ] `pm2 reload ecosystem.config.js` (graceful restart, not full stop)
- [x] **Post-update verification**:
  - [ ] Wait 10 seconds, then check pm2 process status
  - [ ] `curl -f http://localhost:3001/health` → verify backend responds
  - [ ] Print: "Update complete. Version: {git describe}"
- [x] **Rollback on failure**:
  - [ ] If backend health check fails: `pm2 reload` with previous build (warn user about rollback)

### `scripts/uninstall-aes.sh` (Clean Removal)

- [x] Create `scripts/uninstall-aes.sh` with `set -euo pipefail`
- [x] **Confirmation prompt**:
  - [ ] Print warning: "This will PERMANENTLY remove AES and all agent data"
  - [ ] Require typing "yes I want to uninstall AES" to proceed (skip with `--force`)
- [x] **Stop services**:
  - [ ] `pm2 delete all && pm2 save`
  - [ ] Stop and disable pm2 startup hook
- [x] **Remove application data** (prompt for each with `--remove-data` to skip prompts):
  - [ ] `/artifacts/` directory (all agent workspaces, git clones)
  - [ ] MongoDB `aes` database: `mongosh aes --eval "db.dropDatabase()"`
  - [ ] Application build files (`apps/backend/dist`, `apps/frontend/.next`)
  - [ ] `.env` file
- [x] **Remove installed components** (all optional, prompt each):
  - [ ] ZeroClaw binary: `rm /usr/local/bin/zeroclaw`
  - [ ] Ollama models: `ollama rm qwen2.5-coder:1.5b` (list all and remove each)
  - [ ] Ollama itself: `systemctl stop ollama && apt-get remove ollama`
  - [ ] MongoDB: `systemctl stop mongod && apt-get remove mongodb-org`
  - [ ] Caddy/Nginx config: remove site config and reload
  - [ ] Docker images used by Librarian MCP containers
- [x] **Final message**:
  - [ ] Print: "AES has been uninstalled. Node.js, pnpm, and pm2 were NOT removed."
  - [ ] List what was and was not removed

### Documentation

- [x] Create `docs/github-app-setup.md`:
  - [ ] Step-by-step: navigate to GitHub → Settings → Developer Settings → GitHub Apps → New GitHub App
  - [ ] App name, description, homepage URL
  - [ ] Required permissions:
    - [ ] Repository: Contents (R/W), Pull Requests (R/W), Issues (R/W), Commit Statuses (R/W)
    - [ ] Organization: Members (Read)
    - [ ] Webhooks: Subscribe to events — `pull_request`, `issue_comment`, `push`, `pull_request_review`
  - [ ] Webhook URL: `https://{DOMAIN}/webhooks/github`
  - [ ] Webhook Secret: generate with `openssl rand -hex 32`
  - [ ] Generate and download private key (.pem file)
  - [ ] Install the app on the target repository
  - [ ] Where to put values in AES project settings (screenshots/diagrams encouraged)

- [x] Create `docs/slack-app-setup.md`:
  - [ ] Step-by-step: api.slack.com → Create New App → From scratch
  - [ ] Required bot token scopes:
    - [ ] `channels:manage` — create channels
    - [ ] `chat:write` — post messages
    - [ ] `chat:write.customize` — **REQUIRED for agent username/icon impersonation**
    - [ ] `users:read` — look up user IDs
    - [ ] `users:read.email` — look up by email
  - [ ] Enable Event Subscriptions: `https://{DOMAIN}/webhooks/slack`
  - [ ] Subscribe to bot events: `message.channels`, `app_mention`
  - [ ] Install app to workspace, copy Bot User OAuth Token
  - [ ] Where to put values in AES project settings

---

## Acceptance Criteria

- [x] `./scripts/setup-aes.sh` runs to completion on a fresh Ubuntu 22.04 VPS without errors
- [x] After setup, AES frontend is accessible at `https://{DOMAIN}`
- [x] `.env` file exists with all required variables and permissions `600`
- [x] Admin user can log in with `ADMIN_EMAIL` and `ADMIN_PASSWORD` after setup
- [x] ZeroClaw binary responds to `zeroclaw --version`
- [x] Ollama responds and `qwen2.5-coder:1.5b` is available
- [x] MongoDB is running and `aes` database exists
- [x] `./scripts/update-aes.sh` pulls latest code, rebuilds, and reloads pm2 without full downtime
- [x] `./scripts/update-aes.sh` creates a MongoDB backup before updating
- [x] `./scripts/uninstall-aes.sh` stops all services and removes application data after confirmation
- [x] Uninstall does NOT remove Node.js, pnpm, or pm2 unless explicitly requested
- [x] GitHub App guide accurately describes all required permissions and webhook setup
- [x] Slack App guide includes `chat:write.customize` scope (required for agent impersonation)

---

## Dependencies
- **Depends on**: All backend stories (0000001 through 0000026)
