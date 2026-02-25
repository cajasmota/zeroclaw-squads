import { Injectable } from '@nestjs/common';

@Injectable()
export class StoryContextSerializerService {
  serialize(story: {
    _id?: any;
    title: string;
    description?: string;
    type?: string;
    priority?: string;
    acceptanceCriteria?: string;
    branchName?: string;
  }): string {
    const lines: string[] = [
      `STORY_ID: ${story._id?.toString() ?? ''}`,
      `TITLE: ${story.title}`,
      `TYPE: ${story.type ?? 'feature'}`,
      `PRIORITY: ${story.priority ?? 'medium'}`,
    ];
    if (story.description) lines.push(`DESCRIPTION: ${story.description}`);
    if (story.branchName) lines.push(`BRANCH: ${story.branchName}`);
    if (story.acceptanceCriteria)
      lines.push(`ACCEPTANCE_CRITERIA:\n${story.acceptanceCriteria}`);
    return lines.join('\n');
  }
}
