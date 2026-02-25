import { Injectable } from '@nestjs/common';

export interface AieosPayload {
  standard: { protocol: string; version: string; schema_url: string };
  metadata: Record<string, any>;
  identity: Record<string, any>;
  psychology: Record<string, any>;
  linguistics: Record<string, any>;
  history: Record<string, any>;
  capabilities: { skills: any[] };
  [key: string]: any;
}

const REQUIRED_SECTIONS = ['standard', 'identity', 'psychology', 'linguistics', 'history', 'capabilities'];

@Injectable()
export class AieosGeneratorService {
  validate(payload: object): boolean {
    if (!payload || typeof payload !== 'object') return false;
    return REQUIRED_SECTIONS.every((key) => key in payload);
  }

  generate(instance: {
    displayName: string;
    aieos_identity?: Record<string, any> | null;
    config?: { model?: string; provider?: string; skills?: string };
  }): AieosPayload {
    const existing = instance.aieos_identity ?? {};
    return {
      standard: {
        protocol: 'AIEOS',
        version: '1.1.0',
        schema_url: 'https://aieos.org/schema/v1.1/aieos.schema.json',
      },
      metadata: {
        instance_id: '',
        instance_version: '1.0',
        generator: 'aes',
        created_at: new Date().toISOString().split('T')[0],
        last_updated: new Date().toISOString().split('T')[0],
        ...existing.metadata,
      },
      identity: {
        names: {
          first: existing.identity?.names?.first ?? instance.displayName,
          nickname: existing.identity?.names?.nickname ?? instance.displayName,
        },
        origin: existing.identity?.origin ?? {},
        ...existing.identity,
      },
      psychology: {
        neural_matrix: {
          creativity: 0.7,
          empathy: 0.6,
          logic: 0.8,
          adaptability: 0.7,
          charisma: 0.5,
          reliability: 0.9,
          ...existing.psychology?.neural_matrix,
        },
        traits: {
          ocean: {
            openness: 0.7,
            conscientiousness: 0.8,
            extraversion: 0.5,
            agreeableness: 0.7,
            neuroticism: 0.2,
            ...existing.psychology?.traits?.ocean,
          },
        },
        moral_compass: { alignment: 'Lawful Good', ...existing.psychology?.moral_compass },
        ...existing.psychology,
      },
      linguistics: {
        text_style: {
          formality_level: 0.7,
          verbosity_level: 0.5,
          vocabulary_level: 'professional',
          ...existing.linguistics?.text_style,
        },
        ...existing.linguistics,
      },
      history: {
        origin_story: existing.history?.origin_story ?? `AI agent named ${instance.displayName}`,
        occupation: {
          title: existing.history?.occupation?.title ?? instance.config?.skills ?? 'Software Engineer',
          industry: 'Technology',
          ...existing.history?.occupation,
        },
        ...existing.history,
      },
      capabilities: {
        skills: existing.capabilities?.skills ?? [],
      },
    };
  }

  serialize(payload: AieosPayload): string {
    return JSON.stringify(payload, null, 2);
  }

  // Kept for backwards compatibility
  generateIdentityJson(instance: {
    displayName: string;
    aieos_identity?: Record<string, any> | null;
    config?: { model?: string; provider?: string };
  }): AieosPayload {
    return this.generate(instance);
  }
}
