import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AgentTemplate } from './agent-template.schema';
import { TemplatesService } from './templates.service';

const tenantId = new Types.ObjectId();
const templateId = new Types.ObjectId();

const mockTemplate = {
  _id: templateId,
  tenantId,
  displayName: 'Test Developer',
  role: 'developer',
  tags: ['react', 'typescript'],
  soul: 'You are a developer',
  aieos_identity: { version: '1.1' },
  config: {
    model: 'gpt-4',
    provider: 'openai',
    skills: '',
    canWriteCode: true,
    mcpServers: [],
  },
  avatarUrl: '',
  toObject: () => ({ ...mockTemplate }),
};

const modelFind = jest.fn();
const modelCountDocuments = jest.fn();
const modelFindOne = jest.fn();
const modelCreate = jest.fn();
const modelFindOneAndUpdate = jest.fn();
const modelFindOneAndDelete = jest.fn();

describe('TemplatesService', () => {
  let service: TemplatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: getModelToken(AgentTemplate.name),
          useValue: {
            find: modelFind,
            countDocuments: modelCountDocuments,
            findOne: modelFindOne,
            create: modelCreate,
            findOneAndUpdate: modelFindOneAndUpdate,
            findOneAndDelete: modelFindOneAndDelete,
          },
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll()', () => {
    it('should return paginated list', async () => {
      modelFind.mockReturnValue({
        skip: () => ({
          limit: () => ({
            lean: () => ({ exec: () => Promise.resolve([mockTemplate]) }),
          }),
        }),
      });
      modelCountDocuments.mockReturnValue({ exec: () => Promise.resolve(1) });

      const result = await service.findAll(tenantId);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by role', async () => {
      modelFind.mockReturnValue({
        skip: () => ({
          limit: () => ({
            lean: () => ({ exec: () => Promise.resolve([mockTemplate]) }),
          }),
        }),
      });
      modelCountDocuments.mockReturnValue({ exec: () => Promise.resolve(1) });

      const result = await service.findAll(tenantId, { role: 'developer' });
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findById()', () => {
    it('should return template when found', async () => {
      modelFindOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(mockTemplate) }),
      });

      const result = await service.findById(tenantId, templateId.toString());
      expect(result.displayName).toBe('Test Developer');
    });

    it('should throw NotFoundException when not found', async () => {
      modelFindOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(null) }),
      });

      await expect(
        service.findById(tenantId, templateId.toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create()', () => {
    it('should create a template', async () => {
      modelCreate.mockResolvedValue(mockTemplate);

      const result = await service.create(tenantId, {
        displayName: 'Test Developer',
        role: 'developer',
      });
      expect(result.displayName).toBe('Test Developer');
    });
  });

  describe('update()', () => {
    it('should update a template', async () => {
      modelFindOneAndUpdate.mockReturnValue({
        lean: () => ({
          exec: () =>
            Promise.resolve({ ...mockTemplate, displayName: 'Updated' }),
        }),
      });

      const result = await service.update(tenantId, templateId.toString(), {
        displayName: 'Updated',
      });
      expect(result.displayName).toBe('Updated');
    });
  });

  describe('delete()', () => {
    it('should delete a template', async () => {
      modelFindOneAndDelete.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(mockTemplate) }),
      });

      const result = await service.delete(tenantId, templateId.toString());
      expect(result.message).toBe('Template deleted');
    });

    it('should throw NotFoundException when template not found', async () => {
      modelFindOneAndDelete.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(null) }),
      });

      await expect(
        service.delete(tenantId, templateId.toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
