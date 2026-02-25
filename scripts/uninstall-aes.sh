#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# AES Uninstall Script — Clean Removal
# Usage: ./scripts/uninstall-aes.sh [--force] [--remove-data]
# =============================================================================

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

FORCE=false
REMOVE_DATA=false
for arg in "$@"; do
  case $arg in
    --force)       FORCE=true ;;
    --remove-data) REMOVE_DATA=true ;;
  esac
done

AES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

confirm_or_skip() {
  local prompt="$1"
  if $REMOVE_DATA; then return 0; fi
  read -rp "${prompt} [y/N]: " answer
  [[ "${answer,,}" == "y" ]]
}

# ---------------------------------------------------------------------------
# Confirmation
# ---------------------------------------------------------------------------
confirm_uninstall() {
  if $FORCE; then return; fi

  echo -e "${RED}"
  echo "  ╔══════════════════════════════════════════════════╗"
  echo "  ║  WARNING: This will PERMANENTLY remove AES and  ║"
  echo "  ║  all agent data, workspaces, and databases.     ║"
  echo "  ╚══════════════════════════════════════════════════╝"
  echo -e "${NC}"

  read -rp "Type exactly: yes I want to uninstall AES  > " confirm
  if [[ "$confirm" != "yes I want to uninstall AES" ]]; then
    info "Uninstall cancelled."
    exit 0
  fi
}

# ---------------------------------------------------------------------------
# Stop services
# ---------------------------------------------------------------------------
stop_services() {
  info "Stopping AES pm2 processes..."
  if command -v pm2 &>/dev/null; then
    pm2 delete all 2>/dev/null || true
    pm2 save 2>/dev/null || true
    pm2 unstartup 2>/dev/null | sudo bash 2>/dev/null || true
  fi
  success "pm2 processes stopped."
}

# ---------------------------------------------------------------------------
# Remove application data
# ---------------------------------------------------------------------------
remove_data() {
  if confirm_or_skip "Remove /artifacts directory (all agent workspaces)?"; then
    sudo rm -rf /artifacts
    success "Removed /artifacts"
  fi

  if confirm_or_skip "Drop MongoDB 'aes' database?"; then
    if command -v mongosh &>/dev/null; then
      mongosh aes --eval "db.dropDatabase()" &>/dev/null || warn "Failed to drop MongoDB database."
      success "MongoDB 'aes' database dropped."
    elif docker ps | grep -q aes-mongodb; then
      docker exec aes-mongodb mongosh aes --eval "db.dropDatabase()" &>/dev/null || true
      success "MongoDB 'aes' database dropped via Docker."
    else
      warn "Could not connect to MongoDB. Drop manually if needed."
    fi
  fi

  if confirm_or_skip "Remove build artifacts (.next, dist)?"; then
    rm -rf "${AES_DIR}/apps/backend/dist" "${AES_DIR}/apps/frontend/.next"
    success "Build artifacts removed."
  fi

  if confirm_or_skip "Remove .env file?"; then
    rm -f "${AES_DIR}/.env"
    success ".env removed."
  fi
}

# ---------------------------------------------------------------------------
# Remove installed components
# ---------------------------------------------------------------------------
remove_components() {
  if confirm_or_skip "Remove ZeroClaw binary (/usr/local/bin/zeroclaw)?"; then
    sudo rm -f /usr/local/bin/zeroclaw
    success "ZeroClaw removed."
  fi

  if confirm_or_skip "Remove Ollama models?"; then
    if command -v ollama &>/dev/null; then
      ollama list | awk 'NR>1 {print $1}' | while read -r model; do
        ollama rm "$model" 2>/dev/null || true
        info "Removed model: $model"
      done
    fi
  fi

  if confirm_or_skip "Remove Ollama itself?"; then
    sudo systemctl stop ollama 2>/dev/null || true
    sudo apt-get remove -y ollama 2>/dev/null || true
    success "Ollama removed."
  fi

  if confirm_or_skip "Remove MongoDB Docker container and data?"; then
    docker rm -f aes-mongodb 2>/dev/null || true
    docker volume rm aes_mongo_data 2>/dev/null || true
    success "MongoDB Docker container removed."
  fi

  if confirm_or_skip "Remove Caddy/Nginx configuration for AES?"; then
    sudo rm -f /etc/caddy/Caddyfile 2>/dev/null || true
    sudo rm -f /etc/nginx/sites-enabled/aes.conf /etc/nginx/sites-available/aes.conf 2>/dev/null || true
    sudo systemctl reload caddy 2>/dev/null || true
    sudo systemctl reload nginx 2>/dev/null || true
    success "Reverse proxy configuration removed."
  fi

  if confirm_or_skip "Remove Librarian Docker containers?"; then
    docker rm -f parser-engine graph-engine 2>/dev/null || true
    success "Librarian containers removed."
  fi
}

# ---------------------------------------------------------------------------
# Final message
# ---------------------------------------------------------------------------
summary() {
  echo ""
  echo -e "${GREEN}AES has been uninstalled.${NC}"
  echo ""
  echo "  The following were NOT removed:"
  echo "  - Node.js / nvm"
  echo "  - pnpm"
  echo "  - pm2"
  echo "  - Docker CE"
  echo "  - Git"
  echo ""
  echo "  The AES source code at ${AES_DIR} was NOT removed."
  echo "  To remove it: rm -rf ${AES_DIR}"
  echo ""
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  confirm_uninstall
  stop_services
  remove_data
  remove_components
  summary
}

main
