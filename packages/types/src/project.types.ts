export type ProjectStatus = 'initializing' | 'active' | 'paused' | 'archived';

export interface ProjectBase {
  name: string;
  description?: string;
  repoUrl?: string;
  defaultBranch?: string;
  slackChannelId?: string;
}
