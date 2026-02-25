import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AieosGeneratorService } from './aieos-generator.service';
import { ZeroClawConfigGeneratorService } from './zeroclaw-config-generator.service';

@Injectable()
export class AgentFileWriterService {
  private readonly logger = new Logger(AgentFileWriterService.name);

  constructor(
    private readonly aieosGenerator: AieosGeneratorService,
    private readonly configGenerator: ZeroClawConfigGeneratorService,
  ) {}

  writeAgentFiles(
    instance: {
      displayName: string;
      aieos_identity?: Record<string, any> | null;
      soul?: string;
      config: { model: string; provider: string; mcpServers: any[] };
      workspacePath: string;
    },
  ): void {
    const { workspacePath } = instance;

    // Ensure all subdirectories exist
    fs.mkdirSync(path.join(workspacePath, 'state'), { recursive: true });
    fs.mkdirSync(path.join(workspacePath, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(workspacePath, '.aes'), { recursive: true });

    // Write zeroclaw.config.toml
    const configToml = this.configGenerator.generateConfig(instance);
    fs.writeFileSync(path.join(workspacePath, 'zeroclaw.config.toml'), configToml, 'utf8');

    // Write identity.json (AIEOS v1.1)
    const aieos = this.aieosGenerator.generate(instance);
    fs.writeFileSync(
      path.join(workspacePath, 'identity.json'),
      this.aieosGenerator.serialize(aieos),
      'utf8',
    );

    // Write soul.md
    const soul = this.configGenerator.generateAieosSoul(instance.soul ?? '');
    fs.writeFileSync(path.join(workspacePath, 'soul.md'), soul, 'utf8');

    this.logger.log(`Agent files written to ${workspacePath}`);
  }
}
