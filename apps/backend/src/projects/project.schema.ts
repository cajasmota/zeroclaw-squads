import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ default: '#004176' })
  brandColor: string;

  @Prop({ enum: ['active', 'archived'], default: 'active' })
  status: string;

  @Prop({
    type: {
      librarian: {
        type: SchemaTypes.ObjectId,
        ref: 'AgentInstance',
        default: null,
      },
      architect: {
        type: SchemaTypes.ObjectId,
        ref: 'AgentInstance',
        default: null,
      },
      pm: { type: SchemaTypes.ObjectId, ref: 'AgentInstance', default: null },
      developer: {
        type: [SchemaTypes.ObjectId],
        ref: 'AgentInstance',
        default: [],
      },
      reviewer: {
        type: [SchemaTypes.ObjectId],
        ref: 'AgentInstance',
        default: [],
      },
      optional: {
        type: [SchemaTypes.ObjectId],
        ref: 'AgentInstance',
        default: [],
      },
    },
    _id: false,
  })
  roles: {
    librarian: Types.ObjectId | null;
    architect: Types.ObjectId | null;
    pm: Types.ObjectId | null;
    developer: Types.ObjectId[];
    reviewer: Types.ObjectId[];
    optional: Types.ObjectId[];
  };

  @Prop({
    type: {
      slackToken: { type: String, default: '' },
      slackChannelId: { type: String, default: '' },
      repoUrl: { type: String, default: '' },
      githubApp: {
        appId: { type: String, default: '' },
        privateKey: { type: String, default: '' },
        installationId: { type: String, default: '' },
        webhookSecret: { type: String, default: '' },
        _id: false,
      },
      inviteUsers: { type: [String], default: [] },
      llmKeys: {
        openai: { type: String, default: '' },
        anthropic: { type: String, default: '' },
        google: { type: String, default: '' },
        ollama_endpoint: { type: String, default: '' },
        _id: false,
      },
    },
    _id: false,
  })
  config: {
    slackToken: string;
    slackChannelId: string;
    repoUrl: string;
    githubApp: {
      appId: string;
      privateKey: string;
      installationId: string;
      webhookSecret: string;
    };
    inviteUsers: string[];
    llmKeys: {
      openai: string;
      anthropic: string;
      google: string;
      ollama_endpoint: string;
    };
  };
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
ProjectSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
