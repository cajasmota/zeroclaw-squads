import { Injectable, Logger } from '@nestjs/common';

export interface AgentIdentity {
  displayName: string;
  role: string;
  avatarUrl?: string;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  private getClient(token: string) {
    // Dynamic import to avoid issues when @slack/web-api is not installed
    const { WebClient } = require('@slack/web-api');
    return new WebClient(token);
  }

  async createChannel(token: string, slug: string): Promise<string> {
    try {
      const client = this.getClient(token);
      const result = await client.conversations.create({
        name: `project-${slug}`,
        is_private: false,
      });
      return result.channel?.id ?? '';
    } catch (e) {
      this.logger.error(`Failed to create Slack channel: ${e.message}`);
      return '';
    }
  }

  async inviteUsers(token: string, channelId: string, userIds: string[]): Promise<void> {
    if (!userIds.length) return;
    try {
      const client = this.getClient(token);
      await client.conversations.invite({ channel: channelId, users: userIds.join(',') });
    } catch (e) {
      this.logger.warn(`Failed to invite users to Slack: ${e.message}`);
    }
  }

  async postAsAgent(
    token: string,
    channelId: string,
    text: string,
    agent: AgentIdentity,
    brandColor: string,
  ): Promise<string | null> {
    try {
      const client = this.getClient(token);
      const result = await client.chat.postMessage({
        channel: channelId,
        text,
        username: agent.displayName,
        icon_url: agent.avatarUrl || this.generateAvatarUrl(agent, brandColor),
      });
      return result.ts ?? null;
    } catch (e) {
      this.logger.error(`Failed to post to Slack: ${e.message}`);
      return null;
    }
  }

  async postThreadReplyAsAgent(
    token: string,
    channelId: string,
    threadTs: string,
    text: string,
    agent: AgentIdentity,
    brandColor: string,
  ): Promise<void> {
    try {
      const client = this.getClient(token);
      await client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text,
        username: agent.displayName,
        icon_url: agent.avatarUrl || this.generateAvatarUrl(agent, brandColor),
      });
    } catch (e) {
      this.logger.error(`Failed to post thread reply to Slack: ${e.message}`);
    }
  }

  async postA2AMessage(
    token: string,
    channelId: string,
    fromAgent: AgentIdentity & { roleEmoji: string },
    toAgent: AgentIdentity & { roleEmoji: string },
    message: string,
    brandColor: string,
  ): Promise<void> {
    const text = `[A2A] ${fromAgent.roleEmoji} ${fromAgent.displayName} → ${toAgent.roleEmoji} ${toAgent.displayName}: ${message}`;
    await this.postAsAgent(token, channelId, text, fromAgent, brandColor);
  }

  generateAvatarUrl(agent: AgentIdentity, _brandColor: string): string {
    // Returns a placeholder avatar URL - real implementation would use sharp/canvas
    const role = agent.role?.toLowerCase() ?? 'agent';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.displayName)}&background=004176&color=fff&size=64&bold=true&rounded=true`;
  }
}
