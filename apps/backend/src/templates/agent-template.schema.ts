import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type AgentTemplateDocument = AgentTemplate & Document;

export type AgentRole =
  | 'librarian'
  | 'architect'
  | 'pm'
  | 'developer'
  | 'reviewer'
  | 'tester';
export type LlmProvider = 'ollama' | 'openai' | 'anthropic' | 'google';

@Schema({ timestamps: true })
export class AgentTemplate {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  displayName: string;

  @Prop({
    required: true,
    enum: ['librarian', 'architect', 'pm', 'developer', 'reviewer', 'tester'],
  })
  role: AgentRole;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: '' })
  soul: string;

  @Prop({ type: SchemaTypes.Mixed })
  aieos_identity: Record<string, any>;

  @Prop({
    type: {
      model: { type: String, default: 'qwen2.5-coder:1.5b' },
      provider: {
        type: String,
        enum: ['ollama', 'openai', 'anthropic', 'google'],
        default: 'ollama',
      },
      skills: { type: String, default: '' },
      canWriteCode: { type: Boolean, default: false },
      mcpServers: { type: [SchemaTypes.Mixed], default: [] },
    },
    _id: false,
  })
  config: {
    model: string;
    provider: LlmProvider;
    skills: string;
    canWriteCode: boolean;
    mcpServers: any[];
  };

  @Prop({ default: '' })
  avatarUrl: string;
}

export const AgentTemplateSchema = SchemaFactory.createForClass(AgentTemplate);
AgentTemplateSchema.index({ tenantId: 1, role: 1 });
AgentTemplateSchema.index({ tenantId: 1, tags: 1 });
