import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BacklogService } from '../backlog/backlog.service';
import { AesGateway } from '../websocket/aes.gateway';
import { WorkflowNode } from './workflow-template.schema';

interface WorkflowNodeEvent {
  storyId?: string;
  projectId: string;
  tenantId: string;
  nodeId: string;
  nodeDescription?: string;
  node?: WorkflowNode;
  error?: string;
}

@Injectable()
export class WorkflowStoryBridgeService {
  private readonly logger = new Logger(WorkflowStoryBridgeService.name);

  constructor(
    private readonly backlogService: BacklogService,
    private readonly gateway: AesGateway,
  ) {}

  @OnEvent('workflow.node.started')
  async handleNodeStarted(payload: WorkflowNodeEvent): Promise<void> {
    if (!payload.storyId) return;
    try {
      const projectId = new Types.ObjectId(payload.projectId);
      const tenantId = new Types.ObjectId(payload.tenantId);
      const description =
        payload.node?.description ?? payload.nodeDescription ?? payload.nodeId;

      await this.backlogService.updateStory(
        projectId,
        tenantId,
        payload.storyId,
        {
          workflowNodeStatus: description,
        },
      );

      // Auto-move Kanban if configured
      if (
        payload.node?.kanbanStatus &&
        payload.node.kanbanStatusTrigger === 'on_start'
      ) {
        await this.backlogService.updateStatus(
          payload.storyId,
          projectId,
          tenantId,
          payload.node.kanbanStatus,
        );
      }

      this.gateway.emitStoryStatus(
        payload.projectId,
        payload.storyId,
        'workflow_update',
        description,
      );
    } catch (e) {
      this.logger.error(`Failed to handle workflow.node.started: ${e.message}`);
    }
  }

  @OnEvent('workflow.node.completed')
  async handleNodeCompleted(payload: WorkflowNodeEvent): Promise<void> {
    if (!payload.storyId) return;
    try {
      const projectId = new Types.ObjectId(payload.projectId);
      const tenantId = new Types.ObjectId(payload.tenantId);
      const description =
        payload.node?.description ?? payload.nodeDescription ?? payload.nodeId;

      await this.backlogService.updateStory(
        projectId,
        tenantId,
        payload.storyId,
        {
          workflowNodeStatus: `Completed: ${description}`,
        },
      );

      if (
        payload.node?.kanbanStatus &&
        payload.node.kanbanStatusTrigger === 'on_complete'
      ) {
        await this.backlogService.updateStatus(
          payload.storyId,
          projectId,
          tenantId,
          payload.node.kanbanStatus,
        );
      }
    } catch (e) {
      this.logger.error(
        `Failed to handle workflow.node.completed: ${e.message}`,
      );
    }
  }

  @OnEvent('workflow.node.failed')
  async handleNodeFailed(payload: WorkflowNodeEvent): Promise<void> {
    if (!payload.storyId) return;
    try {
      const projectId = new Types.ObjectId(payload.projectId);
      const tenantId = new Types.ObjectId(payload.tenantId);

      await this.backlogService.updateStory(
        projectId,
        tenantId,
        payload.storyId,
        {
          workflowNodeStatus: `Error: ${payload.error ?? 'Unknown error'}`,
        },
      );
      await this.backlogService.updateStatus(
        payload.storyId,
        projectId,
        tenantId,
        'backlog',
      );
    } catch (e) {
      this.logger.error(`Failed to handle workflow.node.failed: ${e.message}`);
    }
  }

  @OnEvent('workflow.node.approval_needed')
  async handleApprovalNeeded(payload: WorkflowNodeEvent): Promise<void> {
    if (!payload.storyId) return;
    try {
      const projectId = new Types.ObjectId(payload.projectId);
      const tenantId = new Types.ObjectId(payload.tenantId);

      await this.backlogService.updateStory(
        projectId,
        tenantId,
        payload.storyId,
        {
          workflowNodeStatus: 'Waiting for Approval',
          waitingForApproval: true,
        } as any,
      );
    } catch (e) {
      this.logger.error(
        `Failed to handle workflow.node.approval_needed: ${e.message}`,
      );
    }
  }
}
