import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type StoryDocument = Story & Document;

@Schema({ timestamps: true })
export class Story {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  epicId: Types.ObjectId | null;

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  sprintId: Types.ObjectId | null;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ enum: ['feature', 'bugfix', 'refactor', 'task'], default: 'feature' })
  type: string;

  @Prop({ enum: ['high', 'medium', 'low'], default: 'medium' })
  priority: string;

  @Prop({ enum: ['backlog', 'selected', 'in_progress', 'review', 'done'], default: 'backlog' })
  status: string;

  @Prop({ default: '' })
  workflowNodeStatus: string;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'AgentInstance' }], default: [] })
  assignedTo: Types.ObjectId[];

  @Prop({ default: false })
  waitingForApproval: boolean;

  @Prop({ default: false })
  waitingForAnswer: boolean;

  @Prop({ default: '' })
  branchName: string;

  @Prop({ default: '' })
  runId: string;

  @Prop({ default: '' })
  storySlackThread: string;

  @Prop({ default: 0 })
  order: number;
}

export const StorySchema = SchemaFactory.createForClass(Story);
StorySchema.index({ projectId: 1, tenantId: 1, status: 1 });
StorySchema.index({ projectId: 1, epicId: 1 });
StorySchema.index({ projectId: 1, sprintId: 1 });
