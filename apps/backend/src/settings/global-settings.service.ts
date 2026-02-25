import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Aes256EncryptionService } from '../common/services/aes256-encryption.service';
import { GlobalSettings, GlobalSettingsDocument } from './global-settings.schema';

export interface ResolvedLlmKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  ollamaEndpoint: string;
}

const SENSITIVE_MASK = '[encrypted]';

@Injectable()
export class GlobalSettingsService {
  constructor(
    @InjectModel(GlobalSettings.name)
    private readonly settingsModel: Model<GlobalSettingsDocument>,
    private readonly encryption: Aes256EncryptionService,
  ) {}

  async get(tenantId: Types.ObjectId): Promise<GlobalSettingsDocument> {
    let settings = await this.settingsModel.findOne({ tenantId }).exec();
    if (!settings) {
      settings = await this.settingsModel.create({ tenantId });
    }
    return settings;
  }

  async getForDisplay(tenantId: Types.ObjectId) {
    const settings = await this.get(tenantId);
    const obj = settings.toObject() as any;
    if (obj.llmKeys) {
      for (const key of ['openai', 'anthropic', 'google']) {
        if (obj.llmKeys[key]) obj.llmKeys[key] = SENSITIVE_MASK;
      }
    }
    return obj;
  }

  async update(tenantId: Types.ObjectId, dto: Partial<GlobalSettings>): Promise<GlobalSettingsDocument> {
    // Encrypt LLM keys before saving
    if (dto.llmKeys) {
      for (const key of ['openai', 'anthropic', 'google'] as const) {
        if (dto.llmKeys[key] && dto.llmKeys[key] !== SENSITIVE_MASK) {
          dto.llmKeys[key] = this.encryption.encrypt(dto.llmKeys[key]);
        }
      }
    }
    return this.settingsModel.findOneAndUpdate(
      { tenantId },
      { $set: dto },
      { new: true, upsert: true },
    ).exec() as any;
  }

  async resolveLlmKeys(tenantId: Types.ObjectId, project: any): Promise<ResolvedLlmKeys> {
    const settings = await this.get(tenantId);
    const result: ResolvedLlmKeys = {
      ollamaEndpoint: settings.ollamaEndpoint || 'http://localhost:11434',
    };

    const providers: Array<'openai' | 'anthropic' | 'google'> = ['openai', 'anthropic', 'google'];
    for (const provider of providers) {
      if (!settings.providers?.[provider]) continue; // disabled

      const projectKey = project?.config?.llmKeys?.[provider];
      const globalKey = settings.llmKeys?.[provider];

      const raw = projectKey || globalKey;
      if (!raw || raw === SENSITIVE_MASK) continue;

      try {
        result[provider] = this.tryDecrypt(raw);
      } catch {
        // skip invalid key
      }
    }

    return result;
  }

  async resolveInviteUsers(tenantId: Types.ObjectId, project: any): Promise<string[]> {
    if (project?.config?.inviteUsers?.length) return project.config.inviteUsers;
    const settings = await this.get(tenantId);
    return settings.globalInviteUsers ?? [];
  }

  private tryDecrypt(value: string): string {
    try {
      return this.encryption.decrypt(value);
    } catch {
      return value;
    }
  }
}
