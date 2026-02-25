import { EventEmitter2 } from '@nestjs/event-emitter';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AesGateway } from '../websocket/aes.gateway';
import { WorkflowRun } from './workflow-run.schema';
import { WorkflowTemplate } from './workflow-template.schema';
import { WorkflowsService } from './workflows.service';

const tenantId = new Types.ObjectId();
const projectId = new Types.ObjectId();

const mockTemplate = {
  _id: new Types.ObjectId(),
  name: 'Feature Development',
  isGlobal: true,
  nodes: [
    {
      id: 'n1',
      type: 'action',
      agentRole: 'developer',
      requiresHumanApproval: false,
      description: 'Implement',
      nextNodeId: 'n2',
    },
    {
      id: 'n2',
      type: 'action',
      agentRole: 'reviewer',
      requiresHumanApproval: false,
      description: 'Review',
      nextNodeId: 'n3',
    },
    {
      id: 'n3',
      type: 'approval',
      agentRole: '',
      requiresHumanApproval: true,
      description: 'Approve',
    },
  ],
  edges: [
    { from: 'n1', to: 'n2' },
    { from: 'n2', to: 'n3' },
  ],
};

const mockRunSave = jest.fn().mockResolvedValue(undefined);
const mockRun = {
  _id: new Types.ObjectId(),
  projectId,
  tenantId,
  status: 'running',
  currentNodeId: 'n1',
  nodeExecutions: [{ nodeId: 'n1', status: 'running' }],
  save: mockRunSave,
};

const mockTemplateModel = {
  findOne: jest
    .fn()
    .mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) }),
  find: jest.fn().mockReturnValue({
    lean: () => ({ exec: () => Promise.resolve([mockTemplate]) }),
  }),
  findById: jest.fn().mockReturnValue({
    lean: () => ({ exec: () => Promise.resolve(mockTemplate) }),
  }),
  create: jest.fn().mockResolvedValue(mockTemplate),
};

const mockRunModel = {
  create: jest.fn().mockResolvedValue(mockRun),
  findById: jest.fn().mockReturnValue({
    exec: () => Promise.resolve({ ...mockRun, save: mockRunSave }),
  }),
  find: jest.fn().mockReturnValue({
    sort: () => ({ lean: () => ({ exec: () => Promise.resolve([]) }) }),
  }),
  findOne: jest
    .fn()
    .mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) }),
};

describe('WorkflowsService', () => {
  let service: WorkflowsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        {
          provide: getModelToken(WorkflowTemplate.name),
          useValue: mockTemplateModel,
        },
        { provide: getModelToken(WorkflowRun.name), useValue: mockRunModel },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        {
          provide: AesGateway,
          useValue: {
            emitWorkflowNode: jest.fn(),
            emitApprovalNeeded: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAllTemplates()', () => {
    it('should return templates for tenant', async () => {
      const result = await service.findAllTemplates(tenantId);
      expect(result).toHaveLength(1);
    });
  });

  describe('triggerWorkflow()', () => {
    it('should create a WorkflowRun and start the first node', async () => {
      const templateId = mockTemplate._id.toString();
      const run = await service.triggerWorkflow(
        projectId,
        tenantId,
        templateId,
      );
      expect(mockRunModel.create).toHaveBeenCalled();
      expect(run.currentNodeId).toBe('n1');
    });
  });

  describe('createTemplate()', () => {
    it('should create a new workflow template', async () => {
      const result = await service.createTemplate(tenantId, {
        name: 'Custom',
        nodes: [],
      });
      expect(mockTemplateModel.create).toHaveBeenCalled();
    });
  });

  describe('getRunHistory()', () => {
    it('should return empty list when no runs', async () => {
      const result = await service.getRunHistory(projectId, tenantId);
      expect(result).toHaveLength(0);
    });
  });
});
