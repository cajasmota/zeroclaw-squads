import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Aes256EncryptionService } from '../common/services/aes256-encryption.service';
import { Project } from './project.schema';
import { ProjectsService } from './projects.service';

const tenantId = new Types.ObjectId();
const projectId = new Types.ObjectId();

const mockProject = {
  _id: projectId,
  tenantId,
  name: 'Test Project',
  slug: 'test-project',
  brandColor: '#004176',
  status: 'active',
  roles: { librarian: null, architect: null, pm: null, developer: [], reviewer: [], optional: [] },
  config: { slackToken: '', slackChannelId: '', repoUrl: '', githubApp: {}, inviteUsers: [], llmKeys: {} },
  toObject: function() { return { ...this }; },
};

const modelFind = jest.fn();
const modelFindOne = jest.fn();
const modelCreate = jest.fn();
const modelFindOneAndUpdate = jest.fn();

describe('ProjectsService', () => {
  let service: ProjectsService;
  let mockEncryption: Partial<Aes256EncryptionService>;
  let mockEventEmitter: Partial<EventEmitter2>;

  beforeEach(async () => {
    mockEncryption = { encrypt: jest.fn((v) => `enc:${v}`), decrypt: jest.fn((v) => v.replace('enc:', '')) };
    mockEventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getModelToken(Project.name), useValue: { find: modelFind, findOne: modelFindOne, create: modelCreate, findOneAndUpdate: modelFindOneAndUpdate } },
        { provide: Aes256EncryptionService, useValue: mockEncryption },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create()', () => {
    it('should create a project with auto-generated slug', async () => {
      modelFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });
      modelCreate.mockResolvedValue(mockProject);

      const result = await service.create(tenantId, { name: 'Test Project' });
      expect(result.slug).toBe('test-project');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('project.created', expect.any(Object));
    });

    it('should encrypt sensitive config fields', async () => {
      modelFindOne.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });
      modelCreate.mockResolvedValue(mockProject);

      await service.create(tenantId, { name: 'Test Project', config: { slackToken: 'token123' } });
      expect(mockEncryption.encrypt).toHaveBeenCalledWith('token123');
    });
  });

  describe('findById()', () => {
    it('should return project with sanitized config', async () => {
      const projWithToken = {
        ...mockProject,
        config: { ...mockProject.config, slackToken: 'enc:token' },
      };
      modelFindOne.mockReturnValue({
        populate: () => ({ lean: () => ({ exec: () => Promise.resolve(projWithToken) }) }),
      });

      const result = await service.findById(tenantId, projectId.toString());
      expect(result.config.slackToken).toBe('[encrypted]');
    });

    it('should throw NotFoundException when not found', async () => {
      modelFindOne.mockReturnValue({ populate: () => ({ lean: () => ({ exec: () => Promise.resolve(null) }) }) });
      await expect(service.findById(tenantId, projectId.toString())).rejects.toThrow(NotFoundException);
    });
  });
});
