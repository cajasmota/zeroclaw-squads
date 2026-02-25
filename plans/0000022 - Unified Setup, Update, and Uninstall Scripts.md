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
  - [x] Verify OS: Ubuntu 20.04+ or Debian 11+ (warn on other systems)
  - [x] Verify running as root or with sudo access
  - [x] Verify internet connectivity
  - [x] Check minimum RAM (warn if < 4GB, error if < 2GB)
- [x] **Interactive configuration** (with defaults, skippable via `--non-interactive` flag):
  - [x] `APP_NAME` (default: "AES")
  - [x] `DOMAIN` — the public domain name (e.g., `aes.example.com`)
  - [x] `ADMIN_EMAIL` — first admin user email
  - [x] `ADMIN_PASSWORD` — first admin user password (min 6 chars, validated)
  - [x] MongoDB: local install OR external URI (`MONGODB_URI`)
  - [x] Default Ollama model (default: `qwen2.5-coder:1.5b`)
  - [x] SSL: Caddy (auto HTTPS) or Nginx + certbot
- [x] **Install system dependencies**:
  - [x] `apt-get update && apt-get install -y curl git build-essential`
  - [x] Docker CE + Docker Compose plugin (via official Docker repo)
  - [x] Node.js LTS via nvm (`~/.nvm/`)
  - [x] pnpm: `npm install -g pnpm`
  - [x] pm2: `pnpm add -g pm2`
- [x] **Install MongoDB 8.0** (if local install chosen):
  - [x] Add MongoDB 8.0 official docker image and create a container with docker compose 
- [x] **Install ZeroClaw**:
  - [x] Download latest release binary from `https://github.com/zeroclaw-labs/zeroclaw/releases`
  - [x] Place at `/usr/local/bin/zeroclaw`
  - [x] `chmod +x /usr/local/bin/zeroclaw`
  - [x] Verify: `zeroclaw --version`
- [x] **Install Ollama**:
  - [x] `curl -fsSL https://ollama.ai/install.sh | sh`
  - [x] Enable and start `ollama` systemd service
  - [x] Pull default model: `ollama pull qwen2.5-coder:1.5b`
- [x] **Clone/copy application** (if not already present):
  - [x] Copy source to `/opt/aes/` or use current directory
- [x] **Generate `.env` file** at app root:
  - [x] `APP_NAME` (from user input)
  - [x] `NEXT_PUBLIC_APP_NAME` (same value)
  - [x] `MONGODB_URI` (local or provided)
  - [x] `JWT_SECRET` — auto-generate: `openssl rand -hex 32`
  - [x] `JWT_EXPIRES_IN=7d`
  - [x] `AES_ENCRYPTION_KEY` — auto-generate: `openssl rand -hex 32`
  - [x] `ZEROCLAW_BINARY_PATH=/usr/local/bin/zeroclaw`
  - [x] `OLLAMA_ENDPOINT=http://localhost:11434`
  - [x] `ARTIFACTS_ROOT=/artifacts`
  - [x] `ADMIN_EMAIL` (from user input)
  - [x] `ADMIN_PASSWORD` (from user input)
  - [x] `ADMIN_NAME=Administrator`
  - [x] `BACKEND_PORT=3001`
  - [x] `FRONTEND_PORT=3000`
  - [x] Set file permissions: `chmod 600 .env`
- [x] **Create artifacts directory**:
  - [x] `mkdir -p /artifacts && chown -R $USER:$USER /artifacts`
- [x] **Build application**:
  - [x] `pnpm install --frozen-lockfile`
  - [x] `pnpm build`
- [x] **Start with pm2**:
  - [x] Create `ecosystem.config.js` for pm2 (backend + frontend processes)
  - [x] `pm2 start ecosystem.config.js`
  - [x] `pm2 save && pm2 startup` (survive reboots)
- [x] **Configure reverse proxy**:
  - [x] Check and choose if Caddy or Nginx is installed, if none, ask the user which one to install and proceed with instalation
  - [x] If Caddy: generate `/etc/caddy/Caddyfile` with auto HTTPS, proxy to backend (`:3001`) and frontend (`:3000`)
  - [x] If Nginx: generate `/etc/nginx/sites-available/aes.conf`
  - [x] Check if SSL certificates exist
  - [x] Run certbot for SSL or equivalently Let's encrypt script for Caddy (Skip if certificates already exist)
  - [x] Reload/restart proxy
- [x] **Post-install summary**:
  - [x] Print: frontend URL, backend URL, admin email
  - [x] Print next steps: configure GitHub App, configure Slack App
  - [x] Print links to `docs/github-app-setup.md` and `docs/slack-app-setup.md`
  - [x] **Do NOT print the admin password** to console; remind user to save it

### `scripts/update-aes.sh` (Update Existing Installation)

- [x] Create `scripts/update-aes.sh` with `set -euo pipefail`
- [x] **Pre-flight**:
  - [x] Check AES is installed (`.env` exists and pm2 process is running)
  - [x] Backup `.env` file to `.env.backup.{timestamp}`
  - [x] Backup MongoDB: `mongodump --out /tmp/aes-backup-{timestamp}/`
  - [x] Print backup paths
- [x] **Pull latest code**:
  - [x] `git pull origin main` (or specified branch via `--branch` flag)
- [x] **Dependency check**:
  - [x] Check if ZeroClaw has a newer version; prompt to update (auto-update with `--auto`)
  - [x] Check if Ollama has a newer version; prompt to update
- [x] **Rebuild application**:
  - [x] `pnpm install --frozen-lockfile`
  - [x] `pnpm build`
- [x] **Zero-downtime restart**:
  - [x] `pm2 reload ecosystem.config.js` (graceful restart, not full stop)
- [x] **Post-update verification**:
  - [x] Wait 10 seconds, then check pm2 process status
  - [x] `curl -f http://localhost:3001/health` → verify backend responds
  - [x] Print: "Update complete. Version: {git describe}"
- [x] **Rollback on failure**:
  - [x] If backend health check fails: `pm2 reload` with previous build (warn user about rollback)

### `scripts/uninstall-aes.sh` (Clean Removal)

- [x] Create `scripts/uninstall-aes.sh` with `set -euo pipefail`
- [x] **Confirmation prompt**:
  - [x] Print warning: "This will PERMANENTLY remove AES and all agent data"
  - [x] Require typing "yes I want to uninstall AES" to proceed (skip with `--force`)
- [x] **Stop services**:
  - [x] `pm2 delete all && pm2 save`
  - [x] Stop and disable pm2 startup hook
- [x] **Remove application data** (prompt for each with `--remove-data` to skip prompts):
  - [x] `/artifacts/` directory (all agent workspaces, git clones)
  - [x] MongoDB `aes` database: `mongosh aes --eval "db.dropDatabase()"`
  - [x] Application build files (`apps/backend/dist`, `apps/frontend/.next`)
  - [x] `.env` file
- [x] **Remove installed components** (all optional, prompt each):
  - [x] ZeroClaw binary: `rm /usr/local/bin/zeroclaw`
  - [x] Ollama models: `ollama rm qwen2.5-coder:1.5b` (list all and remove each)
  - [x] Ollama itself: `systemctl stop ollama && apt-get remove ollama`
  - [x] MongoDB: `systemctl stop mongod && apt-get remove mongodb-org`
  - [x] Caddy/Nginx config: remove site config and reload
  - [x] Docker images used by Librarian MCP containers
- [x] **Final message**:
  - [x] Print: "AES has been uninstalled. Node.js, pnpm, and pm2 were NOT removed."
  - [x] List what was and was not removed

### Documentation

- [x] Create `docs/github-app-setup.md`:
  - [x] Step-by-step: navigate to GitHub → Settings → Developer Settings → GitHub Apps → New GitHub App
  - [x] App name, description, homepage URL
  - [x] Required permissions:
    - [x] Repository: Contents (R/W), Pull Requests (R/W), Issues (R/W), Commit Statuses (R/W)
    - [x] Organization: Members (Read)
    - [x] Webhooks: Subscribe to events — `pull_request`, `issue_comment`, `push`, `pull_request_review`
  - [x] Webhook URL: `https://{DOMAIN}/webhooks/github`
  - [x] Webhook Secret: generate with `openssl rand -hex 32`
  - [x] Generate and download private key (.pem file)
  - [x] Install the app on the target repository
  - [x] Where to put values in AES project settings (screenshots/diagrams encouraged)

- [x] Create `docs/slack-app-setup.md`:
  - [x] Step-by-step: api.slack.com → Create New App → From scratch
  - [x] Required bot token scopes:
    - [x] `channels:manage` — create channels
    - [x] `chat:write` — post messages
    - [x] `chat:write.customize` — **REQUIRED for agent username/icon impersonation**
    - [x] `users:read` — look up user IDs
    - [x] `users:read.email` — look up by email
  - [x] Enable Event Subscriptions: `https://{DOMAIN}/webhooks/slack`
  - [x] Subscribe to bot events: `message.channels`, `app_mention`
  - [x] Install app to workspace, copy Bot User OAuth Token
  - [x] Where to put values in AES project settings

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
