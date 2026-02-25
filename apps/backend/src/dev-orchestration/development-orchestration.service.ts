import {Injectable, Logger} from '@nestjs/common';
import {EventEmitter2, OnEvent} from '@nestjs/event-emitter';
import {InjectModel} from '@nestjs/mongoose';
import {Model, Types} from 'mongoose';
import {AgentInstance, AgentInstanceDocument,} from '../agent-instances/agent-instance.schema';
import {Story, StoryDocument} from '../backlog/story.schema';
import {BacklogService} from '../backlog/backlog.service';
import {SlackService} from '../project-initializer/slack.service';
import {AesGateway} from '../websocket/aes.gateway';
import {ZeroClawProcessManagerService} from '../zeroclaw/zeroclaw-process-manager.service';
import {AgentAvailabilityService} from './agent-availability.service';
import {StoryContextSerializerService} from './story-context-serializer.service';

@Injectable()
export class DevelopmentOrchestrationService {
  private readonly logger = new Logger(DevelopmentOrchestrationService.name);

  constructor(
    @InjectModel(AgentInstance.name)
    private readonly instanceModel: Model<AgentInstanceDocument>,
    @InjectModel(Story.name)
    private readonly storyModel: Model<StoryDocument>,
    private readonly backlogService: BacklogService,
    private readonly processManager: ZeroClawProcessManagerService,
    private readonly availability: AgentAvailabilityService,
    private readonly contextSerializer: StoryContextSerializerService,
    private readonly slack: SlackService,
    private readonly eventEmitter: EventEmitter2,
    private readonly gateway: AesGateway,
  ) {}

  @OnEvent('sprint.ready')
  async handleSprintReady(payload: {
    sprintId: string;
    projectId: string;
    tenantId: string;
  }): Promise<void> {
    this.logger.log(`Sprint ${payload.sprintId} is ready — notifying PM agent`);
    try {
      const projectId = new Types.ObjectId(payload.projectId);
      const tenantId = new Types.ObjectId(payload.tenantId);

      // Find stories in the sprint with 'selected' or 'backlog' status
      const stories = await this.backlogService.findStories(
        projectId,
        tenantId,
        {
          sprintId: payload.sprintId,
          status: 'selected',
        },
      );

      // Find PM agent
      const pmAgent = await this.instanceModel
        .findOne({
          projectId,
          status: 'idle',
          'aieos_identity.identity.role': /pm|product.manager/i,
        })
        .exec();

      if (!pmAgent) {
        this.logger.warn(
          `No idle PM agent found for project ${payload.projectId}`,
        );
        return;
      }

      // Find available developer agents
      const devAgents = await this.instanceModel
        .find({
          projectId,
          status: 'idle',
          'config.canWriteCode': true,
        })
        .lean()
        .exec();

      // Signal PM agent with sprint context
      if (pmAgent.pid) {
        this.processManager.poke(pmAgent.pid);
        this.processManager.injectStdin(
          pmAgent._id.toString(),
          `SPRINT_READY: ${payload.sprintId}\nSTORIES: ${JSON.stringify(stories)}\nAVAILABLE_DEVELOPERS: ${JSON.stringify(devAgents)}`,
        );
      }
    } catch (e) {
      this.logger.error(`Failed to handle sprint.ready: ${e.message}`);
    }
  }

  async assignStory(
    storyId: string,
    agentInstanceId: string,
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
  ): Promise<any> {
    const branchName = `feature/${storyId}`;

    const story = await this.backlogService.updateStory(
      projectId,
      tenantId,
      storyId,
      {
        assignedTo: [new Types.ObjectId(agentInstanceId)] as any,
        branchName,
      },
    );

    await this.backlogService.updateStatus(
      storyId,
      projectId,
      tenantId,
      'in_progress',
    );
    this.gateway.emitStoryStatus(projectId.toString(), storyId, 'in_progress');

    this.eventEmitter.emit('story.assigned', {
      storyId,
      agentInstanceId,
      projectId: projectId.toString(),
      tenantId: tenantId.toString(),
    });

    return story;
  }

  @OnEvent('story.assigned')
  async handleStoryAssigned(payload: {
    storyId: string;
    agentInstanceId?: string;
    projectId: string;
    tenantId: string;
  }): Promise<void> {
    if (!payload.agentInstanceId) return;
    try {
      const agent = await this.instanceModel
        .findById(payload.agentInstanceId)
        .lean()
        .exec();
      if (!agent) return;

      const stories = await this.backlogService.findStories(
        new Types.ObjectId(payload.projectId),
        new Types.ObjectId(payload.tenantId),
      );
      const story = stories.find((s) => s._id?.toString() === payload.storyId);
      if (!story) return;

      const context = this.contextSerializer.serialize(story as any);

      // Signal developer agent
      if (agent.pid) {
        this.processManager.poke(agent.pid);
        this.processManager.injectStdin(
          agent._id.toString(),
          `STORY_ASSIGNED:\n${context}`,
        );
      }

      this.logger.log(
        `Developer agent ${agent.displayName} notified for story ${payload.storyId}`,
      );
    } catch (e) {
      this.logger.error(`Failed to handle story.assigned: ${e.message}`);
    }
  }

  @OnEvent('github.pr.opened')
  async onGitHubPROpened(payload: {
    prNumber: number;
    branchName: string;
  }): Promise<void> {
    if (!payload.branchName) return;
    try {
      const story = await this.storyModel
        .findOne({ branchName: payload.branchName })
        .lean()
        .exec();
      if (!story) return;
      // Store the PR number on the story for later merge
      await this.storyModel
        .updateOne({ _id: story._id }, { $set: { prNumber: payload.prNumber } })
        .exec();
      await this.handlePROpened(
        payload.prNumber,
        payload.branchName,
        story.projectId,
        story.tenantId,
      );
    } catch (e) {
      this.logger.error(`Failed to handle github.pr.opened: ${e.message}`);
    }
  }

  @OnEvent('github.pr.comment')
  async onGitHubPRComment(payload: {
    prNumber: number;
    branchName: string;
    body: string;
  }): Promise<void> {
    try {
      // Try to find the story by prNumber since branchName may be empty for issue_comment events
      const query: Record<string, any> = {};
      if (payload.branchName) {
        query.branchName = payload.branchName;
      } else if (payload.prNumber) {
        query.prNumber = payload.prNumber;
      }
      if (!Object.keys(query).length) return;
      const story = await this.storyModel.findOne(query).lean().exec();
      if (!story) return;
      await this.handlePRFeedback(
        payload.prNumber,
        payload.body,
        story.branchName,
        story.projectId,
        story.tenantId,
      );
    } catch (e) {
      this.logger.error(`Failed to handle github.pr.comment: ${e.message}`);
    }
  }

  @OnEvent('github.pr.merged')
  async onGitHubPRMerged(payload: {
    prNumber: number;
    branchName: string;
  }): Promise<void> {
    if (!payload.branchName) return;
    try {
      const story = await this.storyModel
        .findOne({ branchName: payload.branchName })
        .lean()
        .exec();
      if (!story) return;
      await this.handlePRMerged(
        payload.branchName,
        story.projectId,
        story.tenantId,
      );
    } catch (e) {
      this.logger.error(`Failed to handle github.pr.merged: ${e.message}`);
    }
  }

  @OnEvent('story.approved')
  async handleStoryApproved(payload: {
    storyId: string;
    projectId: string;
    tenantId: string;
  }): Promise<void> {
    try {
      const projectId = new Types.ObjectId(payload.projectId);
      const pmAgent = await this.instanceModel
        .findOne({
          projectId,
          'aieos_identity.identity.role': /pm|product.manager/i,
          status: { $in: ['idle', 'busy'] },
        })
        .lean()
        .exec();
      if (pmAgent?.pid) {
        this.processManager.poke(pmAgent.pid);
        this.processManager.injectStdin(
          pmAgent._id.toString(),
          `STORY_APPROVED: ${payload.storyId}`,
        );
      }
    } catch (e) {
      this.logger.error(`Failed to handle story.approved: ${e.message}`);
    }
  }

  async handlePROpened(
    prNumber: number,
    branchName: string,
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
  ): Promise<void> {
    const stories = await this.backlogService.findStories(projectId, tenantId);
    const story = (stories as any[]).find((s) => s.branchName === branchName);
    if (!story) return;

    const storyId = story._id.toString();
    await this.backlogService.updateStatus(
      storyId,
      projectId,
      tenantId,
      'review',
    );
    this.gateway.emitStoryStatus(projectId.toString(), storyId, 'review');

    const reviewer = await this.availability.getAvailableAgent(
      projectId,
      'reviewer',
    );
    if (reviewer?.pid) {
      this.processManager.poke(reviewer.pid);
      this.processManager.injectStdin(
        reviewer._id.toString(),
        `PR_REVIEW_REQUEST:\nPR_NUMBER: ${prNumber}\nBRANCH: ${branchName}\n${this.contextSerializer.serialize(story)}`,
      );
    }
  }

  async handlePRFeedback(
    prNumber: number,
    commentBody: string,
    branchName: string,
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
  ): Promise<void> {
    const stories = await this.backlogService.findStories(projectId, tenantId);
    const story = (stories as any[]).find((s) => s.branchName === branchName);
    if (!story || !story.assignedTo?.length) return;

    const agentId = story.assignedTo[0].toString();
    const agent = await this.instanceModel.findById(agentId).lean().exec();
    if (!agent?.pid) return;

    this.processManager.poke(agent.pid);
    this.processManager.injectStdin(agentId, `PR_FEEDBACK: ${commentBody}`);
  }

  async handlePRMerged(
    branchName: string,
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
  ): Promise<void> {
    const stories = await this.backlogService.findStories(projectId, tenantId);
    const story = (stories as any[]).find((s) => s.branchName === branchName);
    if (!story) return;

    const mergedStoryId = story._id.toString();
    await this.backlogService.updateStatus(
      mergedStoryId,
      projectId,
      tenantId,
      'done',
    );
    this.gateway.emitStoryStatus(projectId.toString(), mergedStoryId, 'done');
    this.eventEmitter.emit('librarian.reindex', {
      projectId: projectId.toString(),
    });
  }
}
