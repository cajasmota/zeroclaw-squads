# 0000013 - Librarian MCP Server Setup and Docker Containers

**Epic**: EPIC-08: Librarian MCP
**Assigned To**: Backend Agent, DevOps Agent
**Status**: [x] Completed
**PRD Reference**: PRD.md §7 (The Librarian MCP)
**Knowledge Base**: `knowledge-base/01-architecture.md`, `knowledge-base/04-agent-roles.md`, `knowledge-base/07-git-strategy.md`

---

## Title
Set up Librarian MCP server with Treesitter parser and code graph engine as Docker containers

## Description
The Librarian is the knowledge authority for the AES system. It runs as an MCP (Model Context Protocol) server backed by three Docker-containerized engines:
1. **Parser Engine**: Treesitter AST parsing via [CocoIndex MCP Server](https://github.com/aanno/cocoindex-code-mcp-server) + [Drift](https://github.com/dadbodgeoff/drift)
2. **Graph Engine**: Bidirectional call-graph traversal via [Code Pathfinder](https://github.com/shivasurya/code-pathfinder)
3. **Standards Engine**: NestJS `StandardsEngineService` — synthesizes `.aes/standards.md`

All three are real open-source tools. Read their READMEs before implementing their Docker service wrappers. This story integrates them and exposes MCP tools for other agents to call.

## Context
The Librarian MCP enables agents to query the codebase semantically without reading raw files. Developer agents call tools like `find_logic`, `get_component_sample`, and `check_convention_compliance` during their reasoning loops.

---

## Actionable Tasks

- [x] Read READMEs for all three tools before starting implementation:
  - [x] CocoIndex MCP Server: https://github.com/aanno/cocoindex-code-mcp-server
  - [x] Drift: https://github.com/dadbodgeoff/drift
  - [x] Code Pathfinder: https://github.com/shivasurya/code-pathfinder
- [x] Create `docker-compose.librarian.yml` with services:
  - [x] `parser-engine`: CocoIndex + Drift containerized (exposes REST/MCP API on port 5001)
    - [x] Supports languages: TypeScript, JavaScript, Rust, Python
    - [x] Configure per each tool's installation instructions
  - [x] `graph-engine`: Code Pathfinder containerized (exposes REST API on port 5002)
    - [x] Endpoint: `POST /build-graph` — builds call graph from source files
    - [x] Endpoint: `GET /graph/{nodeId}/callers` — find callers of a function
    - [x] Endpoint: `GET /graph/{nodeId}/callees` — find callees of a function
- [x] Create `LibrarianMcpModule` in NestJS:
  - [x] Implements MCP server protocol (or uses existing MCP SDK for Node.js)
  - [x] Exposes MCP tools to ZeroClaw agents
- [x] Implement MCP tools:
  - [x] `find_logic(query: string)` — semantic search for code logic by description
  - [x] `ask_question(question: string)` — natural language query about codebase
  - [x] `get_type_definition(typeName: string)` — returns type/interface definition
  - [x] `get_component_sample(componentName: string)` — returns usage example
  - [x] `analyze_impact(filePath: string)` — identifies what would break if file changes
  - [x] `check_convention_compliance(filePath: string, content: string)` — checks against `.aes/standards.md`
- [x] Create `StandardsEngineService`:
  - [x] `generateStandards(projectId: string)`:
    - [x] Reads codebase patterns from parser and graph engines
    - [x] Synthesizes `.aes/standards.md` in the Librarian workspace
- [x] Create `LibrarianIndexerService`:
  - [x] `triggerIngestion(projectId: string)` — runs full codebase indexing
    - [x] Clones or pulls latest from shared librarian workspace
    - [x] Calls parser engine on all source files
    - [x] Builds call graph
    - [x] Updates standards
  - [x] `triggerPostMergeReindex(projectId: string)` — lightweight re-index on PR merge
- [x] Listen to `librarian.reindex` event from GitHub webhook handler
- [x] Create `GET /projects/:id/librarian/status` endpoint — returns indexing status
- [x] Create `POST /projects/:id/librarian/ingest` endpoint — manual trigger
- [x] Write unit tests for MCP tool implementations (mock docker services)

---

## Acceptance Criteria

- [x] `docker-compose up` starts parser-engine and graph-engine containers
- [x] Parser engine correctly parses TypeScript files to AST
- [x] Graph engine correctly builds call graphs from AST data
- [x] All 6 MCP tools return meaningful responses for real codebase queries
- [x] `check_convention_compliance` correctly identifies violations against `standards.md`
- [x] `triggerIngestion()` completes without error for a sample TypeScript project
- [x] Merge webhook triggers automatic re-index
- [x] Unit tests pass

---

## Dependencies
- **Depends on**: 0000008 (Project Initialization), 0000011 (GitHub Integration)
