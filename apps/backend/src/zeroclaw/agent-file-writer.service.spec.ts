import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AgentFileWriterService } from './agent-file-writer.service';
import { AieosGeneratorService } from './aieos-generator.service';
import { ZeroClawConfigGeneratorService } from './zeroclaw-config-generator.service';

describe('AgentFileWriterService', () => {
  let service: AgentFileWriterService;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aes-test-'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentFileWriterService,
        AieosGeneratorService,
        ZeroClawConfigGeneratorService,
      ],
    }).compile();

    service = module.get<AgentFileWriterService>(AgentFileWriterService);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should write all required agent files', () => {
    service.writeAgentFiles({
      displayName: 'DevBot',
      aieos_identity: null,
      soul: '# Soul\nYou are a developer.',
      config: { model: 'gpt-4', provider: 'openai', mcpServers: [] },
      workspacePath: tmpDir,
    });

    expect(fs.existsSync(path.join(tmpDir, 'zeroclaw.config.toml'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'identity.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'soul.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.aes'))).toBe(true);
  });

  it('should write valid JSON to identity.json', () => {
    service.writeAgentFiles({
      displayName: 'DevBot',
      config: { model: 'gpt-4', provider: 'openai', mcpServers: [] },
      workspacePath: tmpDir,
    });

    const identity = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'identity.json'), 'utf8'),
    );
    expect(identity).toHaveProperty('standard');
    expect(identity).toHaveProperty('identity');
  });

  it('should write config.toml with agent name', () => {
    service.writeAgentFiles({
      displayName: 'ReviewBot',
      config: { model: 'gpt-4', provider: 'openai', mcpServers: [] },
      workspacePath: tmpDir,
    });

    const toml = fs.readFileSync(
      path.join(tmpDir, 'zeroclaw.config.toml'),
      'utf8',
    );
    expect(toml).toContain('name = "ReviewBot"');
  });
});
