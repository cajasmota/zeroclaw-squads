export type AgentRole =
  | 'pm'
  | 'architect'
  | 'developer'
  | 'reviewer'
  | 'qa'
  | 'devops'
  | 'librarian';

export interface AieosIdentity {
  version: '1.1';
  identity: {
    name: string;
    displayName: string;
    role: string;
    description: string;
    avatarUrl?: string;
  };
  psychology: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  linguistics: {
    tone: string;
    verbosity: 'concise' | 'normal' | 'verbose';
  };
  capabilities: string[];
}

export interface AgentTemplateBase {
  name: string;
  role: AgentRole;
  description: string;
  aieos: AieosIdentity;
  defaultModel: string;
  systemPromptExtra?: string;
}
