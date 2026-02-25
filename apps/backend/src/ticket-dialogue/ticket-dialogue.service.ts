import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BacklogService } from '../backlog/backlog.service';
import { GitHubPRService } from '../github/github-pr.service';
import { SlackService } from '../project-initializer/slack.service';
import { AesGateway } from '../websocket/aes.gateway';
import { ZeroClawProcessManagerService } from '../zeroclaw/zeroclaw-process-manager.service';
import { TicketComment, TicketCommentDocument } from './ticket-comment.schema';
import { InjectModel as MongooseInject } from '@nestjs/mongoose';

@Injectable()
export class TicketDialogueService {
  private readonly logger = new Logger(TicketDialogueService.name);

  constructor(
    @InjectModel(TicketComment.name)
    private readonly commentModel: Model<TicketCommentDocument>,
    private readonly backlogService: BacklogService,
    private readonly processManager: ZeroClawProcessManagerService,
    private readonly slack: SlackService,
    private readonly gateway: AesGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getComments(storyId: string, tenantId: Types.ObjectId) {
    return this.commentModel
      .find({ storyId: new Types.ObjectId(storyId), tenantId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
  }

  async postHumanComment(
    storyId: string,
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    userId: string,
    displayName: string,
    content: string,
  ) {
    const comment = await this.commentModel.create({
      storyId: new Types.ObjectId(storyId),
      projectId,
      tenantId,
      author: 'human',
      authorId: userId,
      authorDisplayName: displayName,
      content,
      type: 'message',
    });

    // Get story and inject into agent stdin
    const stories = await this.backlogService.findStories(projectId, tenantId);
    const story = (stories as any[]).find((s) => s._id.toString() === storyId);

    if (story?.assignedTo?.length) {
      const agentId = story.assignedTo[0].toString();

      // Inject full thread context before the new message (avoids stale context)
      const priorComments = await this.commentModel
        .find({ storyId: new Types.ObjectId(storyId), tenantId })
        .sort({ createdAt: 1 })
        .lean()
        .exec();
      if (priorComments.length > 0) {
        const context = priorComments.map((c) => ({
          author: c.authorDisplayName,
          text: c.content,
          type: c.type,
        }));
        this.processManager.injectStdin(
          agentId,
          `THREAD_CONTEXT: ${JSON.stringify(context)}`,
        );
      }

      this.processManager.injectStdin(agentId, `USER_MESSAGE: ${content}`);
    }

    if (story?.waitingForAnswer) {
      await this.backlogService.updateStory(projectId, tenantId, storyId, {
        waitingForAnswer: false,
      } as any);
    }

    // Broadcast via WebSocket
    (this.gateway as any).server
      ?.to(`project:${projectId}`)
      .emit('ticket:comment', comment);

    return comment;
  }

  async postAgentComment(
    storyId: string,
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    content: string,
    agentInstanceId: string,
    agentDisplayName: string,
  ) {
    const comment = await this.commentModel.create({
      storyId: new Types.ObjectId(storyId),
      projectId,
      tenantId,
      author: 'agent',
      authorId: agentInstanceId,
      authorDisplayName: agentDisplayName,
      content,
      type: 'message',
    });

    (this.gateway as any).server
      ?.to(`project:${projectId}`)
      .emit('ticket:comment', comment);
    return comment;
  }

  async approveStory(
    storyId: string,
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    userId: string,
    displayName: string,
  ) {
    await this.backlogService.updateStory(projectId, tenantId, storyId, {
      waitingForApproval: false,
    } as any);

    await this.commentModel.create({
      storyId: new Types.ObjectId(storyId),
      projectId,
      tenantId,
      author: 'human',
      authorId: userId,
      authorDisplayName: displayName,
      content: 'Approved ✅',
      type: 'approval',
    });

    this.eventEmitter.emit('story.approved', {
      storyId,
      projectId: projectId.toString(),
      tenantId: tenantId.toString(),
    });
    return { message: 'Story approved' };
  }

  async answerAgent(
    storyId: string,
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    userId: string,
    displayName: string,
    answer: string,
  ) {
    const comment = await this.commentModel.create({
      storyId: new Types.ObjectId(storyId),
      projectId,
      tenantId,
      author: 'human',
      authorId: userId,
      authorDisplayName: displayName,
      content: answer,
      type: 'answer',
    });

    await this.backlogService.updateStory(projectId, tenantId, storyId, {
      waitingForAnswer: false,
    } as any);

    const stories = await this.backlogService.findStories(projectId, tenantId);
    const story = (stories as any[]).find((s) => s._id.toString() === storyId);
    if (story?.assignedTo?.length) {
      const agentId = story.assignedTo[0].toString();
      this.processManager.injectStdin(agentId, `USER_MESSAGE: ${answer}`);
    }

    return comment;
  }

  async setWaitingForAnswer(
    storyId: string,
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
  ) {
    await this.backlogService.updateStory(projectId, tenantId, storyId, {
      waitingForAnswer: true,
    } as any);
  }

  async setWaitingForApproval(
    storyId: string,
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
  ) {
    await this.backlogService.updateStory(projectId, tenantId, storyId, {
      waitingForApproval: true,
    } as any);
  }
}
