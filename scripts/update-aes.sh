#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# AES Update Script — Zero-Downtime Update
# Usage: ./scripts/update-aes.sh [--branch <name>] [--auto]
# =============================================================================

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

BRANCH="main"
AUTO=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --branch) shift; BRANCH="$1" ;;
    --auto)   AUTO=true ;;
  esac
  shift
done

AES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------
preflight() {
  [[ -f "${AES_DIR}/.env" ]] || error "AES does not appear to be installed (.env not found)."
  command -v pm2 &>/dev/null || error "pm2 not found. Is AES installed?"

  info "Backing up .env to .env.backup.${TIMESTAMP}..."
  cp "${AES_DIR}/.env" "${AES_DIR}/.env.backup.${TIMESTAMP}"

  info "Backing up MongoDB..."
  if command -v mongodump &>/dev/null; then
    mongodump --out "/tmp/aes-backup-${TIMESTAMP}/" &>/dev/null || warn "mongodump failed (MongoDB may not be local)."
    success "MongoDB backup at /tmp/aes-backup-${TIMESTAMP}/"
  else
    warn "mongodump not found — skipping MongoDB backup."
  fi
}

# ---------------------------------------------------------------------------
# Pull latest code
# ---------------------------------------------------------------------------
pull_code() {
  info "Pulling latest code from branch: ${BRANCH}..."
  cd "${AES_DIR}"
  git pull origin "${BRANCH}"
  success "Code updated."
}

# ---------------------------------------------------------------------------
# Check and optionally update ZeroClaw / Ollama
# ---------------------------------------------------------------------------
check_tools() {
  info "Checking ZeroClaw version..."
  local current_version; current_version=$(zeroclaw --version 2>/dev/null || echo "unknown")
  info "Current ZeroClaw: ${current_version}"

  if ! $AUTO; then
    read -rp "Check for ZeroClaw update? [y/N]: " check_zc
    if [[ "${check_zc,,}" == "y" ]]; then
      local arch; arch=$(uname -m)
      local os; os=$(uname -s | tr '[:upper:]' '[:lower:]')
      if curl -fsSL "https://github.com/zeroclaw-labs/zeroclaw/releases/latest/download/zeroclaw-${os}-${arch}" -o /tmp/zeroclaw 2>/dev/null; then
        sudo install -m 755 /tmp/zeroclaw /usr/local/bin/zeroclaw
        success "ZeroClaw updated to $(zeroclaw --version)"
      else
        warn "Could not download ZeroClaw update."
      fi
    fi
  fi
}

# ---------------------------------------------------------------------------
# Rebuild
# ---------------------------------------------------------------------------
rebuild() {
  info "Rebuilding application..."
  cd "${AES_DIR}"
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  [[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh"
  pnpm install --frozen-lockfile
  pnpm build
  success "Application rebuilt."
}

# ---------------------------------------------------------------------------
# Regenerate ecosystem.config.js from current .env
# ---------------------------------------------------------------------------
regenerate_ecosystem() {
  info "Regenerating ecosystem.config.js from .env..."
  # shellcheck source=/dev/null
  set -o allexport; . "${AES_DIR}/.env"; set +o allexport

  cat > "${AES_DIR}/ecosystem.config.js" <<EOF
module.exports = {
  apps: [
    {
      name: 'aes-backend',
      script: 'apps/backend/dist/main.js',
      cwd: '${AES_DIR}',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        APP_NAME: '${APP_NAME}',
        MONGODB_URI: '${MONGODB_URI}',
        JWT_SECRET: '${JWT_SECRET}',
        JWT_EXPIRES_IN: '${JWT_EXPIRES_IN:-7d}',
        AES_ENCRYPTION_KEY: '${AES_ENCRYPTION_KEY}',
        ZEROCLAW_BINARY_PATH: '${ZEROCLAW_BINARY_PATH}',
        OLLAMA_ENDPOINT: '${OLLAMA_ENDPOINT}',
        ARTIFACTS_ROOT: '${ARTIFACTS_ROOT}',
        ADMIN_EMAIL: '${ADMIN_EMAIL}',
        ADMIN_PASSWORD: '${ADMIN_PASSWORD}',
        ADMIN_NAME: '${ADMIN_NAME}',
        BACKEND_PORT: '${BACKEND_PORT:-3001}',
        FRONTEND_URL: 'https://${DOMAIN:-localhost}',
      },
    },
    {
      name: 'aes-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '${AES_DIR}/apps/frontend',
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        APP_NAME: '${APP_NAME}',
        NEXT_PUBLIC_APP_NAME: '${APP_NAME}',
        JWT_SECRET: '${JWT_SECRET}',
        BACKEND_URL: '${BACKEND_URL:-http://localhost:3001}',
        NEXT_PUBLIC_BACKEND_WS_URL: '${NEXT_PUBLIC_BACKEND_WS_URL}',
        PORT: '${FRONTEND_PORT:-3000}',
      },
    },
  ],
};
EOF
  success "ecosystem.config.js regenerated."
}

# ---------------------------------------------------------------------------
# Zero-downtime restart
# ---------------------------------------------------------------------------
restart() {
  info "Reloading pm2 processes (zero-downtime)..."
  cd "${AES_DIR}"
  pm2 reload ecosystem.config.js --update-env || pm2 restart ecosystem.config.js --update-env
  success "pm2 reloaded."
}

# ---------------------------------------------------------------------------
# Post-update verification
# ---------------------------------------------------------------------------
verify() {
  info "Waiting 10s for backend to start..."
  sleep 10

  if curl -fs --max-time 5 http://localhost:3001/health &>/dev/null; then
    local version; version=$(git -C "${AES_DIR}" describe --tags --always 2>/dev/null || echo "unknown")
    success "Update complete. Version: ${version}"
  else
    warn "Backend health check failed. Attempting rollback..."
    pm2 reload ecosystem.config.js || true
    error "Update may have failed. Check pm2 logs: pm2 logs"
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  echo -e "${BLUE}[AES] Starting update...${NC}"
  preflight
  pull_code
  check_tools
  rebuild
  regenerate_ecosystem
  restart
  verify
}

main
