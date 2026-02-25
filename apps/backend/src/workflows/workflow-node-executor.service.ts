import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AgentInstance,
  AgentInstanceDocument,
} from '../agent-instances/agent-instance.schema';
import { BacklogService } from '../backlog/backlog.service';
import { ZeroClawProcessManagerService } from '../zeroclaw/zeroclaw-process-manager.service';
import { WorkflowRun, WorkflowRunDocument } from './workflow-run.schema';
import { WorkflowNode } from './workflow-template.schema';

@Injectable()
export class WorkflowNodeExecutorService {
  private readonly logger = new Logger(WorkflowNodeExecutorService.name);

  constructor(
    @InjectModel(AgentInstance.name)
    private readonly instanceModel: Model<AgentInstanceDocument>,
    @InjectModel(WorkflowRun.name)
    private readonly runModel: Model<WorkflowRunDocument>,
    private readonly processManager: ZeroClawProcessManagerService,
    private readonly backlogService: BacklogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async executeNode(
    run: WorkflowRunDocument,
    node: WorkflowNode,
  ): Promise<void> {
    const runId = run._id.toString();
    const projectId = run.projectId;
    const tenantId = run.tenantId;

    // Find available agent matching the node's agentRole
    const agent = node.agentRole
      ? await this.instanceModel
          .findOneAndUpdate(
            {
              projectId,
              tenantId,
              status: 'idle',
              'aieos_identity.identity.role': {
                $regex: new RegExp(node.agentRole, 'i'),
              },
            },
            { $set: { status: 'busy' } },
            { new: true },
          )
          .exec()
      : null;

    // Create a Kanban story/ticket for this node execution if storyId is set
    if (run.storyId) {
      try {
        await this.backlogService.createTask(
          run.storyId.toString(),
          projectId,
          tenantId,
          { title: `Workflow node: ${node.description ?? node.id}` } as any,
        );
      } catch (e) {
        this.logger.warn(`Could not create task for workflow node: ${e.message}`);
      }
    }

    if (node.requiresHumanApproval) {
      // Pause the run and emit approval needed
      run.status = 'paused';
      const exec = run.nodeExecutions.find((e) => e.nodeId === node.id);
      if (exec) exec.status = 'waiting_approval';
      await run.save();

      this.eventEmitter.emit('workflow.node.approval_needed', {
        runId,
        nodeId: node.id,
        projectId: projectId.toString(),
        tenantId: tenantId.toString(),
        storyId: run.storyId?.toString() ?? null,
        node,
      });
      return;
    }

    if (!agent) {
      this.logger.warn(
        `No idle agent found for role "${node.agentRole}" in project ${projectId}`,
      );
      // Still mark as running so workflow can be manually advanced
      return;
    }

    // Inject node context into the agent via stdin
    const contextLines = [
      `WORKFLOW_NODE: ${node.description ?? node.id}`,
      `RUN_ID: ${runId}`,
      `NODE_ID: ${node.id}`,
      run.storyId ? `STORY_ID: ${run.storyId}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (agent.pid) {
      this.processManager.poke(agent.pid);
    }
    this.processManager.injectStdin(agent._id.toString(), contextLines);

    // Update node execution record
    const exec = run.nodeExecutions.find((e) => e.nodeId === node.id);
    if (exec) {
      exec.status = 'running';
      exec.agentInstanceId = (agent._id as Types.ObjectId).toString();
    }
    await run.save();

    this.logger.log(
      `Signaled agent ${agent.displayName} for node ${node.id} in run ${runId}`,
    );
  }

  @OnEvent('workflow.node.completed')
  async handleNodeCompleted(payload: {
    runId: string;
    nodeId: string;
    projectId: string;
    tenantId: string;
    storyId?: string | null;
  }): Promise<void> {
    if (!payload.runId) return;
    try {
      const run = await this.runModel.findById(payload.runId).exec();
      if (!run) return;

      const exec = run.nodeExecutions.find((e) => e.nodeId === payload.nodeId);
      if (exec) {
        exec.status = 'completed';
        exec.completedAt = new Date();
      }

      // Release the agent back to idle
      const runningExec = run.nodeExecutions.find(
        (e) => e.nodeId === payload.nodeId,
      );
      if (runningExec?.agentInstanceId) {
        await this.instanceModel
          .findByIdAndUpdate(runningExec.agentInstanceId, {
            $set: { status: 'idle' },
          })
          .exec();
      }

      await run.save();

      // Advance the workflow to the next node
      this.eventEmitter.emit('workflow.advance', { runId: payload.runId });
    } catch (e) {
      this.logger.error(`Failed to handle workflow.node.completed: ${e.message}`);
    }
  }

  @OnEvent('workflow.node.failed')
  async handleNodeFailed(payload: {
    runId: string;
    nodeId: string;
    error: string;
    projectId: string;
    tenantId: string;
    storyId?: string | null;
  }): Promise<void> {
    if (!payload.runId) return;
    try {
      const run = await this.runModel.findById(payload.runId).exec();
      if (!run) return;

      const exec = run.nodeExecutions.find((e) => e.nodeId === payload.nodeId);
      if (exec) {
        exec.status = 'failed';
        exec.completedAt = new Date();
      }
      run.status = 'failed';
      run.completedAt = new Date();
      await run.save();
    } catch (e) {
      this.logger.error(`Failed to handle workflow.node.failed: ${e.message}`);
    }
  }
}
