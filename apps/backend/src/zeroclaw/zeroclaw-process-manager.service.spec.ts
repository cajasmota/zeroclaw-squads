import { EventEmitter2 } from '@nestjs/event-emitter';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Story } from '../backlog/story.schema';
import { AgentInstance } from '../agent-instances/agent-instance.schema';
import { AgentInstancesService } from '../agent-instances/agent-instances.service';
import { GlobalSettingsService } from '../settings/global-settings.service';
import { TicketComment } from '../ticket-dialogue/ticket-comment.schema';
import { AesGateway } from '../websocket/aes.gateway';
import { AieosGeneratorService } from './aieos-generator.service';
import { ZeroClawConfigGeneratorService } from './zeroclaw-config-generator.service';
import { ZeroClawProcessManagerService } from './zeroclaw-process-manager.service';

describe('ZeroClawProcessManagerService', () => {
  let service: ZeroClawProcessManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZeroClawProcessManagerService,
        ZeroClawConfigGeneratorService,
        AieosGeneratorService,
        {
          provide: getModelToken(AgentInstance.name),
          useValue: {
            find: jest.fn().mockReturnValue({ lean: () => ({ exec: () => Promise.resolve([]) }) }),
            findOne: jest.fn().mockReturnValue({ exec: () => Promise.resolve(null) }),
          },
        },
        {
          provide: getModelToken(Story.name),
          useValue: {
            findOne: jest.fn().mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) }),
          },
        },
        {
          provide: getModelToken(TicketComment.name),
          useValue: {
            find: jest.fn().mockReturnValue({ sort: () => ({ lean: () => ({ exec: () => Promise.resolve([]) }) }) }),
          },
        },
        { provide: AgentInstancesService, useValue: { updateStatus: jest.fn(), updatePid: jest.fn() } },
        { provide: GlobalSettingsService, useValue: { resolveLlmKeys: jest.fn().mockResolvedValue({ ollamaEndpoint: 'http://localhost:11434' }) } },
        { provide: AesGateway, useValue: { emitAgentLog: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
      ],
    }).compile();

    service = module.get<ZeroClawProcessManagerService>(ZeroClawProcessManagerService);
  });

  describe('poke()', () => {
    it('should send SIGUSR1 to the given pid', () => {
      const killSpy = jest.spyOn(process, 'kill').mockImplementation(() => true);
      service.poke(process.pid);
      expect(killSpy).toHaveBeenCalledWith(process.pid, 'SIGUSR1');
      killSpy.mockRestore();
    });

    it('should not throw when pid is unreachable', () => {
      jest.spyOn(process, 'kill').mockImplementation(() => { throw new Error('ESRCH'); });
      expect(() => service.poke(99999)).not.toThrow();
      jest.restoreAllMocks();
    });
  });

  describe('isAlive()', () => {
    it('should return true for own pid', () => {
      expect(service.isAlive(process.pid)).toBe(true);
    });

    it('should return false for unreachable pid', () => {
      jest.spyOn(process, 'kill').mockImplementation(() => { throw new Error('ESRCH'); });
      expect(service.isAlive(99999)).toBe(false);
      jest.restoreAllMocks();
    });
  });

  describe('handleSlackMessage()', () => {
    it('should do nothing when no agent found', async () => {
      const validProjectId = '507f1f77bcf86cd799439011';
      const validTenantId = '507f1f77bcf86cd799439012';
      await expect(
        service.handleSlackMessage({
          projectId: validProjectId,
          tenantId: validTenantId,
          channelId: 'C123',
          text: 'hello',
        }),
      ).resolves.not.toThrow();
    });
  });
});
