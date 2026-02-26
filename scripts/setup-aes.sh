#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# AES Setup Script — Fresh Installation
# Usage: ./scripts/setup-aes.sh [--non-interactive]
# =============================================================================

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

NON_INTERACTIVE=false
for arg in "$@"; do [[ "$arg" == "--non-interactive" ]] && NON_INTERACTIVE=true; done

AES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
preflight() {
  info "Running pre-flight checks..."

  # OS check
  if [[ -f /etc/os-release ]]; then
    # shellcheck source=/dev/null
    . /etc/os-release
    if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
      warn "This script is tested on Ubuntu 20.04+ / Debian 11+. Proceeding anyway."
    fi
  fi

  # Root / sudo check
  if [[ $EUID -ne 0 ]]; then
    command -v sudo &>/dev/null || error "This script requires root or sudo access."
    SUDO="sudo"
  else
    SUDO=""
  fi
  export SUDO

  # Internet connectivity
  curl -fs --max-time 5 https://github.com &>/dev/null || error "No internet connectivity detected."

  # RAM check
  local ram_kb
  ram_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
  local ram_gb=$(( ram_kb / 1024 / 1024 ))
  if (( ram_gb < 2 )); then
    error "Minimum 2GB RAM required. Found: ${ram_gb}GB"
  elif (( ram_gb < 4 )); then
    warn "Recommended minimum is 4GB RAM. Found: ${ram_gb}GB"
  fi

  success "Pre-flight checks passed."
}

# ---------------------------------------------------------------------------
# Interactive configuration
# ---------------------------------------------------------------------------
configure() {
  info "Configuring AES installation..."

  # Load existing .env as defaults if present
  if [[ -f "${AES_DIR}/.env" ]]; then
    info "Found existing .env — using its values as defaults."
    # shellcheck source=/dev/null
    set -o allexport; . "${AES_DIR}/.env"; set +o allexport
  fi

  # Derive defaults from loaded .env where keys differ
  APP_NAME="${APP_NAME:-AES}"
  DOMAIN="${DOMAIN:-${NEXT_PUBLIC_BACKEND_WS_URL:-localhost}}"
  DOMAIN="${DOMAIN#https://}"  # strip https:// prefix if sourced from WS URL
  ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
  MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/aes}"
  DEFAULT_OLLAMA_MODEL="${DEFAULT_OLLAMA_MODEL:-qwen2.5-coder:1.5b}"
  PROXY_TYPE="${PROXY_TYPE:-caddy}"
  if [[ "$MONGODB_URI" == "mongodb://localhost:27017/aes" ]]; then
    MONGODB_MODE="local"
  else
    MONGODB_MODE="external"
  fi

  if $NON_INTERACTIVE; then
    ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(openssl rand -base64 16)}"
  else
    read -rp "App Name [${APP_NAME}]: " _input; APP_NAME="${_input:-${APP_NAME}}"
    read -rp "Public domain (e.g. aes.example.com) [${DOMAIN}]: " _input; DOMAIN="${_input:-${DOMAIN}}"
    read -rp "Admin email [${ADMIN_EMAIL}]: " _input; ADMIN_EMAIL="${_input:-${ADMIN_EMAIL}}"

    while true; do
      read -rsp "Admin password (leave blank to keep existing, min 6 chars): " _input; echo
      if [[ -z "$_input" && -n "${ADMIN_PASSWORD:-}" ]]; then
        break  # keep existing password
      elif [[ ${#_input} -ge 6 ]]; then
        ADMIN_PASSWORD="$_input"
        break
      fi
      warn "Password must be at least 6 characters (or leave blank to keep existing)."
    done

    read -rp "MongoDB: (L)ocal install or (E)xternal URI? [${MONGODB_MODE^^:0:1}]: " mongo_choice
    if [[ "${mongo_choice,,}" == "e" ]]; then
      read -rp "MongoDB URI [${MONGODB_URI}]: " _input; MONGODB_URI="${_input:-${MONGODB_URI}}"
      MONGODB_MODE="external"
    else
      if [[ "${mongo_choice,,}" != "e" && "$MONGODB_MODE" == "external" && -z "${mongo_choice}" ]]; then
        : # keep existing external URI
      else
        MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/aes}"
        MONGODB_MODE="local"
      fi
    fi

    read -rp "Default Ollama model [${DEFAULT_OLLAMA_MODEL}]: " _input
    DEFAULT_OLLAMA_MODEL="${_input:-${DEFAULT_OLLAMA_MODEL}}"

    read -rp "Reverse proxy — (C)addy or (N)ginx? [${PROXY_TYPE^^:0:1}]: " proxy_choice
    if [[ "${proxy_choice,,}" == "n" ]]; then PROXY_TYPE="nginx"; elif [[ "${proxy_choice,,}" == "c" ]]; then PROXY_TYPE="caddy"; fi
  fi
}

# ---------------------------------------------------------------------------
# Install system dependencies
# ---------------------------------------------------------------------------
install_deps() {
  info "Installing system dependencies..."
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq curl git build-essential apt-transport-https ca-certificates gnupg lsb-release

  # Docker CE
  if ! command -v docker &>/dev/null; then
    info "Installing Docker CE..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
      https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
      $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
    $SUDO apt-get update -qq
    $SUDO apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    $SUDO systemctl enable docker --now
  fi

  # Node.js via nvm
  if ! command -v node &>/dev/null; then
    info "Installing Node.js LTS via nvm..."
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    # shellcheck source=/dev/null
    export NVM_DIR="$HOME/.nvm"
    [[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh"
    nvm install --lts
    nvm alias default node
  fi

  # pnpm
  if ! command -v pnpm &>/dev/null; then
    npm install -g pnpm
  fi

  # pm2
  if ! command -v pm2 &>/dev/null; then
    pnpm add -g pm2
  fi

  success "System dependencies installed."
}

# ---------------------------------------------------------------------------
# Install MongoDB 8.0 (Docker)
# ---------------------------------------------------------------------------
install_mongodb() {
  if [[ "$MONGODB_MODE" != "local" ]]; then return; fi
  info "Starting MongoDB 8.0 via Docker..."
  cat > /tmp/docker-compose-mongodb.yml <<EOF
version: '3.8'
services:
  mongodb:
    image: mongo:8.0
    container_name: aes-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - aes_mongo_data:/data/db
volumes:
  aes_mongo_data:
EOF
  $SUDO docker compose -f /tmp/docker-compose-mongodb.yml up -d
  success "MongoDB 8.0 started."
}

# ---------------------------------------------------------------------------
# Install ZeroClaw
# ---------------------------------------------------------------------------
install_zeroclaw() {
  info "Installing ZeroClaw..."
  local arch; arch=$(uname -m)
  local os; os=$(uname -s | tr '[:upper:]' '[:lower:]')
  local latest_url="https://github.com/zeroclaw-labs/zeroclaw/releases/latest/download/zeroclaw-${os}-${arch}"

  if curl -fsSL "$latest_url" -o /tmp/zeroclaw 2>/dev/null; then
    $SUDO install -m 755 /tmp/zeroclaw /usr/local/bin/zeroclaw
    zeroclaw --version && success "ZeroClaw installed." || warn "ZeroClaw installed but --version check failed."
  else
    warn "Could not download ZeroClaw automatically. Install manually from https://github.com/zeroclaw-labs/zeroclaw/releases"
  fi
}

# ---------------------------------------------------------------------------
# Install Ollama
# ---------------------------------------------------------------------------
install_ollama() {
  info "Installing Ollama..."
  if ! command -v ollama &>/dev/null; then
    curl -fsSL https://ollama.ai/install.sh | sh
    $SUDO systemctl enable ollama --now 2>/dev/null || true
    sleep 3
  fi

  info "Pulling default model: ${DEFAULT_OLLAMA_MODEL} (this may take several minutes)..."
  ollama pull "${DEFAULT_OLLAMA_MODEL}" || warn "Could not pull model. Run: ollama pull ${DEFAULT_OLLAMA_MODEL}"
  success "Ollama ready."
}

# ---------------------------------------------------------------------------
# Generate .env file
# ---------------------------------------------------------------------------
generate_env() {
  info "Generating .env file..."
  local JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
  local AES_ENCRYPTION_KEY="${AES_ENCRYPTION_KEY:-$(openssl rand -hex 32)}"

  cat > "${AES_DIR}/.env" <<EOF
APP_NAME=${APP_NAME}
NEXT_PUBLIC_APP_NAME=${APP_NAME}

MONGODB_URI=${MONGODB_URI}

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

AES_ENCRYPTION_KEY=${AES_ENCRYPTION_KEY}

ZEROCLAW_BINARY_PATH=/usr/local/bin/zeroclaw
OLLAMA_ENDPOINT=http://localhost:11434
ARTIFACTS_ROOT=/artifacts

ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_NAME=Administrator

BACKEND_PORT=3001
FRONTEND_PORT=3000
BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_WS_URL=https://${DOMAIN}
EOF

  chmod 600 "${AES_DIR}/.env"
  success ".env file created with 600 permissions."
}

# ---------------------------------------------------------------------------
# Create artifacts directory
# ---------------------------------------------------------------------------
create_artifacts() {
  info "Creating /artifacts directory..."
  $SUDO mkdir -p /artifacts
  $SUDO chown -R "${USER:-root}:${USER:-root}" /artifacts
  success "/artifacts created."
}

# ---------------------------------------------------------------------------
# Build application
# ---------------------------------------------------------------------------
build_app() {
  info "Installing dependencies and building application..."
  cd "${AES_DIR}"
  pnpm install --frozen-lockfile
  pnpm build
  success "Application built."
}

# ---------------------------------------------------------------------------
# Configure pm2
# ---------------------------------------------------------------------------
configure_pm2() {
  info "Configuring pm2..."
  cat > "${AES_DIR}/ecosystem.config.js" <<EOF
module.exports = {
  apps: [
    {
      name: 'aes-backend',
      script: 'apps/backend/dist/main.js',
      cwd: '${AES_DIR}',
      env_file: '${AES_DIR}/.env',
      instances: 1,
      autorestart: true,
      watch: false,
    },
    {
      name: 'aes-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '${AES_DIR}/apps/frontend',
      env_file: '${AES_DIR}/.env',
      instances: 1,
      autorestart: true,
    },
  ],
};
EOF

  cd "${AES_DIR}"
  pm2 start ecosystem.config.js
  pm2 save
  local pm2_startup_cmd; pm2_startup_cmd=$(pm2 startup | tail -1)
  eval "$SUDO $pm2_startup_cmd" 2>/dev/null || true
  success "pm2 configured and started."
}

# ---------------------------------------------------------------------------
# Configure reverse proxy
# ---------------------------------------------------------------------------
configure_proxy() {
  info "Configuring reverse proxy (${PROXY_TYPE})..."
  if [[ "$PROXY_TYPE" == "caddy" ]]; then
    if ! command -v caddy &>/dev/null; then
      $SUDO apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | $SUDO gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | $SUDO tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null
      $SUDO apt-get update -qq && $SUDO apt-get install -y -qq caddy
    fi
    local caddy_host="${DOMAIN}"
    if [[ "$DOMAIN" == "localhost" || "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      caddy_host=":80"
    fi
    $SUDO tee /etc/caddy/Caddyfile > /dev/null <<EOF
${caddy_host} {
  handle /api/* {
    uri strip_prefix /api
    reverse_proxy localhost:3001
  }
  handle /webhooks/* {
    reverse_proxy localhost:3001
  }
  handle /socket.io/* {
    reverse_proxy localhost:3001
  }
  handle {
    reverse_proxy localhost:3000
  }
}
EOF
    $SUDO systemctl enable caddy 2>/dev/null || true
    $SUDO systemctl restart caddy
  else
    # Nginx
    if ! command -v nginx &>/dev/null; then
      $SUDO apt-get install -y -qq nginx certbot python3-certbot-nginx
    fi
    $SUDO tee /etc/nginx/sites-available/aes.conf > /dev/null <<EOF
server {
  listen 80;
  server_name ${DOMAIN};

  location /api/ { rewrite ^/api/(.*) /\$1 break; proxy_pass http://localhost:3001; proxy_set_header Host \$host; }
  location /webhooks/ { proxy_pass http://localhost:3001; proxy_set_header Host \$host; }
  location /socket.io/ { proxy_pass http://localhost:3001; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection "upgrade"; }
  location / { proxy_pass http://localhost:3000; proxy_set_header Host \$host; }
}
EOF
    $SUDO ln -sf /etc/nginx/sites-available/aes.conf /etc/nginx/sites-enabled/aes.conf
    $SUDO nginx -t && $SUDO systemctl reload nginx

    if [[ "$DOMAIN" != "localhost" ]]; then
      $SUDO certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${ADMIN_EMAIL}" || warn "SSL cert setup failed. Run: certbot --nginx -d ${DOMAIN}"
    fi
  fi
  success "Reverse proxy configured."
}

# ---------------------------------------------------------------------------
# Post-install summary
# ---------------------------------------------------------------------------
summary() {
  echo ""
  echo -e "${GREEN}============================================${NC}"
  echo -e "${GREEN}  AES Installation Complete!${NC}"
  echo -e "${GREEN}============================================${NC}"
  echo ""
  echo "  Frontend: https://${DOMAIN}"
  echo "  Backend:  https://${DOMAIN}/api"
  echo "  Admin:    ${ADMIN_EMAIL}"
  echo ""
  echo -e "${YELLOW}  IMPORTANT: Save your admin password securely — it was NOT printed here.${NC}"
  echo ""
  echo "  Next steps:"
  echo "  1. Configure GitHub App:  docs/github-app-setup.md"
  echo "  2. Configure Slack App:   docs/slack-app-setup.md"
  echo ""
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  echo -e "${BLUE}"
  echo "  ┌─────────────────────────────────────┐"
  echo "  │   AES — Agentic Engineering System  │"
  echo "  │          Setup Script               │"
  echo "  └─────────────────────────────────────┘"
  echo -e "${NC}"

  preflight
  configure
  install_deps
  install_mongodb
  install_zeroclaw
  install_ollama
  generate_env
  create_artifacts
  build_app
  configure_pm2
  configure_proxy
  summary
}

main
