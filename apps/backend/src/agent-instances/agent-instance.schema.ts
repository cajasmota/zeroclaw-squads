import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type AgentInstanceDocument = AgentInstance & Document;

@Schema({ timestamps: true })
export class AgentInstance {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'AgentTemplate', required: true })
  templateId: Types.ObjectId;

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: true })
  identifier: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Number, default: null })
  pid: number | null;

  @Prop({ default: '' })
  soul: string;

  @Prop({ type: SchemaTypes.Mixed })
  aieos_identity: Record<string, any>;

  @Prop({
    type: {
      model: { type: String, default: 'qwen2.5-coder:1.5b' },
      provider: { type: String, default: 'ollama' },
      skills: { type: String, default: '' },
      canWriteCode: { type: Boolean, default: false },
      mcpServers: { type: [SchemaTypes.Mixed], default: [] },
    },
    _id: false,
  })
  config: {
    model: string;
    provider: string;
    skills: string;
    canWriteCode: boolean;
    mcpServers: any[];
  };

  @Prop({ enum: ['idle', 'busy', 'error'], default: 'idle' })
  status: string;

  @Prop({ default: '' })
  workspacePath: string;

  @Prop({ type: Number, default: null })
  gatewayPort: number | null;
}

export const AgentInstanceSchema = SchemaFactory.createForClass(AgentInstance);
AgentInstanceSchema.index({ projectId: 1, identifier: 1 }, { unique: true });
AgentInstanceSchema.index({ tenantId: 1, projectId: 1 });
