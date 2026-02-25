import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type SlackChannelMappingDocument = SlackChannelMapping & Document;

@Schema({ timestamps: true })
export class SlackChannelMapping {
  @Prop({ required: true, unique: true })
  channelId: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  projectId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenantId: Types.ObjectId;
}

export const SlackChannelMappingSchema = SchemaFactory.createForClass(SlackChannelMapping);
