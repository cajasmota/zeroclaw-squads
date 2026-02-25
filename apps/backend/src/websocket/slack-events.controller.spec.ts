import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpException } from '@nestjs/common';
import { SlackEventsController } from './slack-events.controller';
import { SlackChannelMappingService } from './slack-channel-mapping.service';

const SIGNING_SECRET = 'test-signing-secret-12345678';

function buildSignature(
  secret: string,
  timestamp: string,
  body: string,
): string {
  const sig = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac('sha256', secret);
  return `v0=${hmac.update(sig).digest('hex')}`;
}

describe('SlackEventsController', () => {
  let controller: SlackEventsController;
  const emitMock = jest.fn();
  const getProjectMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SlackEventsController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def: any) =>
              key === 'SLACK_SIGNING_SECRET' ? SIGNING_SECRET : def,
            ),
          },
        },
        {
          provide: SlackChannelMappingService,
          useValue: { getProjectByChannel: getProjectMock },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: emitMock },
        },
      ],
    }).compile();

    controller = module.get<SlackEventsController>(SlackEventsController);
    jest.clearAllMocks();
  });

  describe('verifySlackSignature', () => {
    it('should return true for valid signature', () => {
      const timestamp = '1618000000';
      const body = '{"type":"event_callback"}';
      const sig = buildSignature(SIGNING_SECRET, timestamp, body);
      expect(controller.verifySlackSignature(body, timestamp, sig)).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const timestamp = '1618000000';
      const body = '{"type":"event_callback"}';
      expect(
        controller.verifySlackSignature(body, timestamp, 'v0=badhash'),
      ).toBe(false);
    });

    it('should return false if SLACK_SIGNING_SECRET is empty', () => {
      const module2 = Test.createTestingModule({
        controllers: [SlackEventsController],
        providers: [
          { provide: ConfigService, useValue: { get: jest.fn(() => '') } },
          {
            provide: SlackChannelMappingService,
            useValue: { getProjectByChannel: jest.fn() },
          },
          { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        ],
      });
      // Just test logic directly
      const ctrl2 = new SlackEventsController(
        { get: () => '' } as any,
        null as any,
        null as any,
      );
      expect(ctrl2.verifySlackSignature('body', 'ts', 'v0=sig')).toBe(false);
    });
  });

  describe('handleSlackEvent', () => {
    it('should return challenge for url_verification', async () => {
      const result = await controller.handleSlackEvent(
        { type: 'url_verification', challenge: 'test-challenge' },
        '',
        '',
      );
      expect(result).toEqual({ challenge: 'test-challenge' });
    });

    it('should reject invalid Slack signature', async () => {
      const timestamp = '1618000000';
      const body = { type: 'event_callback' };
      await expect(
        controller.handleSlackEvent(body, 'v0=invalidsig', timestamp),
      ).rejects.toThrow(HttpException);
    });

    it('should skip bot messages', async () => {
      const result = await controller.handleSlackEvent(
        {
          type: 'event_callback',
          event: { type: 'message', bot_id: 'B123', text: 'Hello' },
        },
        '',
        '',
      );
      expect(result).toEqual({ ok: true });
      expect(emitMock).not.toHaveBeenCalled();
    });

    it('should skip A2A flagged messages', async () => {
      const result = await controller.handleSlackEvent(
        {
          type: 'event_callback',
          event: { type: 'message', text: '[A2A] agent message' },
        },
        '',
        '',
      );
      expect(result).toEqual({ ok: true });
      expect(emitMock).not.toHaveBeenCalled();
    });

    it('should emit slack.message.received for valid human message', async () => {
      getProjectMock.mockResolvedValue({
        projectId: 'proj-1',
        tenantId: 'tenant-1',
      });
      const result = await controller.handleSlackEvent(
        {
          type: 'event_callback',
          event: { type: 'message', channel: 'C123', text: 'Hello agent!' },
        },
        '',
        '',
      );
      expect(result).toEqual({ ok: true });
      expect(emitMock).toHaveBeenCalledWith(
        'slack.message.received',
        expect.objectContaining({
          projectId: 'proj-1',
          tenantId: 'tenant-1',
          text: 'Hello agent!',
        }),
      );
    });

    it('should not emit if channel has no project mapping', async () => {
      getProjectMock.mockResolvedValue(null);
      await controller.handleSlackEvent(
        {
          type: 'event_callback',
          event: { type: 'message', channel: 'C999', text: 'Hello' },
        },
        '',
        '',
      );
      expect(emitMock).not.toHaveBeenCalled();
    });
  });
});
