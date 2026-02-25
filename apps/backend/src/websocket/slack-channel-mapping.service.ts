import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SlackChannelMapping,
  SlackChannelMappingDocument,
} from './slack-channel-mapping.schema';

@Injectable()
export class SlackChannelMappingService {
  constructor(
    @InjectModel(SlackChannelMapping.name)
    private readonly mappingModel: Model<SlackChannelMappingDocument>,
  ) {}

  async getProjectByChannel(
    channelId: string,
  ): Promise<{ projectId: Types.ObjectId; tenantId: Types.ObjectId } | null> {
    const mapping = await this.mappingModel
      .findOne({ channelId })
      .lean()
      .exec();
    if (!mapping) return null;
    return { projectId: mapping.projectId, tenantId: mapping.tenantId };
  }

  async upsertMapping(
    channelId: string,
    projectId: Types.ObjectId,
    tenantId: Types.ObjectId,
  ): Promise<void> {
    await this.mappingModel
      .findOneAndUpdate(
        { channelId },
        { channelId, projectId, tenantId },
        { upsert: true, new: true },
      )
      .exec();
  }
}
