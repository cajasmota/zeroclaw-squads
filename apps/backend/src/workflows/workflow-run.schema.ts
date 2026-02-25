import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type WorkflowRunDocument = WorkflowRun & Document;

export interface NodeExecution {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval';
  startedAt?: Date;
  completedAt?: Date;
  runId?: string;
  agentInstanceId?: string;
}

@Schema({ timestamps: true })
export class WorkflowRun {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  workflowTemplateId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  storyId: Types.ObjectId | null;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ enum: ['running', 'paused', 'completed', 'failed'], default: 'running' })
  status: string;

  @Prop({ default: '' })
  currentNodeId: string;

  @Prop({ type: Date, default: Date.now })
  startedAt: Date;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  nodeExecutions: NodeExecution[];
}

export const WorkflowRunSchema = SchemaFactory.createForClass(WorkflowRun);
