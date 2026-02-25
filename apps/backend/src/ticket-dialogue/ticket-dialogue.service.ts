import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BacklogService } from '../backlog/backlog.service';
import { Aes256EncryptionService } from '../common/services/aes256-encryption.service';
import { GitHubPRService } from '../github/github-pr.service';
import { SlackService } from '../project-initializer/slack.service';
import { Project, ProjectDocument } from '../projects/project.schema';
import { AesGateway } from '../websocket/aes.gateway';
import { ZeroClawProcessManagerService } from '../zeroclaw/zeroclaw-process-manager.service';
import { TicketComment, TicketCommentDocument } from './ticket-comment.schema';

@Injectable()
export class TicketDialogueService {
  private readonly logger = new Logger(TicketDialogueService.name);

  constructor(
    @InjectModel(TicketComment.name)
    private readonly commentModel: Model<TicketCommentDocument>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    private readonly backlogService: BacklogService,
    private readonly processManager: ZeroClawProcessManagerService,
    private readonly slack: SlackService,
    private readonly encryption: Aes256EncryptionService,
    private readonly github: GitHubPRService,
    private readonly gateway: AesGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private tryDecrypt(value: string): string {
    try {
      return value?.includes(':') ? this.encryption.decrypt(value) : value;
    } catch {
      return value;
    }
  }

  private async postSlackThread(
    projectId: Types.ObjectId,
    storySlackThread: string,
    text: string,
    displayName: string,
  ): Promise<void> {
    if (!storySlackThread) return;
    try {
      const project = await this.projectModel
        .findOne({ _id: projectId })
        .lean()
        .exec();
      if (!project?.config?.slackToken || !project?.config?.slackChannelId)
        return;
      const token = this.tryDecrypt(project.config.slackToken);
      await this.slack.postThreadReplyAsAgent(
        token,
        project.config.slackChannelId,
        storySlackThread,
        text,
        { displayName, role: 'human' },
        project.brandColor ?? '#004176',
      );
    } catch (e) {
      this.logger.warn(`Slack thread reply failed: ${e.message}`);
    }
  }

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

    // Mirror to Slack thread
    if (story?.storySlackThread) {
      await this.postSlackThread(
        projectId,
        story.storySlackThread as string,
        content,
        displayName,
      );
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

    // Mirror agent comment to Slack thread
    const stories = await this.backlogService.findStories(projectId, tenantId);
    const story = (stories as any[]).find((s) => s._id.toString() === storyId);
    if (story?.storySlackThread) {
      await this.postSlackThread(
        projectId,
        story.storySlackThread,
        content,
        agentDisplayName,
      );
    }

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

    // Trigger PR merge if story has a PR number
    try {
      const stories = await this.backlogService.findStories(
        projectId,
        tenantId,
      );
      const story = (stories as any[]).find((s) => s._id.toString() === storyId);
      if (story?.prNumber) {
        const project = await this.projectModel
          .findOne({ _id: projectId })
          .lean()
          .exec();
        if (project) {
          await this.github.mergePullRequest(project, story.prNumber);
        }
      }
    } catch (e) {
      this.logger.warn(`PR merge failed (non-fatal): ${e.message}`);
    }

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

  @OnEvent('agent.stdout.waiting_for_answer')
  async handleWaitingForAnswer(payload: {
    storyId: string;
    projectId: string;
    tenantId: string;
  }): Promise<void> {
    try {
      await this.setWaitingForAnswer(
        payload.storyId,
        new Types.ObjectId(payload.projectId),
        new Types.ObjectId(payload.tenantId),
      );
    } catch (e) {
      this.logger.error(`Failed to set waitingForAnswer: ${e.message}`);
    }
  }

  @OnEvent('agent.stdout.waiting_for_approval')
  async handleWaitingForApproval(payload: {
    storyId: string;
    projectId: string;
    tenantId: string;
  }): Promise<void> {
    try {
      await this.setWaitingForApproval(
        payload.storyId,
        new Types.ObjectId(payload.projectId),
        new Types.ObjectId(payload.tenantId),
      );
    } catch (e) {
      this.logger.error(`Failed to set waitingForApproval: ${e.message}`);
    }
  }

  @OnEvent('agent.stdout.ticket_message')
  async handleTicketMessage(payload: {
    storyId: string;
    projectId: string;
    tenantId: string;
    content: string;
    agentInstanceId: string;
    agentDisplayName: string;
  }): Promise<void> {
    try {
      await this.postAgentComment(
        payload.storyId,
        new Types.ObjectId(payload.projectId),
        new Types.ObjectId(payload.tenantId),
        payload.content,
        payload.agentInstanceId,
        payload.agentDisplayName,
      );
    } catch (e) {
      this.logger.error(`Failed to post agent ticket message: ${e.message}`);
    }
  }
}
