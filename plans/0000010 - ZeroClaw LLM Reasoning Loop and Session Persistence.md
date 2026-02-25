# 0000010 - ZeroClaw Agent Configuration and AIEOS v1.1 Integration

**Epic**: EPIC-05: ZeroClaw Runtime Integration
**Assigned To**: Backend Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §2.1 (ZeroClaw), §11 (AIEOS Identity Normalization)
**Knowledge Base**: `knowledge-base/09-zeroclaw-integration.md`, `knowledge-base/06-aieos-schema.md`

---

## Title
Build AIEOS v1.1 identity generator and per-agent ZeroClaw config.toml generator

## Description
Implement the services that transform AES AgentInstance data into the files ZeroClaw needs to run:
1. **AIEOS v1.1 JSON generator** — converts AES `aieos_identity` object into a spec-compliant AIEOS v1.1 JSON file
2. **config.toml generator** — produces the ZeroClaw configuration file for each agent instance
3. **AIEOS validator** — validates AIEOS payloads against the official schema before persisting

## Context
ZeroClaw natively supports AIEOS v1.1 as its identity format. The schema URL is `https://aieos.org/schema/v1.1/aieos.schema.json`. The AES backend must produce valid AIEOS files and proper ZeroClaw config.toml files before spawning each agent.

---

## Actionable Tasks

- [x] Fetch and cache AIEOS v1.1 JSON schema (`https://aieos.org/schema/v1.1/aieos.schema.json`)
  - [x] Save as `packages/types/aieos-v1.1.schema.json` for offline validation
- [x] Create `AieosGeneratorService`:
  - [x] `validate(payload: object): boolean` — validates against AIEOS v1.1 schema using `ajv`
  - [x] `generate(agentInstance: AgentInstance): AieosPayload` — maps AES fields to full AIEOS v1.1 structure
  - [x] `serialize(payload: AieosPayload): string` — converts to JSON string for file write
  - [x] Map AIEOS 5 sections from AES data:
    - [x] **Identity**: `names`, `bio`, `origin` from `aieos_identity.identity`
    - [x] **Psychology**: neural_matrix (OCEAN traits, 0.0-1.0), moral_alignment from `aieos_identity.psychology`
    - [x] **Linguistics**: vocal style, syntax patterns from `aieos_identity.linguistics`
    - [x] **History**: origin story, motivations from `aieos_identity.history`
    - [x] **Capabilities**: tool skills with priority 1-10 from `role_meta` and `config.skills`
- [x] Create `ZeroClawConfigTomlGenerator`:
  - [x] `generate(instance: AgentInstance, project: Project, gatewayPort: number): string`
  - [x] Outputs valid TOML for ZeroClaw config
  - [x] Sections: `[runtime]`, `[providers]`, `[channels]` (Slack), `[memory]`, `[observability]`, `[cost]`, `[security]`, `[identity]`
  - [x] Uses `gatewayPort` for per-agent gateway isolation
  - [x] Sets `security.workspace` to agent's `workspacePath` (filesystem scoping)
  - [x] Sets `memory.path = "{workspacePath}/memory/brain.db"` (actual ZeroClaw filename)
  - [x] Sets `observability.runtime_trace_mode = "rolling"` and `runtime_trace_path = "{workspacePath}/state/runtime-trace.jsonl"`
  - [x] Sets `cost.enabled = true` (costs written to `{workspacePath}/state/costs.jsonl`)
  - [x] Resolves correct LLM provider from `instance.config.provider`
  - [x] For Reviewer role agents: adds `[[mcp_servers]]` entry pointing to Librarian MCP endpoint so `check_convention_compliance` is available
- [x] Update `AgentInstancesService`:
  - [x] Store `gatewayPort` on AgentInstance (assigned at spawn time)
  - [x] Auto-assign unique ports (starting from configurable base port)
- [x] Create `AgentFileWriterService`:
  - [x] `writeAgentFiles(instance, project)`:
    - [x] Writes `{workspacePath}/zeroclaw.config.toml`
    - [x] Writes `{workspacePath}/identity.json` (validated AIEOS v1.1)
    - [x] Writes `{workspacePath}/soul.md`
    - [x] Creates `{workspacePath}/.aes/` directory
- [x] Update AIEOS Builder UI data model to include all 5 AIEOS v1.1 sections (coordinate with frontend story 0000004)
- [x] Write unit tests for:
  - [x] `AieosGeneratorService.validate()` with valid and invalid payloads
  - [x] `ZeroClawConfigTomlGenerator.generate()` output structure
  - [x] `AgentFileWriterService.writeAgentFiles()` (mock filesystem)

---

## Acceptance Criteria

- [x] `AieosGeneratorService.validate()` correctly accepts valid AIEOS v1.1 payloads and rejects invalid ones
- [x] Generated `identity.json` passes validation against `https://aieos.org/schema/v1.1/aieos.schema.json`
- [x] Generated `zeroclaw.config.toml` is valid TOML parseable by ZeroClaw
- [x] Each agent instance gets a unique `gatewayPort` stored in MongoDB
- [x] `security.workspace` in config.toml correctly restricts agent to its own workspace directory
- [x] All 5 AIEOS sections are present in the generated identity.json
- [x] Unit tests pass

---

## Dependencies
- **Depends on**: 0000006 (Agent Instance Snapshot), 0000009 (ZeroClaw Process Manager)
