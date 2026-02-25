import { Test, TestingModule } from '@nestjs/testing';
import { ZeroClawConfigGeneratorService } from './zeroclaw-config-generator.service';

describe('ZeroClawConfigGeneratorService', () => {
  let service: ZeroClawConfigGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ZeroClawConfigGeneratorService],
    }).compile();

    service = module.get<ZeroClawConfigGeneratorService>(
      ZeroClawConfigGeneratorService,
    );
  });

  it('should generate valid TOML config', () => {
    const config = service.generateConfig({
      displayName: 'Dev Bot',
      config: { model: 'gpt-4', provider: 'openai', mcpServers: [] },
      workspacePath: '/artifacts/project1/workspaces/agent1',
    });

    expect(config).toContain('[agent]');
    expect(config).toContain('name = "Dev Bot"');
    expect(config).toContain('model = "gpt-4"');
    expect(config).toContain('[identity]');
    expect(config).toContain('[memory]');
  });

  it('should use default model when not specified', () => {
    const config = service.generateConfig({
      displayName: 'Agent',
      config: { model: '', provider: '', mcpServers: [] },
      workspacePath: '/test',
    });
    expect(config).toContain('qwen2.5-coder:1.5b');
  });
});
