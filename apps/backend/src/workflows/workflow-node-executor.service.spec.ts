import { EventEmitter2 } from '@nestjs/event-emitter';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AgentInstance } from '../agent-instances/agent-instance.schema';
import { BacklogService } from '../backlog/backlog.service';
import { ZeroClawProcessManagerService } from '../zeroclaw/zeroclaw-process-manager.service';
import { WorkflowNodeExecutorService } from './workflow-node-executor.service';
import { WorkflowRun } from './workflow-run.schema';

describe('WorkflowNodeExecutorService', () => {
  let service: WorkflowNodeExecutorService;

  const projectId = new Types.ObjectId();
  const tenantId = new Types.ObjectId();
  const runId = new Types.ObjectId();

  const mockRun = {
    _id: runId,
    projectId,
    tenantId,
    storyId: null,
    status: 'running',
    nodeExecutions: [{ nodeId: 'node-1', status: 'running' }],
    save: jest.fn().mockResolvedValue({}),
  };

  const mockRunModel = {
    findById: jest.fn().mockReturnValue({ exec: () => Promise.resolve(mockRun) }),
  };

  const mockInstanceModel = {
    findOneAndUpdate: jest
      .fn()
      .mockReturnValue({ exec: () => Promise.resolve(null) }),
    findByIdAndUpdate: jest
      .fn()
      .mockReturnValue({ exec: () => Promise.resolve({}) }),
  };

  const mockProcessManager = {
    poke: jest.fn(),
    injectStdin: jest.fn(),
  };

  const mockBacklog = {
    createTask: jest.fn().mockResolvedValue({}),
  };

  const mockEventEmitter = { emit: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowNodeExecutorService,
        {
          provide: getModelToken(AgentInstance.name),
          useValue: mockInstanceModel,
        },
        {
          provide: getModelToken(WorkflowRun.name),
          useValue: mockRunModel,
        },
        {
          provide: ZeroClawProcessManagerService,
          useValue: mockProcessManager,
        },
        { provide: BacklogService, useValue: mockBacklog },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<WorkflowNodeExecutorService>(
      WorkflowNodeExecutorService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('executeNode()', () => {
    it('should pause run and emit approval_needed when requiresHumanApproval is true', async () => {
      const node = {
        id: 'node-1',
        description: 'Review step',
        agentRole: 'reviewer',
        requiresHumanApproval: true,
        nextNodeId: null,
        onSuccessNodeId: null,
        onFailNodeId: null,
      };
      await service.executeNode(mockRun as any, node as any);
      expect(mockRun.status).toBe('paused');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'workflow.node.approval_needed',
        expect.objectContaining({ nodeId: 'node-1' }),
      );
    });

    it('should signal agent when one is available and no approval required', async () => {
      const mockAgent = {
        _id: new Types.ObjectId(),
        displayName: 'Dev Agent',
        pid: 12345,
      };
      mockInstanceModel.findOneAndUpdate.mockReturnValueOnce({
        exec: () => Promise.resolve(mockAgent),
      });
      const node = {
        id: 'node-1',
        description: 'Implement feature',
        agentRole: 'developer',
        requiresHumanApproval: false,
        nextNodeId: null,
        onSuccessNodeId: null,
        onFailNodeId: null,
      };
      await service.executeNode(mockRun as any, node as any);
      expect(mockProcessManager.poke).toHaveBeenCalledWith(12345);
      expect(mockProcessManager.injectStdin).toHaveBeenCalled();
    });

    it('should log warning and return when no agent found', async () => {
      mockInstanceModel.findOneAndUpdate.mockReturnValueOnce({
        exec: () => Promise.resolve(null),
      });
      const node = {
        id: 'node-1',
        description: 'Task',
        agentRole: 'developer',
        requiresHumanApproval: false,
        nextNodeId: null,
        onSuccessNodeId: null,
        onFailNodeId: null,
      };
      await expect(
        service.executeNode(mockRun as any, node as any),
      ).resolves.not.toThrow();
      expect(mockProcessManager.injectStdin).not.toHaveBeenCalled();
    });
  });

  describe('handleNodeCompleted()', () => {
    it('should emit workflow.advance when a node completes', async () => {
      await service.handleNodeCompleted({
        runId: runId.toString(),
        nodeId: 'node-1',
        projectId: projectId.toString(),
        tenantId: tenantId.toString(),
        storyId: null,
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'workflow.advance',
        expect.objectContaining({ runId: runId.toString() }),
      );
    });
  });
});
