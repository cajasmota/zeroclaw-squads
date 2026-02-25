import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Model, Types } from 'mongoose';
import {
  AgentInstance,
  AgentInstanceDocument,
} from '../agent-instances/agent-instance.schema';
import { Project, ProjectDocument } from '../projects/project.schema';
import { Aes256EncryptionService } from '../common/services/aes256-encryption.service';
import { GlobalSettingsService } from '../settings/global-settings.service';
import { AgentRoleEmojiService } from './agent-role-emoji.service';
import { SlackService } from './slack.service';
import {
  SlackChannelMapping,
  SlackChannelMappingDocument,
} from '../websocket/slack-channel-mapping.schema';

@Injectable()
export class ProjectInitializerService {
  private readonly logger = new Logger(ProjectInitializerService.name);

  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(AgentInstance.name)
    private readonly instanceModel: Model<AgentInstanceDocument>,
    @InjectModel(SlackChannelMapping.name)
    private readonly mappingModel: Model<SlackChannelMappingDocument>,
    private readonly slackService: SlackService,
    private readonly encryption: Aes256EncryptionService,
    private readonly emojiService: AgentRoleEmojiService,
    private readonly globalSettingsService: GlobalSettingsService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('project.created')
  async handleProjectCreated(payload: { projectId: string; tenantId: string }) {
    this.logger.log(`Initializing project ${payload.projectId}`);
    try {
      await this.initialize(payload.projectId, payload.tenantId);
    } catch (e) {
      this.logger.error(`Project initialization failed: ${e.message}`);
    }
  }

  async initialize(projectId: string, tenantId: string) {
    const project = await this.projectModel
      .findOne({
        _id: new Types.ObjectId(projectId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .lean()
      .exec();
    if (!project) return;

    // Step 1: Create directory structure
    await this.createDirectories(projectId);

    // Step 2: Slack channel setup
    let slackChannelId = project.config?.slackChannelId;
    if (!slackChannelId && project.config?.slackToken) {
      const token = this.tryDecrypt(project.config.slackToken);
      if (token) {
        slackChannelId = await this.slackService.createChannel(
          token,
          project.slug,
        );
        if (slackChannelId) {
          await this.projectModel.findByIdAndUpdate(projectId, {
            $set: { 'config.slackChannelId': slackChannelId },
          });
          // Store channel mapping
          await this.mappingModel.findOneAndUpdate(
            { channelId: slackChannelId },
            {
              channelId: slackChannelId,
              projectId: new Types.ObjectId(projectId),
              tenantId: new Types.ObjectId(tenantId),
            },
            { upsert: true },
          );
          // Invite users (project list takes priority, falls back to global)
          const inviteUsers =
            await this.globalSettingsService.resolveInviteUsers(
              new Types.ObjectId(tenantId),
              project,
            );
          if (inviteUsers.length) {
            await this.slackService.inviteUsers(
              token,
              slackChannelId,
              inviteUsers,
            );
          }
        }
      }
    }

    // Step 3: Emit agents spawn event
    this.eventEmitter.emit('agents.spawn.all', { projectId, tenantId });

    // Step 4: Send greetings
    if (slackChannelId && project.config?.slackToken) {
      await this.sendGreetings(projectId, tenantId, slackChannelId, project);
    }

    this.logger.log(`Project ${projectId} initialized successfully`);
  }

  private async createDirectories(projectId: string) {
    const artifactsRoot = this.configService.get<string>(
      'ARTIFACTS_ROOT',
      '/artifacts',
    );
    const projectDir = path.join(artifactsRoot, projectId);
    const dirs = [
      projectDir,
      path.join(projectDir, 'librarian'),
      path.join(projectDir, 'workspaces'),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Create per-agent workspace directories
    const instances = await this.instanceModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .lean()
      .exec();
    for (const instance of instances) {
      const instanceDir = path.join(
        projectDir,
        'workspaces',
        instance._id.toString(),
      );
      if (!fs.existsSync(instanceDir)) {
        fs.mkdirSync(instanceDir, { recursive: true });
      }
    }
  }

  private async sendGreetings(
    projectId: string,
    tenantId: string,
    channelId: string,
    project: any,
  ) {
    const instances = await this.instanceModel
      .find({
        projectId: new Types.ObjectId(projectId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .lean()
      .exec();

    const token = this.tryDecrypt(project.config.slackToken);
    if (!token) return;

    for (const instance of instances) {
      const greeting = `👋 Hello! I'm **${instance.displayName}**, your ${instance.config?.provider ?? 'AI'} ${instance.aieos_identity?.identity?.role ?? 'agent'}. Ready to work on this project!`;
      await this.slackService.postAsAgent(
        token,
        channelId,
        greeting,
        {
          displayName: instance.displayName,
          role: instance.config?.provider ?? 'agent',
        },
        project.brandColor ?? '#004176',
      );
    }
  }

  private tryDecrypt(value: string): string | null {
    if (!value || value === '[encrypted]') return null;
    try {
      return this.encryption.decrypt(value);
    } catch {
      return value; // might not be encrypted
    }
  }
}
