import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type TicketCommentDocument = TicketComment & Document;

@Schema({ timestamps: true })
export class TicketComment {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  storyId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ enum: ['human', 'agent'], required: true })
  author: string;

  @Prop({ required: true })
  authorId: string;

  @Prop({ required: true })
  authorDisplayName: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: '' })
  slackThreadTs: string;

  @Prop({ enum: ['message', 'approval', 'answer'], default: 'message' })
  type: string;
}

export const TicketCommentSchema = SchemaFactory.createForClass(TicketComment);
