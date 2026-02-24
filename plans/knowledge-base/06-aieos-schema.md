# AES Knowledge Base — AIEOS Identity Schema v1.1

## Overview

AIEOS (AI Entity Operating System) is the identity specification format for AES agents. It defines an agent's personality, psychology, capabilities, and system-level flags.

## Schema Sections (All 5 — AIEOS v1.1)

Official schema: `https://aieos.org/schema/v1.1/aieos.schema.json`
Official spec: `https://github.com/entitai/aieos`

| Section | Key Fields | Required | Description |
|---------|-----------|----------|-------------|
| `identity` | `names` (full/short/codename), `bio`, `origin` | **YES** | Core biographical data |
| `psychology` | `neural_matrix` (OCEAN traits 0.0–1.0), `MBTI`, `communication_style` | **YES** | Personality weights and thinking style |
| `linguistics` | `vocal_style`, `syntax_patterns`, `vocabulary_register` | optional | How the agent speaks and writes |
| `history` | `origin_story`, `motivations`, `formative_events` | optional | Background narrative and drive |
| `role_meta` | `role`, `isSingleton`, `canWriteCode`, `preferredLanguages`, `skills` | **YES** | System-level role and capability flags |

> The `AIEOSBuilder` UI in story 0000004 must expose all 5 sections. The 3 required sections must be validated before saving.

## Example AIEOS v1.1 Payload (all 5 sections)

```json
{
  "version": "1.1",
  "identity": {
    "names": { "full": "R2-D2", "short": "R2", "codename": "artoo" },
    "bio": "A highly skilled astromech droid specialized in system diagnostics and code repair.",
    "origin": "Galactic Republic Engineering Division"
  },
  "psychology": {
    "neural_matrix": {
      "logic": 0.85,
      "creativity": 0.40,
      "empathy": 0.30,
      "assertiveness": 0.70
    },
    "MBTI": "ISTJ",
    "communication_style": "concise, technical, solution-oriented"
  },
  "linguistics": {
    "vocal_style": "terse and precise",
    "syntax_patterns": "short sentences, bullet-point oriented",
    "vocabulary_register": "technical"
  },
  "history": {
    "origin_story": "Served the Galactic Republic for over 20 years before joining AES.",
    "motivations": "Achieve perfect code quality. Minimize entropy.",
    "formative_events": ["Battle of Naboo debugging session", "First solo Rust deployment"]
  },
  "role_meta": {
    "role": "developer",
    "isSingleton": false,
    "canWriteCode": true,
    "preferredLanguages": ["Rust", "TypeScript", "Python"],
    "skills": ["code-review", "testing", "debugging"]
  }
}
```

## Normalization Engine

ZeroClaw automatically normalizes AIEOS JSON payloads into optimized system prompts. The normalization:
1. Reads `identity` → generates persona header
2. Reads `psychology.neural_matrix` → shapes response style and tone
3. Reads `linguistics` → applies writing style constraints
4. Reads `history` → adds motivational context
5. Reads `role_meta` → enforces capability constraints (`canWriteCode`, `isSingleton`)

## Soul (soul.md)

The Soul is a Markdown file complementing the AIEOS identity:
- Written in natural language
- Describes behavioral tendencies, communication preferences
- Can reference specific technical expertise areas
- Stored as a Markdown string in the AgentInstance document

## AIEOS Builder UI

The UI provides a visual form to build AIEOS payloads. It is visible only in "Edit Mode" on the Template Detail Modal.

## Import/Export

Templates support JSON import/export of AIEOS-compatible `.json` files, enabling sharing of agent personalities between AES installations.

## References

- PRD.md §11 (AIEOS Identity Normalization & Schema)
- PRD.md §5.3 (Template Designer)
- PRD.md §2.2 (Agent Instancing & Snapshots)
