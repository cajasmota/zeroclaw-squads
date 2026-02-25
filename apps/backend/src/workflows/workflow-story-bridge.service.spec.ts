import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { BacklogService } from '../backlog/backlog.service';
import { AesGateway } from '../websocket/aes.gateway';
import { WorkflowStoryBridgeService } from './workflow-story-bridge.service';

describe('WorkflowStoryBridgeService', () => {
  let service: WorkflowStoryBridgeService;
  const projectId = new Types.ObjectId().toString();
  const tenantId = new Types.ObjectId().toString();
  const storyId = new Types.ObjectId().toString();

  const mockBacklog = {
    updateStory: jest.fn().mockResolvedValue({}),
    updateStatus: jest.fn().mockResolvedValue({}),
  };
  const mockGateway = { emitStoryStatus: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowStoryBridgeService,
        { provide: BacklogService, useValue: mockBacklog },
        { provide: AesGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<WorkflowStoryBridgeService>(
      WorkflowStoryBridgeService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('should update workflowNodeStatus on node started', async () => {
    await service.handleNodeStarted({
      storyId,
      projectId,
      tenantId,
      nodeId: 'n1',
      node: {
        id: 'n1',
        description: 'Implementing',
        type: 'action',
        agentRole: 'developer',
        requiresHumanApproval: false,
      },
    });
    expect(mockBacklog.updateStory).toHaveBeenCalledWith(
      expect.any(Types.ObjectId),
      expect.any(Types.ObjectId),
      storyId,
      expect.objectContaining({ workflowNodeStatus: 'Implementing' }),
    );
  });

  it('should auto-move kanban on node start when kanbanStatus is set', async () => {
    await service.handleNodeStarted({
      storyId,
      projectId,
      tenantId,
      nodeId: 'n1',
      node: {
        id: 'n1',
        description: 'Implement',
        type: 'action',
        agentRole: 'developer',
        requiresHumanApproval: false,
        kanbanStatus: 'in_progress',
        kanbanStatusTrigger: 'on_start',
      },
    });
    expect(mockBacklog.updateStatus).toHaveBeenCalledWith(
      storyId,
      expect.any(Types.ObjectId),
      expect.any(Types.ObjectId),
      'in_progress',
    );
  });

  it('should return story to backlog on node failure', async () => {
    await service.handleNodeFailed({
      storyId,
      projectId,
      tenantId,
      nodeId: 'n1',
      error: 'Build failed',
    });
    expect(mockBacklog.updateStatus).toHaveBeenCalledWith(
      storyId,
      expect.any(Types.ObjectId),
      expect.any(Types.ObjectId),
      'backlog',
    );
  });

  it('should do nothing when storyId is missing', async () => {
    await service.handleNodeStarted({ projectId, tenantId, nodeId: 'n1' });
    expect(mockBacklog.updateStory).not.toHaveBeenCalled();
  });
});
