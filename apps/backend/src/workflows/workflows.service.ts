import {
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AesGateway } from '../websocket/aes.gateway';
import {
  WorkflowTemplate,
  WorkflowTemplateDocument,
  GLOBAL_WORKFLOW_TEMPLATES,
} from './workflow-template.schema';
import { WorkflowRun, WorkflowRunDocument } from './workflow-run.schema';

@Injectable()
export class WorkflowsService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(WorkflowTemplate.name)
    private readonly templateModel: Model<WorkflowTemplateDocument>,
    @InjectModel(WorkflowRun.name)
    private readonly runModel: Model<WorkflowRunDocument>,
    private readonly eventEmitter: EventEmitter2,
    private readonly gateway: AesGateway,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const tpl of GLOBAL_WORKFLOW_TEMPLATES) {
      const existing = await this.templateModel
        .findOne({ name: tpl.name, isGlobal: true })
        .lean()
        .exec();
      if (!existing) {
        await this.templateModel.create(tpl);
      }
    }
  }

  async findAllTemplates(tenantId: Types.ObjectId) {
    return this.templateModel
      .find({ $or: [{ isGlobal: true }, { tenantId }] })
      .lean()
      .exec();
  }

  async createTemplate(
    tenantId: Types.ObjectId,
    dto: Partial<WorkflowTemplate>,
  ) {
    const doc = await this.templateModel.create({ tenantId, ...dto });
    return typeof doc.toObject === 'function' ? doc.toObject() : doc;
  }

  async triggerWorkflow(
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    templateId: string,
    storyId?: string,
  ): Promise<WorkflowRunDocument> {
    const template = await this.templateModel
      .findById(templateId)
      .lean()
      .exec();
    if (!template)
      throw new NotFoundException(`WorkflowTemplate ${templateId} not found`);

    const firstNode = template.nodes[0];
    if (!firstNode) throw new Error('Workflow template has no nodes');

    const run = await this.runModel.create({
      workflowTemplateId: new Types.ObjectId(templateId),
      projectId,
      tenantId,
      storyId: storyId ? new Types.ObjectId(storyId) : null,
      status: 'running',
      currentNodeId: firstNode.id,
      nodeExecutions: [
        { nodeId: firstNode.id, status: 'running', startedAt: new Date() },
      ],
    });

    this.eventEmitter.emit('workflow.node.started', {
      runId: run._id.toString(),
      nodeId: firstNode.id,
      projectId: projectId.toString(),
      tenantId: tenantId.toString(),
      storyId: storyId || null,
      node: firstNode,
    });

    return run;
  }

  async advanceWorkflow(runId: string): Promise<WorkflowRunDocument | null> {
    const run = await this.runModel.findById(runId).exec();
    if (!run || run.status !== 'running') return run;

    const template = await this.templateModel
      .findById(run.workflowTemplateId)
      .lean()
      .exec();
    if (!template) return run;

    const currentNode = template.nodes.find((n) => n.id === run.currentNodeId);
    if (!currentNode?.nextNodeId) {
      // Workflow complete
      run.status = 'completed';
      run.completedAt = new Date();
      await run.save();
      this.gateway.emitWorkflowNode(
        run.projectId.toString(),
        runId,
        run.currentNodeId,
        'completed',
      );
      return run;
    }

    const nextNode = template.nodes.find(
      (n) => n.id === currentNode.nextNodeId,
    );
    if (!nextNode) return run;

    run.currentNodeId = nextNode.id;

    if (nextNode.requiresHumanApproval) {
      run.status = 'paused';
      run.nodeExecutions.push({
        nodeId: nextNode.id,
        status: 'waiting_approval',
        startedAt: new Date(),
      });
      await run.save();
      this.gateway.emitApprovalNeeded(
        run.projectId.toString(),
        runId,
        nextNode.id,
        nextNode.description,
      );
    } else {
      run.nodeExecutions.push({
        nodeId: nextNode.id,
        status: 'running',
        startedAt: new Date(),
      });
      await run.save();
      this.eventEmitter.emit('workflow.node.started', {
        runId,
        nodeId: nextNode.id,
        projectId: run.projectId.toString(),
        tenantId: run.tenantId.toString(),
        storyId: run.storyId?.toString() || null,
        node: nextNode,
      });
      this.gateway.emitWorkflowNode(
        run.projectId.toString(),
        runId,
        nextNode.id,
        'running',
      );
    }

    return run;
  }

  async approveNode(
    runId: string,
    nodeId: string,
  ): Promise<WorkflowRunDocument> {
    const run = await this.runModel.findById(runId).exec();
    if (!run) throw new NotFoundException(`WorkflowRun ${runId} not found`);

    const exec = run.nodeExecutions.find((e) => e.nodeId === nodeId);
    if (exec) exec.status = 'completed';

    run.status = 'running';
    await run.save();

    return this.advanceWorkflow(runId) as any;
  }

  async getRunHistory(projectId: Types.ObjectId, tenantId: Types.ObjectId) {
    return this.runModel
      .find({ projectId, tenantId })
      .sort({ startedAt: -1 })
      .lean()
      .exec();
  }

  async getRunById(runId: string, tenantId: Types.ObjectId) {
    const run = await this.runModel
      .findOne({ _id: new Types.ObjectId(runId), tenantId })
      .lean()
      .exec();
    if (!run) throw new NotFoundException(`WorkflowRun ${runId} not found`);
    return run;
  }
}
