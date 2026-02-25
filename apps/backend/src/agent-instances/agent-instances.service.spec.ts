import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AgentTemplate } from '../templates/agent-template.schema';
import { AgentInstance } from './agent-instance.schema';
import { AgentInstancesService } from './agent-instances.service';

const tenantId = new Types.ObjectId();
const projectId = new Types.ObjectId();
const templateId = new Types.ObjectId();
const instanceId = new Types.ObjectId();

const mockTemplate = {
  _id: templateId,
  tenantId,
  displayName: 'Developer Agent',
  role: 'developer',
  tags: ['typescript'],
  soul: 'You are a developer',
  aieos_identity: { version: '1.1', identity: { role: 'developer' } },
  config: { model: 'gpt-4', provider: 'openai', skills: '', canWriteCode: true, mcpServers: [] },
};

const mockLibrarianTemplate = {
  ...mockTemplate,
  displayName: 'Librarian Agent',
  aieos_identity: { version: '1.1', identity: { role: 'librarian' } },
};

const mockInstance = {
  _id: instanceId,
  projectId,
  tenantId,
  templateId,
  displayName: 'Developer Agent',
  identifier: 'developer-agent',
  workspacePath: `/artifacts/${projectId}/workspaces/${instanceId}/`,
  status: 'idle',
  toObject: () => ({ ...mockInstance }),
};

const templateFindOne = jest.fn();
const instanceFindOne = jest.fn();
const instanceCreate = jest.fn();
const instanceFind = jest.fn();
const instanceFindByIdAndUpdate = jest.fn();
const instanceFindOneAndUpdate = jest.fn();

describe('AgentInstancesService', () => {
  let service: AgentInstancesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentInstancesService,
        {
          provide: getModelToken(AgentTemplate.name),
          useValue: { findOne: templateFindOne },
        },
        {
          provide: getModelToken(AgentInstance.name),
          useValue: {
            findOne: instanceFindOne,
            find: instanceFind,
            create: instanceCreate,
            findByIdAndUpdate: instanceFindByIdAndUpdate,
            findOneAndUpdate: instanceFindOneAndUpdate,
          },
        },
      ],
    }).compile();

    service = module.get<AgentInstancesService>(AgentInstancesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createSnapshot()', () => {
    it('should create snapshot from template', async () => {
      templateFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(mockTemplate) }) });
      instanceFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });
      instanceCreate.mockResolvedValue(mockInstance);
      instanceFindByIdAndUpdate.mockResolvedValue(mockInstance);

      const result = await service.createSnapshot(projectId, tenantId, templateId);
      expect(result.displayName).toBe('Developer Agent');
      expect(result.workspacePath).toBeTruthy();
    });

    it('should throw NotFoundException when template not found', async () => {
      templateFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });

      await expect(service.createSnapshot(projectId, tenantId, templateId))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when creating a second Librarian for the same project', async () => {
      templateFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(mockLibrarianTemplate) }) });
      // First findOne for identifier uniqueness → null; second for singleton check → existing instance
      instanceFindOne
        .mockReturnValueOnce({ lean: () => ({ exec: () => Promise.resolve(null) }) })   // identifier check
        .mockReturnValueOnce({ lean: () => ({ exec: () => Promise.resolve(mockInstance) }) }); // singleton check

      await expect(service.createSnapshot(projectId, tenantId, templateId))
        .rejects.toThrow(BadRequestException);
    });

    it('should allow creating multiple Developer instances', async () => {
      templateFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(mockTemplate) }) });
      instanceFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });
      instanceCreate.mockResolvedValue(mockInstance);
      instanceFindByIdAndUpdate.mockResolvedValue(mockInstance);

      // Should not throw for non-singleton roles
      const result = await service.createSnapshot(projectId, tenantId, templateId);
      expect(result.displayName).toBe('Developer Agent');
    });
  });

  describe('findById()', () => {
    it('should return instance by id', async () => {
      instanceFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(mockInstance) }) });

      const result = await service.findById(instanceId.toString(), tenantId);
      expect(result.displayName).toBe('Developer Agent');
    });

    it('should throw NotFoundException when not found', async () => {
      instanceFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });

      await expect(service.findById(instanceId.toString(), tenantId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('syncFromTemplate()', () => {
    const instanceWithTemplate = { ...mockInstance, templateId };

    it('should sync only requested fields (soul only)', async () => {
      instanceFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(instanceWithTemplate) }) });
      templateFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(mockTemplate) }) });
      const updatedInstance = { ...instanceWithTemplate, soul: mockTemplate.soul };
      instanceFindOneAndUpdate.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(updatedInstance) }) });

      const result = await service.syncFromTemplate(tenantId, projectId, instanceId.toString(), { soul: true });
      expect(instanceFindOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        { $set: { soul: mockTemplate.soul } },
        expect.any(Object),
      );
      expect(result?.soul).toBe(mockTemplate.soul);
    });

    it('should sync all fields when all flags are true', async () => {
      instanceFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(instanceWithTemplate) }) });
      templateFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(mockTemplate) }) });
      instanceFindOneAndUpdate.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(instanceWithTemplate) }) });

      await service.syncFromTemplate(tenantId, projectId, instanceId.toString(), { soul: true, aieos: true, config: true });
      expect(instanceFindOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        { $set: { soul: mockTemplate.soul, aieos_identity: mockTemplate.aieos_identity, config: mockTemplate.config } },
        expect.any(Object),
      );
    });

    it('should not modify displayName or pid', async () => {
      instanceFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(instanceWithTemplate) }) });
      templateFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(mockTemplate) }) });
      instanceFindOneAndUpdate.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(instanceWithTemplate) }) });

      await service.syncFromTemplate(tenantId, projectId, instanceId.toString(), { soul: true });
      const setArg = instanceFindOneAndUpdate.mock.calls[0][1].$set;
      expect(setArg).not.toHaveProperty('displayName');
      expect(setArg).not.toHaveProperty('pid');
    });

    it('should throw NotFoundException when instance not found', async () => {
      instanceFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });

      await expect(
        service.syncFromTemplate(tenantId, projectId, instanceId.toString(), { soul: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when template not found', async () => {
      instanceFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(instanceWithTemplate) }) });
      templateFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });

      await expect(
        service.syncFromTemplate(tenantId, projectId, instanceId.toString(), { soul: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
