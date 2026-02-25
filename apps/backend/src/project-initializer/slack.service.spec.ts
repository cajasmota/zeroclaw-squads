import { Test, TestingModule } from '@nestjs/testing';
import { SlackService } from './slack.service';

// Mock @slack/web-api so no real HTTP calls happen
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    conversations: {
      create: jest.fn().mockResolvedValue({ channel: { id: 'C_MOCK' } }),
      invite: jest.fn().mockResolvedValue({}),
    },
    chat: {
      postMessage: jest.fn().mockResolvedValue({ ts: 'ts_mock' }),
    },
  })),
}));

describe('SlackService', () => {
  let service: SlackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlackService],
    }).compile();

    service = module.get<SlackService>(SlackService);
  });

  it('should generate avatar URL with agent display name', () => {
    const url = service.generateAvatarUrl(
      { displayName: 'Dev Bot', role: 'developer' },
      '#004176',
    );
    expect(url).toContain('Dev%20Bot');
    expect(url).toContain('004176');
  });

  it('should return channel id on createChannel success', async () => {
    const result = await service.createChannel('token', 'test-project');
    expect(result).toBe('C_MOCK');
  });

  it('should return empty string when Slack API throws', async () => {
    const { WebClient } = require('@slack/web-api');
    WebClient.mockImplementationOnce(() => ({
      conversations: {
        create: jest.fn().mockRejectedValue(new Error('invalid_auth')),
      },
    }));
    const result = await service.createChannel('invalid-token', 'test-project');
    expect(result).toBe('');
  });

  it('should set username and icon_url when posting as agent', async () => {
    const { WebClient } = require('@slack/web-api');
    let capturedArgs: any;
    WebClient.mockImplementationOnce(() => ({
      chat: {
        postMessage: jest.fn().mockImplementation((args) => {
          capturedArgs = args;
          return Promise.resolve({ ts: '123' });
        }),
      },
    }));

    await service.postAsAgent(
      'token',
      'C123',
      'Hello!',
      { displayName: 'Dev Bot', role: 'developer' },
      '#004176',
    );
    expect(capturedArgs.username).toBe('Dev Bot');
    expect(capturedArgs.icon_url).toBeTruthy();
  });

  it('postA2AMessage should prefix message with [A2A]', async () => {
    const { WebClient } = require('@slack/web-api');
    let capturedText: string;
    WebClient.mockImplementationOnce(() => ({
      chat: {
        postMessage: jest.fn().mockImplementation((args) => {
          capturedText = args.text;
          return Promise.resolve({ ts: '1' });
        }),
      },
    }));

    const fromAgent = { displayName: 'PM Bot', role: 'pm', roleEmoji: '📋' };
    const toAgent = {
      displayName: 'Dev Bot',
      role: 'developer',
      roleEmoji: '💻',
    };
    await service.postA2AMessage(
      'token',
      'C123',
      fromAgent,
      toAgent,
      'assign story',
      '#004176',
    );
    expect(capturedText).toContain('[A2A]');
    expect(capturedText).toContain('PM Bot');
    expect(capturedText).toContain('Dev Bot');
  });
});
