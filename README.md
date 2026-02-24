# AES — Agentic Engineering System

An autonomous software development environment powered by specialized AI agents.

## Prerequisites

- Node.js 20+
- pnpm 9+
- MongoDB 8.0
- ZeroClaw binary (`brew install zeroclaw` or download from releases)

## Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd squads-v2

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Install dependencies
pnpm install

# 4. Start development servers
pnpm dev
```

Backend runs on `http://localhost:3001`
Frontend runs on `http://localhost:3000`

## Architecture

- **Backend**: NestJS (Node.js) in `apps/backend/`
- **Frontend**: Next.js App Router in `apps/frontend/`
- **Shared Types**: `packages/types/`
- **Agent Runtime**: ZeroClaw (Rust binary)
- **Database**: MongoDB 8.0

## Commands

```bash
pnpm install          # install all dependencies
pnpm dev              # start backend + frontend
pnpm build            # production build
pnpm test             # run all tests
pnpm --filter=backend test   # backend tests only
pnpm --filter=frontend test  # frontend tests only
```

## Environment Variables

See `.env.example` for all required variables.
