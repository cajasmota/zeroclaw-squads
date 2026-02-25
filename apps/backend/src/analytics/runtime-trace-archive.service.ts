import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Model, Types } from 'mongoose';
import {
  AgentInstance,
  AgentInstanceDocument,
} from '../agent-instances/agent-instance.schema';
import { Transcript, TranscriptDocument } from './transcript.schema';

@Injectable()
export class RuntimeTraceArchiveService {
  private readonly logger = new Logger(RuntimeTraceArchiveService.name);

  constructor(
    @InjectModel(Transcript.name)
    private readonly transcriptModel: Model<TranscriptDocument>,
    @InjectModel(AgentInstance.name)
    private readonly instanceModel: Model<AgentInstanceDocument>,
  ) {}

  @OnEvent('workflow.node.completed')
  async handleNodeCompleted(payload: {
    storyId: string;
    nodeId: string;
    agentInstanceId?: string;
    runId?: string;
  }) {
    if (!payload.agentInstanceId) return;
    await this.archiveTrace(
      payload.agentInstanceId,
      payload.runId ?? payload.nodeId,
    );
  }

  async archiveTrace(agentInstanceId: string, runId: string): Promise<void> {
    const instance = await this.instanceModel
      .findById(agentInstanceId)
      .lean()
      .exec();
    if (!instance?.workspacePath) return;

    const tracePath = path.join(
      instance.workspacePath,
      'state',
      'runtime-trace.jsonl',
    );
    if (!fs.existsSync(tracePath)) return;

    const raw = fs.readFileSync(tracePath, 'utf8');
    const entries = raw
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (entries.length === 0) return;

    await this.transcriptModel.create({
      agentInstanceId: new Types.ObjectId(agentInstanceId),
      projectId: instance.projectId,
      tenantId: instance.tenantId,
      runId,
      entries,
      archivedAt: new Date(),
    });

    // Truncate the file after successful archiving
    fs.writeFileSync(tracePath, '');
    this.logger.log(
      `Archived ${entries.length} trace entries for instance ${agentInstanceId}`,
    );
  }
}
