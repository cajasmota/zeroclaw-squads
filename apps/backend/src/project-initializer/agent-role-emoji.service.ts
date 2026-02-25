import { Injectable } from '@nestjs/common';

const ROLE_EMOJI: Record<string, string> = {
  librarian: '📚',
  architect: '🏗️',
  pm: '📋',
  developer: '💻',
  reviewer: '🔍',
  tester: '🧪',
};

@Injectable()
export class AgentRoleEmojiService {
  getEmoji(role: string): string {
    return ROLE_EMOJI[role] ?? '🤖';
  }

  getDisplayName(displayName: string, role: string): string {
    return `${this.getEmoji(role)} ${displayName}`;
  }
}
