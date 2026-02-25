import { Test, TestingModule } from '@nestjs/testing';
import { AesGateway } from './aes.gateway';

describe('AesGateway', () => {
  let gateway: AesGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AesGateway],
    }).compile();

    gateway = module.get<AesGateway>(AesGateway);
    // Mock the WebSocket server
    (gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    };
  });

  it('should emit agent log event', () => {
    gateway.emitAgentLog('agent-1', 'project-1', 'Hello', 'stdout', 'run-1');
    expect((gateway as any).server.to).toHaveBeenCalledWith(
      'project:project-1',
    );
  });

  it('should emit story status event', () => {
    gateway.emitStoryStatus('project-1', 'story-1', 'in_progress');
    expect((gateway as any).server.to).toHaveBeenCalledWith(
      'project:project-1',
    );
  });

  it('should emit agent status event', () => {
    gateway.emitAgentStatus('project-1', 'agent-1', 'busy');
    expect((gateway as any).server.to).toHaveBeenCalledWith(
      'project:project-1',
    );
  });

  it('should emit workflow node event', () => {
    gateway.emitWorkflowNode('project-1', 'run-1', 'node-1', 'completed');
    expect((gateway as any).server.to).toHaveBeenCalledWith(
      'project:project-1',
    );
  });
});
