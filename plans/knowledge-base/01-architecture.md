# AES Knowledge Base — Architecture

## Component Map

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│  /projects  /projects/[id]  /templates  /settings/models│
└──────────────────────┬──────────────────────────────────┘
                       │ REST/WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                  NestJS Backend (Control Plane)           │
│  - Agent Lifecycle Manager (spawn / kill / signal)       │
│  - Slack Event Router                                    │
│  - GitHub Webhook Processor                              │
│  - Log Aggregator (tags runId + ticketId)                │
│  - Avatar Generator (brandColor overlay)                 │
└──────┬──────────────────────────────┬────────────────────┘
       │ child_process.spawn          │ MongoDB Driver
       │                              │
┌──────▼───────┐              ┌───────▼──────┐
│  ZeroClaw    │              │  MongoDB 8.0  │
│  (Rust)      │              │  Collections: │
│  per-agent   │              │  - projects   │
│  process     │              │  - agents     │
│              │              │  - templates  │
│  session.jsonl              │  - stories    │
│  transcript.jsonl           │  - workflows  │
└──────┬───────┘              │  - transcripts│
       │                      └──────────────┘
       │ HTTP/Socket
┌──────▼───────┐
│  LLM Provider│
│  Ollama /    │
│  OpenAI /    │
│  Anthropic / │
│  Google      │
└──────────────┘
```

## ZeroClaw (Existing Rust Binary)

ZeroClaw is an **existing open-source runtime OS for agentic workflows** (github.com/zeroclaw-labs/zeroclaw). The AES backend **uses** ZeroClaw — it does not build it from scratch.

**Key ZeroClaw Features:**
- Written in Rust, <5MB RAM, cold-starts in milliseconds
- Config file: per-agent `config.toml` (NOT individual CLI flags per file)
- Native support for AIEOS v1.1 identity format
- Native Slack channel support (no custom integration needed)
- Built-in memory: SQLite hybrid vector search (custom, no external deps)
- Gateway mode: webhook server at `127.0.0.1:42617` (or custom port)
- Daemon mode: `zeroclaw daemon` — long-lived autonomous agent process
- Tools: shell, file ops, Git, HTTP, browser automation

**CLI Commands Used by AES:**
- `zeroclaw daemon` — start long-running agent (used for AES agents)
- `zeroclaw gateway` — webhook server for receiving tasks
- `zeroclaw onboard` — configure agent credentials
- `zeroclaw service install` — register as background service

**AES Backend Responsibilities for ZeroClaw:**
1. Generate per-agent `config.toml` with soul/identity/model/channel settings
2. Spawn `zeroclaw daemon` per agent via `child_process.spawn()`
3. Use ZeroClaw gateway API or SIGUSR1 to wake/trigger agents
4. Capture stdout/stderr streams for log aggregation
5. Manage ZeroClaw process lifecycle (PID tracking, restart on kill)

## NestJS Backend Responsibilities

1. Spawn agents via `child_process.spawn()`
2. Send SIGUSR1 to wake agents
3. Inject context via stdin
4. Capture stdout/stderr streams
5. Route Slack events to correct agent by `channel_id → projectId`
6. Process GitHub webhooks
7. Manage `git.lock` within each agent workspace directory
8. Generate dynamic avatar URLs (transparent PNG + brandColor)

## Librarian MCP (Dockerized)

Three engines running as Docker containers:
- **Parser**: Treesitter AST via [CocoIndex MCP Server](https://github.com/aanno/cocoindex-code-mcp-server) and [Drift](https://github.com/dadbodgeoff/drift)
- **Graph**: Bidirectional call-graph via [Code Pathfinder](https://github.com/shivasurya/code-pathfinder)
- **Standards**: Synthesizes `.aes/standards.md` (NestJS `StandardsEngineService`)

All three are **real open-source projects**. Story 0000013 integrates them as Docker services exposing REST APIs to the NestJS Librarian MCP module.

## References

- PRD.md §2.1 (ZeroClaw Core Kernel)
- PRD.md §7 (Librarian MCP)
- PRD.md §4.2 (Slack Identity & A2A)
- PRD.md §15.2 (Hybrid Git Tooling)
