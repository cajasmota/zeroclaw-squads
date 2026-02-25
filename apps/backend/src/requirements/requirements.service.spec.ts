import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RequirementsService } from './requirements.service';
import { RequirementsDocument } from './requirements-document.schema';

const TENANT_ID = new Types.ObjectId();
const PROJECT_ID = new Types.ObjectId();
const DOC_ID = new Types.ObjectId();

const MOCK_DOC = {
  _id: DOC_ID,
  projectId: PROJECT_ID,
  tenantId: TENANT_ID,
  title: 'System Overview',
  content: '# Overview\n\nThis document describes...',
  parentId: null,
  order: 0,
};

describe('RequirementsService', () => {
  let service: RequirementsService;
  let mockModel: {
    find: jest.Mock;
    findOneAndUpdate: jest.Mock;
    deleteOne: jest.Mock;
    save: jest.Mock;
    new: jest.Mock;
  };

  beforeEach(async () => {
    const saveMock = jest.fn().mockResolvedValue(MOCK_DOC);

    mockModel = {
      find: jest.fn().mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue([MOCK_DOC]) }),
      }),
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(MOCK_DOC),
      }),
      deleteOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      }),
      save: saveMock,
      new: jest.fn(),
    };

    // Make the model act as a constructor
    const MockModelConstructor = jest.fn().mockImplementation(() => ({
      save: saveMock,
    }));
    Object.assign(MockModelConstructor, mockModel);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequirementsService,
        {
          provide: getModelToken(RequirementsDocument.name),
          useValue: MockModelConstructor,
        },
      ],
    }).compile();

    service = module.get<RequirementsService>(RequirementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('queries with projectId and tenantId', async () => {
      const result = await service.findAll(PROJECT_ID, TENANT_ID);
      expect(result).toEqual([MOCK_DOC]);
      expect(mockModel.find).toHaveBeenCalledWith({
        projectId: PROJECT_ID,
        tenantId: TENANT_ID,
      });
    });
  });

  describe('create', () => {
    it('creates a new requirements document', async () => {
      const result = await service.create(PROJECT_ID, TENANT_ID, {
        title: 'New Doc',
        content: '# New\n\nContent here',
      });
      expect(result).toEqual(MOCK_DOC);
    });

    it('accepts parentId and order', async () => {
      const parentId = new Types.ObjectId().toHexString();
      const result = await service.create(PROJECT_ID, TENANT_ID, {
        title: 'Child Doc',
        content: '',
        parentId,
        order: 2,
      });
      expect(result).toEqual(MOCK_DOC);
    });
  });

  describe('update', () => {
    it('updates document by id with tenantId filter', async () => {
      const result = await service.update(
        PROJECT_ID,
        TENANT_ID,
        DOC_ID.toHexString(),
        {
          content: '# Updated content',
        },
      );
      expect(result).toEqual(MOCK_DOC);
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(Types.ObjectId),
          projectId: PROJECT_ID,
          tenantId: TENANT_ID,
        }),
        expect.objectContaining({
          $set: expect.objectContaining({ content: '# Updated content' }),
        }),
        { new: true },
      );
    });

    it('throws NotFoundException if document not found', async () => {
      mockModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.update(PROJECT_ID, TENANT_ID, DOC_ID.toHexString(), {
          title: 'x',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes document with tenantId filter', async () => {
      await service.delete(PROJECT_ID, TENANT_ID, DOC_ID.toHexString());
      expect(mockModel.deleteOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(Types.ObjectId),
          projectId: PROJECT_ID,
          tenantId: TENANT_ID,
        }),
      );
    });

    it('throws NotFoundException when nothing deleted', async () => {
      mockModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });
      await expect(
        service.delete(PROJECT_ID, TENANT_ID, DOC_ID.toHexString()),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
