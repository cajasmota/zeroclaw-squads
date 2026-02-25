import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AesGateway } from '../websocket/aes.gateway';
import { Epic, EpicDocument } from './epic.schema';
import { Sprint, SprintDocument } from './sprint.schema';
import { Story, StoryDocument } from './story.schema';
import { Task, TaskDocument } from './task.schema';

@Injectable()
export class BacklogService {
  constructor(
    @InjectModel(Epic.name) private readonly epicModel: Model<EpicDocument>,
    @InjectModel(Story.name) private readonly storyModel: Model<StoryDocument>,
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    @InjectModel(Sprint.name)
    private readonly sprintModel: Model<SprintDocument>,
    private readonly eventEmitter: EventEmitter2,
    private readonly gateway: AesGateway,
  ) {}

  // ── Epics ──────────────────────────────────────────────────────────────────

  async findEpics(projectId: Types.ObjectId, tenantId: Types.ObjectId) {
    return this.epicModel
      .find({ projectId, tenantId })
      .sort({ order: 1 })
      .lean()
      .exec();
  }

  async createEpic(
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    dto: Partial<Epic>,
  ) {
    return (
      await this.epicModel.create({ projectId, tenantId, ...dto })
    ).toObject();
  }

  async updateEpic(
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    epicId: string,
    dto: Partial<Epic>,
  ) {
    const doc = await this.epicModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(epicId), projectId, tenantId },
        { $set: dto },
        { new: true },
      )
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Epic ${epicId} not found`);
    return doc;
  }

  async deleteEpic(
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    epicId: string,
  ) {
    const doc = await this.epicModel
      .findOneAndDelete({
        _id: new Types.ObjectId(epicId),
        projectId,
        tenantId,
      })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Epic ${epicId} not found`);
    return { message: 'Epic deleted' };
  }

  // ── Stories ────────────────────────────────────────────────────────────────

  async findStories(
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    filters: { epicId?: string; sprintId?: string; status?: string } = {},
  ) {
    const query: Record<string, any> = { projectId, tenantId };
    if (filters.epicId) query.epicId = new Types.ObjectId(filters.epicId);
    if (filters.sprintId) query.sprintId = new Types.ObjectId(filters.sprintId);
    if (filters.status) query.status = filters.status;
    return this.storyModel.find(query).sort({ order: 1 }).lean().exec();
  }

  async createStory(
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    dto: Partial<Story>,
  ) {
    return (
      await this.storyModel.create({ projectId, tenantId, ...dto })
    ).toObject();
  }

  async updateStory(
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    storyId: string,
    dto: Partial<Story>,
  ) {
    const doc = await this.storyModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(storyId), projectId, tenantId },
        { $set: dto },
        { new: true },
      )
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Story ${storyId} not found`);
    if (dto.assignedTo) {
      this.eventEmitter.emit('story.assigned', {
        storyId,
        projectId: projectId.toString(),
        tenantId: tenantId.toString(),
      });
    }
    return doc;
  }

  async updateStatus(
    storyId: string,
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    status: string,
    workflowNodeStatus?: string,
  ) {
    const update: Record<string, any> = { status };
    if (workflowNodeStatus !== undefined)
      update.workflowNodeStatus = workflowNodeStatus;

    const doc = await this.storyModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(storyId), projectId, tenantId },
        { $set: update },
        { new: true },
      )
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Story ${storyId} not found`);

    this.gateway.emitStoryStatus(
      projectId.toString(),
      storyId,
      status,
      workflowNodeStatus,
    );
    return doc;
  }

  async deleteStory(
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    storyId: string,
  ) {
    const doc = await this.storyModel
      .findOneAndDelete({
        _id: new Types.ObjectId(storyId),
        projectId,
        tenantId,
      })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Story ${storyId} not found`);
    return { message: 'Story deleted' };
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  async findTasks(
    storyId: string,
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
  ) {
    return this.taskModel
      .find({ storyId: new Types.ObjectId(storyId), projectId, tenantId })
      .sort({ order: 1 })
      .lean()
      .exec();
  }

  async createTask(
    storyId: string,
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    dto: Partial<Task>,
  ) {
    return (
      await this.taskModel.create({
        storyId: new Types.ObjectId(storyId),
        projectId,
        tenantId,
        ...dto,
      })
    ).toObject();
  }

  async updateTask(
    tenantId: Types.ObjectId,
    taskId: string,
    dto: Partial<Task>,
  ) {
    const doc = await this.taskModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(taskId), tenantId },
        { $set: dto },
        { new: true },
      )
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Task ${taskId} not found`);
    return doc;
  }

  async deleteTask(tenantId: Types.ObjectId, taskId: string) {
    const doc = await this.taskModel
      .findOneAndDelete({ _id: new Types.ObjectId(taskId), tenantId })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Task ${taskId} not found`);
    return { message: 'Task deleted' };
  }

  // ── Sprints ────────────────────────────────────────────────────────────────

  async findSprints(projectId: Types.ObjectId, tenantId: Types.ObjectId) {
    return this.sprintModel.find({ projectId, tenantId }).lean().exec();
  }

  async createSprint(
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    dto: Partial<Sprint>,
  ) {
    return (
      await this.sprintModel.create({ projectId, tenantId, ...dto })
    ).toObject();
  }

  async updateSprint(
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    sprintId: string,
    dto: Partial<Sprint>,
  ) {
    const doc = await this.sprintModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(sprintId), projectId, tenantId },
        { $set: dto },
        { new: true },
      )
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Sprint ${sprintId} not found`);
    return doc;
  }

  async markSprintReady(
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    sprintId: string,
  ) {
    const sprint = await this.updateSprint(projectId, tenantId, sprintId, {
      isReady: true,
    });
    this.eventEmitter.emit('sprint.ready', {
      sprintId,
      projectId: projectId.toString(),
      tenantId: tenantId.toString(),
    });
    return sprint;
  }
}
