import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
export class Task {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  storyId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  projectId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ enum: ['todo', 'in_progress', 'done'], default: 'todo' })
  status: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'AgentInstance', default: null })
  assignedTo: Types.ObjectId | null;

  @Prop({ default: 0 })
  order: number;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
