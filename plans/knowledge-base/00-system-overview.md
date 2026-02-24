# AES Knowledge Base — System Overview

## What is AES?

The **Agentic Engineering System (AES)** is an autonomous, event-driven software development environment. It uses specialized AI agents to transform product requirements into production code via a reactive, process-based architecture.

## Core Concept

AES orchestrates a **team of AI agents** (Librarian, Architect, PM, Developer, Reviewer) that collaborate asynchronously through Slack and GitHub. Each agent runs as an independent process (ZeroClaw Rust kernel) managed by a NestJS backend.

## High-Level Flow

```
User/Slack Input
      ↓
NestJS Backend (Control Plane)
      ↓ SIGUSR1 poke
ZeroClaw Kernel (Rust Process)
      ↓ tool calls
LLM Provider (Ollama/OpenAI/Anthropic)
      ↓ output
stdout → Backend → Slack / GitHub / UI
```

## Key Design Principles

1. **Signal-Driven**: Agents sleep when idle; a UNIX signal (SIGUSR1) wakes them
2. **Stateless Kernel**: ZeroClaw is credential-free; secrets injected at spawn-time via env vars
3. **Session Persistence**: `session.jsonl` ensures agents recover context after process kill
4. **Per-Agent Isolation**: Every agent has its own git workspace subdirectory
5. **Shared Truth via Librarian**: All agents reference the Librarian's indexed knowledge base
6. **Multi-Tenant**: Data isolated by `tenantId` + `projectId` at both logic and filesystem levels

## Branding

- Global env var `APP_NAME` controls system identity across all surfaces
- Project-level `brandColor` renders in Slack avatar backgrounds and UI

## References

- PRD.md §1 (Executive Summary)
- PRD.md §2 (System Architecture)
- PRD.md §10 (Multi-Tenant Security)
- PRD.md §19 (Design System & Branding)
