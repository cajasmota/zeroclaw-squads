# 0000010 - ZeroClaw Agent Configuration and AIEOS v1.1 Integration

**Epic**: EPIC-05: ZeroClaw Runtime Integration
**Assigned To**: Backend Agent
**Status**: [ ] Not Started
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

- [ ] Fetch and cache AIEOS v1.1 JSON schema (`https://aieos.org/schema/v1.1/aieos.schema.json`)
  - [ ] Save as `packages/types/aieos-v1.1.schema.json` for offline validation
- [ ] Create `AieosGeneratorService`:
  - [ ] `validate(payload: object): boolean` — validates against AIEOS v1.1 schema using `ajv`
  - [ ] `generate(agentInstance: AgentInstance): AieosPayload` — maps AES fields to full AIEOS v1.1 structure
  - [ ] `serialize(payload: AieosPayload): string` — converts to JSON string for file write
  - [ ] Map AIEOS 5 sections from AES data:
    - [ ] **Identity**: `names`, `bio`, `origin` from `aieos_identity.identity`
    - [ ] **Psychology**: neural_matrix (OCEAN traits, 0.0-1.0), moral_alignment from `aieos_identity.psychology`
    - [ ] **Linguistics**: vocal style, syntax patterns from `aieos_identity.linguistics`
    - [ ] **History**: origin story, motivations from `aieos_identity.history`
    - [ ] **Capabilities**: tool skills with priority 1-10 from `role_meta` and `config.skills`
- [ ] Create `ZeroClawConfigTomlGenerator`:
  - [ ] `generate(instance: AgentInstance, project: Project, gatewayPort: number): string`
  - [ ] Outputs valid TOML for ZeroClaw config
  - [ ] Sections: `[runtime]`, `[providers]`, `[channels]` (Slack), `[memory]`, `[observability]`, `[cost]`, `[security]`, `[identity]`
  - [ ] Uses `gatewayPort` for per-agent gateway isolation
  - [ ] Sets `security.workspace` to agent's `workspacePath` (filesystem scoping)
  - [ ] Sets `memory.path = "{workspacePath}/memory/brain.db"` (actual ZeroClaw filename)
  - [ ] Sets `observability.runtime_trace_mode = "rolling"` and `runtime_trace_path = "{workspacePath}/state/runtime-trace.jsonl"`
  - [ ] Sets `cost.enabled = true` (costs written to `{workspacePath}/state/costs.jsonl`)
  - [ ] Resolves correct LLM provider from `instance.config.provider`
  - [ ] For Reviewer role agents: adds `[[mcp_servers]]` entry pointing to Librarian MCP endpoint so `check_convention_compliance` is available
- [ ] Update `AgentInstancesService`:
  - [ ] Store `gatewayPort` on AgentInstance (assigned at spawn time)
  - [ ] Auto-assign unique ports (starting from configurable base port)
- [ ] Create `AgentFileWriterService`:
  - [ ] `writeAgentFiles(instance, project)`:
    - [ ] Writes `{workspacePath}/zeroclaw.config.toml`
    - [ ] Writes `{workspacePath}/identity.json` (validated AIEOS v1.1)
    - [ ] Writes `{workspacePath}/soul.md`
    - [ ] Creates `{workspacePath}/.aes/` directory
- [ ] Update AIEOS Builder UI data model to include all 5 AIEOS v1.1 sections (coordinate with frontend story 0000004)
- [ ] Write unit tests for:
  - [ ] `AieosGeneratorService.validate()` with valid and invalid payloads
  - [ ] `ZeroClawConfigTomlGenerator.generate()` output structure
  - [ ] `AgentFileWriterService.writeAgentFiles()` (mock filesystem)

---

## Acceptance Criteria

- [ ] `AieosGeneratorService.validate()` correctly accepts valid AIEOS v1.1 payloads and rejects invalid ones
- [ ] Generated `identity.json` passes validation against `https://aieos.org/schema/v1.1/aieos.schema.json`
- [ ] Generated `zeroclaw.config.toml` is valid TOML parseable by ZeroClaw
- [ ] Each agent instance gets a unique `gatewayPort` stored in MongoDB
- [ ] `security.workspace` in config.toml correctly restricts agent to its own workspace directory
- [ ] All 5 AIEOS sections are present in the generated identity.json
- [ ] Unit tests pass

---

## Dependencies
- **Depends on**: 0000006 (Agent Instance Snapshot), 0000009 (ZeroClaw Process Manager)
