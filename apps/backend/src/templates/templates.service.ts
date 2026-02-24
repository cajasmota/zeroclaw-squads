import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AgentTemplate, AgentTemplateDocument } from './agent-template.schema';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectModel(AgentTemplate.name)
    private readonly templateModel: Model<AgentTemplateDocument>,
  ) {}

  async findAll(
    tenantId: Types.ObjectId,
    filters: { role?: string; tags?: string; page?: number; limit?: number } = {},
  ) {
    const query: Record<string, any> = { tenantId };
    if (filters.role) query.role = filters.role;
    if (filters.tags) query.tags = { $in: filters.tags.split(',') };

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.templateModel.find(query).skip(skip).limit(limit).lean().exec(),
      this.templateModel.countDocuments(query).exec(),
    ]);

    return { items, total, page, limit };
  }

  async findById(tenantId: Types.ObjectId, id: string) {
    const doc = await this.templateModel
      .findOne({ tenantId, _id: new Types.ObjectId(id) })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Template ${id} not found`);
    return doc;
  }

  async create(tenantId: Types.ObjectId, dto: CreateTemplateDto) {
    const doc = await this.templateModel.create({ tenantId, ...dto });
    return doc.toObject();
  }

  async update(tenantId: Types.ObjectId, id: string, dto: UpdateTemplateDto) {
    const doc = await this.templateModel
      .findOneAndUpdate(
        { tenantId, _id: new Types.ObjectId(id) },
        { $set: dto },
        { new: true },
      )
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Template ${id} not found`);
    return doc;
  }

  async delete(tenantId: Types.ObjectId, id: string) {
    const doc = await this.templateModel
      .findOneAndDelete({ tenantId, _id: new Types.ObjectId(id) })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Template ${id} not found`);
    return { message: 'Template deleted' };
  }

  async exportJson(tenantId: Types.ObjectId, id: string) {
    const template = await this.findById(tenantId, id);
    return {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      template: {
        displayName: template.displayName,
        role: template.role,
        tags: template.tags,
        soul: template.soul,
        aieos_identity: template.aieos_identity,
        config: template.config,
        avatarUrl: template.avatarUrl,
      },
    };
  }

  async importJson(tenantId: Types.ObjectId, payload: any) {
    const { template } = payload;
    if (!template?.displayName || !template?.role) {
      throw new Error('Invalid import payload: missing displayName or role');
    }
    return this.create(tenantId, template as CreateTemplateDto);
  }
}
