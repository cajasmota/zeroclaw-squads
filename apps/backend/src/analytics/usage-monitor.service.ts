import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import { Model, Types } from 'mongoose';
import { AgentInstance, AgentInstanceDocument } from '../agent-instances/agent-instance.schema';
import { UsageEvent, UsageEventDocument } from './usage-event.schema';

@Injectable()
export class UsageMonitorService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(UsageMonitorService.name);
  private watcher: chokidar.FSWatcher | null = null;
  private readonly fileOffsets = new Map<string, number>();

  constructor(
    @InjectModel(UsageEvent.name) private readonly usageEventModel: Model<UsageEventDocument>,
    @InjectModel(AgentInstance.name) private readonly instanceModel: Model<AgentInstanceDocument>,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap() {
    const artifactsRoot = this.configService.get<string>('ARTIFACTS_ROOT', '/artifacts');
    const globPattern = path.join(artifactsRoot, '**/state/costs.jsonl');

    try {
      this.watcher = chokidar.watch(globPattern, {
        ignoreInitial: false,
        persistent: true,
      });

      this.watcher.on('change', (filePath: string) => this.processFile(filePath));
      this.watcher.on('add', (filePath: string) => this.processFile(filePath));
      this.logger.log(`Watching: ${globPattern}`);
    } catch (e) {
      this.logger.warn(`Failed to start usage monitor: ${e.message}`);
    }
  }

  onApplicationShutdown() {
    this.watcher?.close();
  }

  private async processFile(filePath: string) {
    try {
      const stat = fs.statSync(filePath);
      const offset = this.fileOffsets.get(filePath) ?? 0;
      if (stat.size <= offset) return;

      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(stat.size - offset);
      fs.readSync(fd, buf, 0, buf.length, offset);
      fs.closeSync(fd);
      this.fileOffsets.set(filePath, stat.size);

      const lines = buf.toString('utf8').split('\n').filter((l) => l.trim());
      for (const line of lines) {
        await this.ingestLine(filePath, line);
      }
    } catch (e) {
      this.logger.warn(`Error processing ${filePath}: ${e.message}`);
    }
  }

  private async ingestLine(filePath: string, line: string) {
    let record: any;
    try {
      record = JSON.parse(line);
    } catch {
      return;
    }

    const sessionId = record.session_id;
    const usage = record.usage;
    if (!sessionId || !usage) return;

    // Correlate session to agent instance
    const instance = await this.instanceModel
      .findOne({ sessionId })
      .lean()
      .exec();

    if (!instance) {
      // Try to infer from file path: artifacts/{projectId}/workspaces/{instanceId}/state/costs.jsonl
      const parts = filePath.split(path.sep);
      const workspacesIdx = parts.indexOf('workspaces');
      if (workspacesIdx < 0) return;
      const instanceIdStr = parts[workspacesIdx + 1];
      const projectIdStr = parts[workspacesIdx - 1];
      if (!instanceIdStr || !projectIdStr) return;

      try {
        await this.usageEventModel.create({
          agentInstanceId: new Types.ObjectId(instanceIdStr),
          projectId: new Types.ObjectId(projectIdStr),
          tenantId: new Types.ObjectId(projectIdStr), // fallback - real tenantId needs instance lookup
          sessionId,
          model: usage.model ?? 'unknown',
          totalTokens: usage.total_tokens ?? 0,
          costUsd: usage.cost_usd ?? 0,
          timestamp: new Date(usage.timestamp ?? Date.now()),
        });
      } catch {
        // skip invalid ids
      }
      return;
    }

    await this.usageEventModel.create({
      agentInstanceId: instance._id,
      projectId: instance.projectId,
      tenantId: instance.tenantId,
      sessionId,
      model: usage.model ?? 'unknown',
      totalTokens: usage.total_tokens ?? 0,
      costUsd: usage.cost_usd ?? 0,
      timestamp: new Date(usage.timestamp ?? Date.now()),
    });
  }
}
