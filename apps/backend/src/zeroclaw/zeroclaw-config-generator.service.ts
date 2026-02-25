import { Injectable } from '@nestjs/common';

@Injectable()
export class ZeroClawConfigGeneratorService {
  generateConfig(instance: {
    displayName: string;
    config: { model: string; provider: string; mcpServers: any[] };
    workspacePath: string;
  }): string {
    const { config } = instance;

    return `[agent]
name = "${instance.displayName}"
model = "${config.model || 'qwen2.5-coder:1.5b'}"
provider = "${config.provider || 'ollama'}"

[identity]
aieos_path = "identity.json"
soul_path = "soul.md"

[memory]
db_path = "memory/brain.db"

[state]
costs_path = "state/costs.jsonl"
trace_path = "state/runtime-trace.jsonl"

[logging]
level = "info"
`;
  }

  generateAieosSoul(soul: string): string {
    return soul ?? '# Agent Soul\n\nYou are a helpful AI agent.';
  }
}
