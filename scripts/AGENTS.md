# Scripts Agent Guide — scripts/

You are working on the **deployment and lifecycle management scripts** for the AES system.

## Purpose
This folder contains shell scripts for installing, updating, and removing AES on a production VPS.

## Files in This Folder

```
scripts/
├── AGENTS.md          ← This file
├── setup-aes.sh       ← Fresh installation script (story 0000022)
├── update-aes.sh      ← Zero-downtime update script (story 0000022)
└── uninstall-aes.sh   ← Clean removal script (story 0000022)
```

## Shell Script Standards

All scripts MUST follow these conventions:

```bash
#!/usr/bin/env bash
set -euo pipefail
# set -e  → exit on error
# set -u  → error on undefined variable
# set -o pipefail → catch errors in pipes
```

### Safety Rules
- NEVER run destructive operations without a confirmation prompt
- NEVER print passwords or secrets to console output (print a reminder to save them)
- Always back up `.env` and MongoDB data before making changes
- Validate user input before using it in commands
- Quote all variables: `"$VAR"` not `$VAR`
- Check for command availability before using it: `command -v docker >/dev/null 2>&1`

### Color Output (for readability)
```bash
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
```

### Interactive Prompts
```bash
# Read with default value
read -p "Enter domain name [aes.example.com]: " DOMAIN
DOMAIN="${DOMAIN:-aes.example.com}"

# Yes/no confirmation
read -p "Continue? [y/N]: " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { log_info "Aborted."; exit 0; }
```

### Non-Interactive Mode
All scripts support `--non-interactive` / `--force` flags to skip prompts for automation:
```bash
NON_INTERACTIVE=false
for arg in "$@"; do
  case $arg in
    --non-interactive) NON_INTERACTIVE=true ;;
    --force) FORCE=true ;;
  esac
done
```

## Target Environment
- **OS**: Ubuntu 22.04 LTS (primary), Ubuntu 20.04+ and Debian 11+ (supported)
- **Run as**: root or sudo-capable user
- **Minimum RAM**: 4GB (warn), 2GB (error)
- **Installed by setup-aes.sh**: Docker CE, Node.js LTS (via nvm), pnpm, pm2, MongoDB 8.0, ZeroClaw, Ollama

## Story Reference
- Story 0000022 implements all three scripts
- See `plans/knowledge-base/08-deployment.md` for architecture context
