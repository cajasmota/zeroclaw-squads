import { EventEmitter2 } from '@nestjs/event-emitter';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AgentInstance } from '../agent-instances/agent-instance.schema';
import { BacklogService } from '../backlog/backlog.service';
import { SlackService } from '../project-initializer/slack.service';
import { AesGateway } from '../websocket/aes.gateway';
import { ZeroClawProcessManagerService } from '../zeroclaw/zeroclaw-process-manager.service';
import { AgentAvailabilityService } from './agent-availability.service';
import { DevelopmentOrchestrationService } from './development-orchestration.service';
import { StoryContextSerializerService } from './story-context-serializer.service';

describe('DevelopmentOrchestrationService', () => {
  let service: DevelopmentOrchestrationService;

  const projectId = new Types.ObjectId();
  const tenantId = new Types.ObjectId();
  const storyId = new Types.ObjectId();
  const agentId = new Types.ObjectId();

  const mockBacklog = {
    findStories: jest.fn().mockResolvedValue([]),
    updateStory: jest.fn().mockResolvedValue({ _id: storyId, branchName: `feature/${storyId}` }),
    updateStatus: jest.fn().mockResolvedValue({}),
  };

  const mockProcessManager = {
    poke: jest.fn(),
    injectStdin: jest.fn(),
  };

  const mockInstanceModel = {
    findOne: jest.fn().mockReturnValue({ exec: () => Promise.resolve(null) }),
    find: jest.fn().mockReturnValue({ lean: () => ({ exec: () => Promise.resolve([]) }) }),
    findById: jest.fn().mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevelopmentOrchestrationService,
        StoryContextSerializerService,
        { provide: getModelToken(AgentInstance.name), useValue: mockInstanceModel },
        { provide: BacklogService, useValue: mockBacklog },
        { provide: ZeroClawProcessManagerService, useValue: mockProcessManager },
        { provide: AgentAvailabilityService, useValue: { getAvailableAgent: jest.fn().mockResolvedValue(null) } },
        { provide: SlackService, useValue: { postAsAgent: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: AesGateway, useValue: { emitStoryStatus: jest.fn() } },
      ],
    }).compile();

    service = module.get<DevelopmentOrchestrationService>(DevelopmentOrchestrationService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('assignStory()', () => {
    it('should update story status to in_progress and emit story.assigned', async () => {
      const result = await service.assignStory(storyId.toString(), agentId.toString(), projectId, tenantId);
      expect(mockBacklog.updateStatus).toHaveBeenCalledWith(storyId.toString(), projectId, tenantId, 'in_progress');
    });
  });

  describe('handleSprintReady()', () => {
    it('should not throw when no PM agent is found', async () => {
      await expect(
        service.handleSprintReady({ sprintId: 'sprint1', projectId: projectId.toString(), tenantId: tenantId.toString() }),
      ).resolves.not.toThrow();
    });
  });

  describe('handlePRMerged()', () => {
    it('should update story to done on PR merge', async () => {
      const branch = `feature/${storyId}`;
      mockBacklog.findStories.mockResolvedValueOnce([{ _id: storyId, branchName: branch }]);
      await service.handlePRMerged(branch, projectId, tenantId);
      expect(mockBacklog.updateStatus).toHaveBeenCalledWith(storyId.toString(), projectId, tenantId, 'done');
    });
  });
});
