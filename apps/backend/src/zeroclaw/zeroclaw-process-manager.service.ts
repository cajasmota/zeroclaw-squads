import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Story, StoryDocument } from '../backlog/story.schema';
import {
  AgentInstance,
  AgentInstanceDocument,
} from '../agent-instances/agent-instance.schema';
import { AgentInstancesService } from '../agent-instances/agent-instances.service';
import { GlobalSettingsService } from '../settings/global-settings.service';
import {
  TicketComment,
  TicketCommentDocument,
} from '../ticket-dialogue/ticket-comment.schema';
import { AesGateway } from '../websocket/aes.gateway';
import { AieosGeneratorService } from './aieos-generator.service';
import { ZeroClawConfigGeneratorService } from './zeroclaw-config-generator.service';

@Injectable()
export class ZeroClawProcessManagerService {
  private readonly logger = new Logger(ZeroClawProcessManagerService.name);
  private readonly processes = new Map<string, child_process.ChildProcess>();

  constructor(
    @InjectModel(AgentInstance.name)
    private readonly instanceModel: Model<AgentInstanceDocument>,
    @InjectModel(Story.name) private readonly storyModel: Model<StoryDocument>,
    @InjectModel(TicketComment.name)
    private readonly commentModel: Model<TicketCommentDocument>,
    private readonly configService: ConfigService,
    private readonly configGenerator: ZeroClawConfigGeneratorService,
    private readonly aieosGenerator: AieosGeneratorService,
    private readonly agentInstancesService: AgentInstancesService,
    private readonly globalSettingsService: GlobalSettingsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly gateway: AesGateway,
  ) {}

  @OnEvent('agents.spawn.all')
  async handleSpawnAll(payload: { projectId: string; tenantId: string }) {
    const instances = await this.instanceModel
      .find({
        projectId: new Types.ObjectId(payload.projectId),
        tenantId: new Types.ObjectId(payload.tenantId),
      })
      .lean()
      .exec();

    for (const instance of instances) {
      try {
        await this.spawn(instance as any, payload.projectId);
      } catch (e) {
        this.logger.error(
          `Failed to spawn agent ${instance.displayName}: ${e.message}`,
        );
      }
    }
  }

  async spawn(instance: any, projectId: string): Promise<void> {
    const binaryPath = this.configService.get<string>(
      'ZEROCLAW_BINARY_PATH',
      '',
    );
    if (!binaryPath || !fs.existsSync(binaryPath)) {
      this.logger.warn(
        `ZeroClaw binary not found at ${binaryPath}, skipping spawn`,
      );
      await this.agentInstancesService.updateStatus(
        (instance._id as Types.ObjectId).toString(),
        'idle',
      );
      return;
    }

    const workspacePath = instance.workspacePath;
    if (!workspacePath) {
      this.logger.warn(`No workspace path for agent ${instance.displayName}`);
      return;
    }

    // Write config files
    this.writeConfigFiles(instance, workspacePath);

    const instanceId = (instance._id as Types.ObjectId).toString();

    // Resolve LLM keys (global fallback, project override)
    const tenantId =
      instance.tenantId instanceof Types.ObjectId
        ? instance.tenantId
        : new Types.ObjectId(instance.tenantId.toString());
    const resolvedKeys = await this.globalSettingsService.resolveLlmKeys(
      tenantId,
      null,
    );

    const proc = child_process.spawn(binaryPath, ['daemon'], {
      cwd: workspacePath,
      env: {
        ...process.env,
        AES_PROJECT_ID: projectId,
        AES_AGENT_ID: instanceId,
        AES_STORY_ID: '',
        AES_RUN_ID: '',
        ...(resolvedKeys.openai ? { OPENAI_API_KEY: resolvedKeys.openai } : {}),
        ...(resolvedKeys.anthropic
          ? { ANTHROPIC_API_KEY: resolvedKeys.anthropic }
          : {}),
        ...(resolvedKeys.google ? { GOOGLE_API_KEY: resolvedKeys.google } : {}),
        OLLAMA_ENDPOINT: resolvedKeys.ollamaEndpoint,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.processes.set(instanceId, proc);
    await this.agentInstancesService.updatePid(instanceId, proc.pid ?? null);
    await this.agentInstancesService.updateStatus(instanceId, 'idle');

    proc.stdout?.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      this.gateway.emitAgentLog(instanceId, projectId, line, 'stdout');
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      this.gateway.emitAgentLog(instanceId, projectId, line, 'stderr');
    });

    proc.on('exit', async (code) => {
      this.logger.warn(`Agent ${instanceId} exited with code ${code}`);
      this.processes.delete(instanceId);
      await this.agentInstancesService.updateStatus(instanceId, 'idle');
    });

    this.logger.log(`Spawned agent ${instance.displayName} (pid: ${proc.pid})`);
  }

  private writeConfigFiles(instance: any, workspacePath: string) {
    fs.mkdirSync(path.join(workspacePath, 'state'), { recursive: true });
    fs.mkdirSync(path.join(workspacePath, 'memory'), { recursive: true });

    const configToml = this.configGenerator.generateConfig(instance);
    fs.writeFileSync(
      path.join(workspacePath, 'zeroclaw.config.toml'),
      configToml,
    );

    const identityJson = this.aieosGenerator.generateIdentityJson(instance);
    fs.writeFileSync(
      path.join(workspacePath, 'identity.json'),
      JSON.stringify(identityJson, null, 2),
    );

    const soul = this.configGenerator.generateAieosSoul(instance.soul);
    fs.writeFileSync(path.join(workspacePath, 'soul.md'), soul);
  }

  kill(pid: number): void {
    try {
      process.kill(pid, 'SIGTERM');
    } catch (e) {
      this.logger.warn(`Failed to kill pid ${pid}: ${e.message}`);
    }
  }

  poke(pid: number): void {
    try {
      process.kill(pid, 'SIGUSR1');
    } catch (e) {
      this.logger.warn(`Failed to poke pid ${pid}: ${e.message}`);
    }
  }

  injectStdin(instanceId: string, message: string): void {
    const proc = this.processes.get(instanceId);
    if (proc?.stdin) {
      proc.stdin.write(`${message}\n`);
    }
  }

  isAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  @OnEvent('slack.message.received')
  async handleSlackMessage(payload: {
    projectId: string;
    tenantId: string;
    channelId: string;
    text: string;
    mentionedSlackUserId?: string;
    threadTs?: string | null;
  }): Promise<void> {
    const projectId = new Types.ObjectId(payload.projectId);
    const tenantId = new Types.ObjectId(payload.tenantId);

    let target: AgentInstanceDocument | null = null;

    if (payload.mentionedSlackUserId) {
      target = await this.instanceModel
        .findOne({
          projectId,
          tenantId,
          'config.slackUserId': payload.mentionedSlackUserId,
        })
        .exec();
    }

    if (!target) {
      target = await this.instanceModel
        .findOne({
          projectId,
          tenantId,
          'aieos_identity.identity.role': /pm|product.manager/i,
          status: { $in: ['idle', 'busy'] },
        })
        .exec();
    }

    if (!target) {
      this.logger.warn(
        `No target agent for Slack message in project ${payload.projectId}`,
      );
      return;
    }

    const instanceId = target._id.toString();
    if (target.pid) this.poke(target.pid);

    // If message is part of a known story thread, inject prior context first
    if (payload.threadTs) {
      const story = await this.storyModel
        .findOne({ projectId, tenantId, storySlackThread: payload.threadTs })
        .lean()
        .exec();
      if (story) {
        const priorComments = await this.commentModel
          .find({ storyId: story._id, tenantId })
          .sort({ createdAt: 1 })
          .lean()
          .exec();
        if (priorComments.length > 0) {
          const context = priorComments.map((c) => ({
            author: c.authorDisplayName,
            text: c.content,
            type: c.type,
          }));
          this.injectStdin(
            instanceId,
            `THREAD_CONTEXT: ${JSON.stringify(context)}`,
          );
        }
      }
    }

    this.injectStdin(instanceId, `USER_MESSAGE: ${payload.text}`);
    this.logger.log(`Routed Slack message to agent ${target.displayName}`);
  }
}
