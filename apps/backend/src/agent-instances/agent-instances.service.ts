import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

/** Roles that may only have one instance per project */
const SINGLETON_ROLES = ['librarian', 'architect', 'pm', 'product manager'];
import { AgentTemplate, AgentTemplateDocument } from '../templates/agent-template.schema';
import { AgentInstance, AgentInstanceDocument } from './agent-instance.schema';

function buildWorkspacePath(artifactsRoot: string, projectId: string, instanceId: string): string {
  return `${artifactsRoot}/${projectId}/workspaces/${instanceId}/`;
}

@Injectable()
export class AgentInstancesService {
  constructor(
    @InjectModel(AgentInstance.name)
    private readonly instanceModel: Model<AgentInstanceDocument>,
    @InjectModel(AgentTemplate.name)
    private readonly templateModel: Model<AgentTemplateDocument>,
  ) {}

  async createSnapshot(
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    templateId: Types.ObjectId,
    displayNameOverride?: string,
    artifactsRoot = '/artifacts',
  ) {
    const template = await this.templateModel
      .findOne({ tenantId, _id: templateId })
      .lean()
      .exec();
    if (!template) throw new NotFoundException(`Template ${templateId} not found`);

    const baseIdentifier = template.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 20);

    let identifier = baseIdentifier;
    let counter = 1;
    while (await this.instanceModel.findOne({ projectId, identifier }).lean().exec()) {
      identifier = `${baseIdentifier}-${counter++}`;
    }

    // Enforce singleton role constraint
    const role: string = (template.aieos_identity as any)?.identity?.role ?? '';
    const isSingleton = SINGLETON_ROLES.some((r) => role.toLowerCase().includes(r));
    if (isSingleton) {
      const existing = await this.instanceModel
        .findOne({
          projectId,
          'aieos_identity.identity.role': new RegExp(role, 'i'),
        })
        .lean()
        .exec();
      if (existing) {
        throw new BadRequestException(
          `A ${role} agent already exists for this project. Only one ${role} is allowed per project.`,
        );
      }
    }

    const instance = await this.instanceModel.create({
      projectId,
      tenantId,
      templateId,
      displayName: displayNameOverride ?? template.displayName,
      identifier,
      tags: template.tags,
      soul: template.soul,
      aieos_identity: template.aieos_identity,
      config: template.config,
      status: 'idle',
      pid: null,
    });

    const instanceId = (instance._id as Types.ObjectId).toString();
    const workspacePath = buildWorkspacePath(artifactsRoot, projectId.toString(), instanceId);
    await this.instanceModel.findByIdAndUpdate(instance._id, { workspacePath });

    return { ...instance.toObject(), workspacePath };
  }

  async findByProject(projectId: Types.ObjectId, tenantId: Types.ObjectId) {
    return this.instanceModel.find({ projectId, tenantId }).lean().exec();
  }

  async findById(id: string, tenantId: Types.ObjectId) {
    const instance = await this.instanceModel
      .findOne({ _id: new Types.ObjectId(id), tenantId })
      .lean()
      .exec();
    if (!instance) throw new NotFoundException(`AgentInstance ${id} not found`);
    return instance;
  }

  async updateStatus(id: string, status: 'idle' | 'busy' | 'error') {
    return this.instanceModel
      .findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .lean()
      .exec();
  }

  async updatePid(id: string, pid: number | null) {
    return this.instanceModel
      .findByIdAndUpdate(id, { $set: { pid } }, { new: true })
      .lean()
      .exec();
  }

  async updateGatewayPort(id: string, gatewayPort: number) {
    return this.instanceModel
      .findByIdAndUpdate(id, { $set: { gatewayPort } }, { new: true })
      .lean()
      .exec();
  }

  async updateSoulOrIdentity(
    id: string,
    tenantId: Types.ObjectId,
    updates: { soul?: string; aieos_identity?: Record<string, any>; displayName?: string },
  ) {
    const instance = await this.instanceModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId },
        { $set: updates },
        { new: true },
      )
      .lean()
      .exec();
    if (!instance) throw new NotFoundException(`AgentInstance ${id} not found`);
    return instance;
  }

  async syncFromTemplate(
    tenantId: Types.ObjectId,
    projectId: Types.ObjectId,
    agentInstanceId: string,
    fields: { soul?: boolean; aieos?: boolean; config?: boolean },
  ) {
    const instance = await this.instanceModel
      .findOne({ _id: new Types.ObjectId(agentInstanceId), projectId, tenantId })
      .lean()
      .exec();
    if (!instance) throw new NotFoundException(`AgentInstance ${agentInstanceId} not found`);

    if (!instance.templateId) throw new NotFoundException(`AgentInstance has no linked template`);

    const template = await this.templateModel
      .findOne({ _id: instance.templateId, tenantId })
      .lean()
      .exec();
    if (!template) throw new NotFoundException(`Source template not found`);

    const updates: Record<string, any> = {};
    if (fields.soul) updates.soul = template.soul;
    if (fields.aieos) updates.aieos_identity = template.aieos_identity;
    if (fields.config) updates.config = template.config;

    if (Object.keys(updates).length === 0) return instance;

    const updated = await this.instanceModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(agentInstanceId), tenantId },
        { $set: updates },
        { new: true },
      )
      .lean()
      .exec();
    return updated;
  }
}
