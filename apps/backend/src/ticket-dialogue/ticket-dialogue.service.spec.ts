// Mock ESM-only packages
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('@octokit/auth-app', () => ({
  createAppAuth: jest.fn().mockReturnValue(jest.fn()),
}));

import { EventEmitter2 } from '@nestjs/event-emitter';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { BacklogService } from '../backlog/backlog.service';
import { Aes256EncryptionService } from '../common/services/aes256-encryption.service';
import { GitHubPRService } from '../github/github-pr.service';
import { SlackService } from '../project-initializer/slack.service';
import { Project } from '../projects/project.schema';
import { AesGateway } from '../websocket/aes.gateway';
import { ZeroClawProcessManagerService } from '../zeroclaw/zeroclaw-process-manager.service';
import { TicketComment } from './ticket-comment.schema';
import { TicketDialogueService } from './ticket-dialogue.service';

describe('TicketDialogueService', () => {
  let service: TicketDialogueService;
  const projectId = new Types.ObjectId();
  const tenantId = new Types.ObjectId();
  const storyId = new Types.ObjectId().toString();

  const mockComment = {
    _id: new Types.ObjectId(),
    author: 'human',
    content: 'Test',
    toObject: () => ({}),
  };
  const mockCommentModel = {
    find: jest.fn().mockReturnValue({
      sort: () => ({ lean: () => ({ exec: () => Promise.resolve([]) }) }),
    }),
    create: jest.fn().mockResolvedValue(mockComment),
  };

  const mockBacklog = {
    findStories: jest
      .fn()
      .mockResolvedValue([
        { _id: new Types.ObjectId(), assignedTo: [], waitingForAnswer: false },
      ]),
    updateStory: jest.fn().mockResolvedValue({}),
    updateStatus: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketDialogueService,
        {
          provide: getModelToken(TicketComment.name),
          useValue: mockCommentModel,
        },
        {
          provide: getModelToken(Project.name),
          useValue: { findOne: jest.fn().mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) }) },
        },
        { provide: BacklogService, useValue: mockBacklog },
        {
          provide: ZeroClawProcessManagerService,
          useValue: { injectStdin: jest.fn(), poke: jest.fn() },
        },
        {
          provide: SlackService,
          useValue: { postThreadReplyAsAgent: jest.fn() },
        },
        {
          provide: Aes256EncryptionService,
          useValue: { encrypt: jest.fn(), decrypt: jest.fn(v => v) },
        },
        { provide: AesGateway, useValue: { server: null } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: GitHubPRService, useValue: { mergePullRequest: jest.fn() } },
      ],
    }).compile();

    service = module.get<TicketDialogueService>(TicketDialogueService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getComments()', () => {
    it('should return comments sorted chronologically', async () => {
      const result = await service.getComments(storyId, tenantId);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('postHumanComment()', () => {
    it('should create a comment with author human', async () => {
      await service.postHumanComment(
        storyId,
        projectId,
        tenantId,
        'user1',
        'Alice',
        'Hello agent!',
      );
      expect(mockCommentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ author: 'human', content: 'Hello agent!' }),
      );
    });
  });

  describe('approveStory()', () => {
    it('should clear waitingForApproval and post approval comment', async () => {
      const result = await service.approveStory(
        storyId,
        projectId,
        tenantId,
        'user1',
        'Alice',
      );
      expect(mockBacklog.updateStory).toHaveBeenCalledWith(
        projectId,
        tenantId,
        storyId,
        expect.objectContaining({ waitingForApproval: false }),
      );
      expect(result).toHaveProperty('message', 'Story approved');
    });
  });

  describe('setWaitingForAnswer()', () => {
    it('should set waitingForAnswer true', async () => {
      await service.setWaitingForAnswer(storyId, projectId, tenantId);
      expect(mockBacklog.updateStory).toHaveBeenCalledWith(
        projectId,
        tenantId,
        storyId,
        expect.objectContaining({ waitingForAnswer: true }),
      );
    });
  });
});
