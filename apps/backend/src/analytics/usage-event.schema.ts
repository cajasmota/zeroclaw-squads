import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type UsageEventDocument = UsageEvent & Document;

@Schema({ timestamps: true, collection: 'usage_events' })
export class UsageEvent {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  agentInstanceId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  sessionId: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  totalTokens: number;

  @Prop({ required: true })
  costUsd: number;

  @Prop({ required: true })
  timestamp: Date;
}

export const UsageEventSchema = SchemaFactory.createForClass(UsageEvent);
