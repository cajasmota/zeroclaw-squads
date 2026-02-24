# 0000009 - ZeroClaw Agent Runtime Integration - NestJS Process Manager

**Epic**: EPIC-05: ZeroClaw Runtime Integration
**Assigned To**: Backend Agent
**Status**: [ ] Not Started
**PRD Reference**: PRD.md §2.1 (ZeroClaw Core Kernel)
**Knowledge Base**: `knowledge-base/09-zeroclaw-integration.md`, `knowledge-base/01-architecture.md`, `knowledge-base/05-communication-protocols.md`

---

## Title
Implement NestJS ZeroClaw process manager: spawn, lifecycle, signal injection, and stream capture

## Description
ZeroClaw is an **existing Rust binary** (from github.com/zeroclaw-labs/zeroclaw). This story implements the NestJS-side integration:
- Generate per-agent config.toml and identity files before spawning
- Spawn `zeroclaw daemon` processes via `child_process.spawn()`
- Send SIGUSR1 signals to wake sleeping agents
- Capture stdout/stderr streams and broadcast to UI via WebSocket
- Track PID per AgentInstance in MongoDB
- Handle process death and re-spawn

## Context
The NestJS backend is the control plane for all ZeroClaw processes. It manages their full lifecycle: creation, signaling, stream capture, and recovery. ZeroClaw runs in `daemon` mode — it stays alive and processes tasks asynchronously.

---

## Actionable Tasks

- [ ] Add ZeroClaw binary to system (via installer script or Docker):
  - [ ] Document ZeroClaw installation: `brew install zeroclaw` or download binary
  - [ ] Configure `ZEROCLAW_BINARY_PATH` in env vars
- [ ] Create `ZeroClawModule` in NestJS
- [ ] Create `ZeroClawConfigGeneratorService` (stub — full implementation in story 0000010):
  - [ ] `generateConfig(instance: AgentInstance, project: Project): string` — returns `config.toml` TOML string
  - [ ] Note: actual file writing is handled by `AgentFileWriterService` in story 0000010
  - [ ] Note: AIEOS identity.json generation and validation is handled by `AieosGeneratorService` in story 0000010
- [ ] Create `ZeroClawProcessManagerService`:
  - [ ] `spawn(agentInstance: AgentInstance, project: Project): ChildProcess`
    - [ ] Calls `ZeroClawConfigGeneratorService.generateConfig()` (writes config.toml, identity.json, soul.md to workspacePath)
    - [ ] Spawns: `child_process.spawn(ZEROCLAW_BINARY_PATH, ['daemon', '--host', '127.0.0.1', '--port', String(gatewayPort)], { cwd: workspacePath, env: { AES_PROJECT_ID, AES_STORY_ID, AES_RUN_ID, ...projectLlmKeys } })`
    - [ ] Note: ZeroClaw reads `zeroclaw.config.toml` from `cwd` automatically — there is NO `--config` flag
    - [ ] Note: `--soul` and `--identity` flags do NOT exist — paths come from `config.toml` `[identity]` section
    - [ ] Generates a unique `sessionId` (UUID) and stores it on AgentInstance (`AgentInstancesService.updateSessionId()`)
    - [ ] Stores returned PID via `AgentInstancesService.updatePid()`
    - [ ] Attaches stdout/stderr listeners
  - [ ] `kill(pid: number)` — graceful SIGTERM
  - [ ] `poke(pid: number)` — send SIGUSR1 to wake agent
  - [ ] `injectStdin(pid: number, message: string)` — write to process stdin
  - [ ] `isAlive(pid: number): boolean` — check process health
  - [ ] `reSpawn(agentInstance)` — kill + re-spawn if dead
- [ ] Create `StreamAggregatorService`:
  - [ ] Listens to stdout/stderr of each ZeroClaw process
  - [ ] Tags each line: `{ line, runId, ticketId, agentInstanceId, timestamp }`
  - [ ] Broadcasts tagged lines via WebSocket gateway (NestJS @WebSocketGateway)
  - [ ] Archives tagged lines to MongoDB `transcripts` collection (async, non-blocking)
- [ ] Create `ZeroClawGatewayService`:
  - [ ] Each agent's ZeroClaw instance runs `zeroclaw gateway` on a unique port
  - [ ] NestJS stores `gatewayPort` on AgentInstance
  - [ ] `postTask(agentInstance, payload)` — HTTP POST to agent's gateway endpoint
- [ ] Listen to `agents.spawn.all` event from `ProjectInitializerService` to spawn all project agents
- [ ] Write unit tests for:
  - [ ] `ZeroClawConfigGeneratorService` output format
  - [ ] `ZeroClawProcessManagerService.poke()` (mock process)
  - [ ] `StreamAggregatorService` line tagging

---

## Acceptance Criteria

- [ ] Starting a project spawns `zeroclaw daemon` for each agent instance
- [ ] Agent process PIDs are stored in the AgentInstance MongoDB document
- [ ] Sending SIGUSR1 to an agent PID causes the agent to process pending tasks
- [ ] All ZeroClaw stdout/stderr lines are tagged with `runId`/`agentInstanceId` and broadcast via WebSocket
- [ ] WebSocket clients receive live agent output in real time
- [ ] If an agent process dies, NestJS detects it and re-spawns it
- [ ] `config.toml` is correctly generated for each agent before spawn
- [ ] Unit tests pass

---

## Dependencies
- **Depends on**: 0000006 (Agent Instance Snapshot), 0000008 (Project Initialization)

## Notes
- ZeroClaw must be installed on the VPS prior to running AES (handled by setup-aes.sh in story 0000022)
- LLM API keys are injected as env vars at spawn time; NEVER written to disk unencrypted
- **Session/memory recovery**: ZeroClaw uses built-in SQLite (`memory.db`) that auto-loads on re-spawn. The implementing agent should verify this behavior during integration testing and update `knowledge-base/09-zeroclaw-integration.md` with findings. Check ZeroClaw docs at https://github.com/zeroclaw-labs/zeroclaw for `--session` flag details.
