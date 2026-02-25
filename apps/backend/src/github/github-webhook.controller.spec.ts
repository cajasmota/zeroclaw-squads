import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GitHubWebhookController } from './github-webhook.controller';
import { ZeroClawProcessManagerService } from '../zeroclaw/zeroclaw-process-manager.service';

describe('GitHubWebhookController', () => {
  let controller: GitHubWebhookController;
  let mockEmitter: Partial<EventEmitter2>;

  beforeEach(async () => {
    mockEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GitHubWebhookController],
      providers: [
        { provide: EventEmitter2, useValue: mockEmitter },
        { provide: ZeroClawProcessManagerService, useValue: {} },
      ],
    }).compile();

    controller = module.get<GitHubWebhookController>(GitHubWebhookController);
  });

  it('should emit github.pr.opened on pull_request opened', async () => {
    const payload = { action: 'opened', pull_request: { number: 42 }, repository: { clone_url: 'https://github.com/org/repo' } };
    await controller.handleGitHubWebhook('', 'pull_request', { rawBody: Buffer.from(JSON.stringify(payload)) } as any, payload);
    expect(mockEmitter.emit).toHaveBeenCalledWith('github.pr.opened', expect.objectContaining({ prNumber: 42 }));
  });

  it('should emit librarian.reindex on push to main', async () => {
    const payload = { ref: 'refs/heads/main', repository: { clone_url: 'https://github.com/org/repo' } };
    await controller.handleGitHubWebhook('', 'push', { rawBody: Buffer.from(JSON.stringify(payload)) } as any, payload);
    expect(mockEmitter.emit).toHaveBeenCalledWith('librarian.reindex', expect.any(Object));
  });

  it('should verify signature when secret is set', () => {
    const secret = 'test-secret';
    const body = '{"test":true}';
    const sig = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;

    process.env.GITHUB_WEBHOOK_SECRET = secret;
    // Should not throw
    expect(() => (controller as any).verifySignature(body, sig, secret)).not.toThrow();
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  it('should reject invalid signature', () => {
    expect(() => (controller as any).verifySignature('body', 'sha256=invalid', 'secret')).toThrow();
  });
});
