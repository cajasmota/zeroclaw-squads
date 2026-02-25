import { Injectable, Logger } from '@nestjs/common';
import { GitHubAppService } from './github-app.service';

@Injectable()
export class GitHubPRService {
  private readonly logger = new Logger(GitHubPRService.name);

  constructor(private readonly githubApp: GitHubAppService) {}

  private parseRepo(repoUrl: string): { owner: string; repo: string } {
    const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (!match) throw new Error(`Cannot parse GitHub repo URL: ${repoUrl}`);
    return { owner: match[1], repo: match[2].replace('.git', '') };
  }

  async createPullRequest(
    project: any,
    params: { title: string; body: string; branch: string; base?: string },
  ): Promise<number> {
    const octokit = await this.githubApp.getAuthenticatedOctokit(project);
    const { owner, repo } = this.parseRepo(project.config?.repoUrl ?? '');
    const response = await octokit.pulls.create({
      owner,
      repo,
      title: params.title,
      body: params.body,
      head: params.branch,
      base: params.base ?? 'main',
    });
    this.logger.log(`Created PR #${response.data.number}: ${params.title}`);
    return response.data.number;
  }

  async postComment(project: any, prNumber: number, body: string): Promise<void> {
    const octokit = await this.githubApp.getAuthenticatedOctokit(project);
    const { owner, repo } = this.parseRepo(project.config?.repoUrl ?? '');
    await octokit.issues.createComment({ owner, repo, issue_number: prNumber, body });
  }

  async getPRComments(project: any, prNumber: number): Promise<Array<{ body: string; user: string }>> {
    const octokit = await this.githubApp.getAuthenticatedOctokit(project);
    const { owner, repo } = this.parseRepo(project.config?.repoUrl ?? '');
    const response = await octokit.issues.listComments({ owner, repo, issue_number: prNumber });
    return response.data.map((c) => ({ body: c.body ?? '', user: c.user?.login ?? '' }));
  }

  async mergePullRequest(project: any, prNumber: number): Promise<void> {
    const octokit = await this.githubApp.getAuthenticatedOctokit(project);
    const { owner, repo } = this.parseRepo(project.config?.repoUrl ?? '');
    await octokit.pulls.merge({ owner, repo, pull_number: prNumber, merge_method: 'squash' });
    this.logger.log(`Merged PR #${prNumber}`);
  }
}
