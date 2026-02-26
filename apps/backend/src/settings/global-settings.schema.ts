import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type GlobalSettingsDocument = GlobalSettings & Document;

@Schema({ timestamps: true })
export class GlobalSettings {
  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
    unique: true,
    index: true,
  })
  tenantId: Types.ObjectId;

  @Prop({ default: 'AES' })
  appName: string;

  @Prop({ default: 'qwen2.5-coder:1.5b' })
  defaultOllamaModel: string;

  @Prop({ default: 'http://localhost:11434' })
  ollamaEndpoint: string;

  @Prop({ type: [String], default: [] })
  globalInviteUsers: string[];

  @Prop({ default: '' })
  slackToken: string;

  @Prop({ default: '' })
  slackSigningSecret: string;

  @Prop({
    type: {
      appId: { type: String, default: '' },
      privateKey: { type: String, default: '' },
      installationId: { type: String, default: '' },
      webhookSecret: { type: String, default: '' },
      repoOwner: { type: String, default: '' },
      repoName: { type: String, default: '' },
    },
    _id: false,
    default: () => ({ appId: '', privateKey: '', installationId: '', webhookSecret: '', repoOwner: '', repoName: '' }),
  })
  githubApp: {
    appId: string;
    privateKey: string;
    installationId: string;
    webhookSecret: string;
    repoOwner: string;
    repoName: string;
  };

  @Prop({
    type: {
      openai: { type: Boolean, default: true },
      anthropic: { type: Boolean, default: false },
      google: { type: Boolean, default: false },
      ollama: { type: Boolean, default: true },
    },
    _id: false,
    default: () => ({
      openai: true,
      anthropic: false,
      google: false,
      ollama: true,
    }),
  })
  providers: {
    openai: boolean;
    anthropic: boolean;
    google: boolean;
    ollama: boolean;
  };

  @Prop({
    type: {
      openai: { type: String, default: '' },
      anthropic: { type: String, default: '' },
      google: { type: String, default: '' },
    },
    _id: false,
    default: () => ({ openai: '', anthropic: '', google: '' }),
  })
  llmKeys: {
    openai: string;
    anthropic: string;
    google: string;
  };
}

export const GlobalSettingsSchema =
  SchemaFactory.createForClass(GlobalSettings);
