import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RequirementsDocument, RequirementsDocumentDoc } from './requirements-document.schema';

@Injectable()
export class RequirementsService {
  constructor(
    @InjectModel(RequirementsDocument.name)
    private readonly docModel: Model<RequirementsDocumentDoc>,
  ) {}

  async findAll(projectId: Types.ObjectId, tenantId: Types.ObjectId): Promise<RequirementsDocumentDoc[]> {
    return this.docModel
      .find({ projectId, tenantId })
      .sort({ order: 1, createdAt: 1 })
      .exec();
  }

  async create(
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    dto: { title: string; content?: unknown; parentId?: string; order?: number },
  ): Promise<RequirementsDocumentDoc> {
    const doc = new this.docModel({
      projectId,
      tenantId,
      title: dto.title,
      content: dto.content ?? '',
      parentId: dto.parentId ? new Types.ObjectId(dto.parentId) : null,
      order: dto.order ?? 0,
    });
    return doc.save();
  }

  async update(
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    docId: string,
    dto: { title?: string; content?: unknown; parentId?: string; order?: number },
  ): Promise<RequirementsDocumentDoc> {
    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.parentId !== undefined) updateData.parentId = dto.parentId ? new Types.ObjectId(dto.parentId) : null;
    if (dto.order !== undefined) updateData.order = dto.order;

    const updated = await this.docModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(docId), projectId, tenantId },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!updated) throw new NotFoundException('Requirements document not found');
    return updated;
  }

  async delete(
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
    docId: string,
  ): Promise<void> {
    const result = await this.docModel
      .deleteOne({ _id: new Types.ObjectId(docId), projectId, tenantId })
      .exec();
    if (result.deletedCount === 0) throw new NotFoundException('Requirements document not found');
  }
}
