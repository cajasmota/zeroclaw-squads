import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AesGateway } from '../websocket/aes.gateway';
import { BacklogService } from './backlog.service';
import { Epic } from './epic.schema';
import { Sprint } from './sprint.schema';
import { Story } from './story.schema';
import { Task } from './task.schema';

const tenantId = new Types.ObjectId();
const projectId = new Types.ObjectId();

const mockFind = jest.fn();
const mockCreate = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockFindOneAndDelete = jest.fn();

const makeModel = () => ({
  find: mockFind,
  create: mockCreate,
  findOneAndUpdate: mockFindOneAndUpdate,
  findOneAndDelete: mockFindOneAndDelete,
});

describe('BacklogService', () => {
  let service: BacklogService;
  let mockGateway: Partial<AesGateway>;
  let mockEventEmitter: Partial<EventEmitter2>;

  beforeEach(async () => {
    mockGateway = { emitStoryStatus: jest.fn() };
    mockEventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BacklogService,
        { provide: getModelToken(Epic.name), useValue: makeModel() },
        { provide: getModelToken(Story.name), useValue: makeModel() },
        { provide: getModelToken(Task.name), useValue: makeModel() },
        { provide: getModelToken(Sprint.name), useValue: makeModel() },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AesGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<BacklogService>(BacklogService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findEpics()', () => {
    it('should return epics for project', async () => {
      mockFind.mockReturnValue({ sort: () => ({ lean: () => ({ exec: () => Promise.resolve([{ title: 'Epic 1' }]) }) }) });
      const result = await service.findEpics(projectId, tenantId);
      expect(result).toHaveLength(1);
    });
  });

  describe('updateStatus()', () => {
    it('should update story status and emit WebSocket event', async () => {
      const mockStory = { _id: new Types.ObjectId(), status: 'in_progress' };
      mockFindOneAndUpdate.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(mockStory) }) });

      await service.updateStatus(mockStory._id.toString(), projectId, tenantId, 'review');
      expect(mockGateway.emitStoryStatus).toHaveBeenCalledWith(
        projectId.toString(),
        mockStory._id.toString(),
        'review',
        undefined,
      );
    });
  });

  describe('markSprintReady()', () => {
    it('should mark sprint ready and emit event', async () => {
      const sprintId = new Types.ObjectId();
      const mockSprint = { _id: sprintId, isReady: true };
      mockFindOneAndUpdate.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(mockSprint) }) });

      await service.markSprintReady(projectId, tenantId, sprintId.toString());
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('sprint.ready', expect.any(Object));
    });
  });
});
