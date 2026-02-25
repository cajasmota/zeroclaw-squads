import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type TranscriptDocument = Transcript & Document;

@Schema({ timestamps: true, collection: 'transcripts' })
export class Transcript {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  agentInstanceId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  runId: string;

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  entries: Record<string, any>[];

  @Prop({ required: true })
  archivedAt: Date;
}

export const TranscriptSchema = SchemaFactory.createForClass(Transcript);
