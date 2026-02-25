import { Injectable, Logger } from '@nestjs/common';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(child_process.exec);

@Injectable()
export class GitWorkspaceService {
  private readonly logger = new Logger(GitWorkspaceService.name);

  private lockPath(workspacePath: string): string {
    return path.join(workspacePath, '.git', 'aes.lock');
  }

  acquireLock(workspacePath: string): void {
    const lock = this.lockPath(workspacePath);
    if (fs.existsSync(lock)) {
      throw new Error(`Git workspace locked: ${workspacePath}`);
    }
    fs.writeFileSync(lock, String(Date.now()), 'utf8');
  }

  releaseLock(workspacePath: string): void {
    const lock = this.lockPath(workspacePath);
    if (fs.existsSync(lock)) {
      fs.unlinkSync(lock);
    }
  }

  async clone(
    agentDisplayName: string,
    repoUrl: string,
    token: string,
    workspacePath: string,
  ): Promise<void> {
    // Embed token in URL for auth
    const authUrl = repoUrl.replace('https://', `https://x-access-token:${token}@`);
    try {
      await execAsync(`git clone "${authUrl}" "${workspacePath}"`);
      await execAsync(`git -C "${workspacePath}" config user.name "${agentDisplayName}"`);
      await execAsync(`git -C "${workspacePath}" config user.email "agent@aes.local"`);
      this.logger.log(`Cloned ${repoUrl} → ${workspacePath}`);
    } catch (e) {
      this.logger.error(`Git clone failed: ${e.message}`);
      throw e;
    }
  }

  async createFeatureBranch(workspacePath: string, storyId: string): Promise<string> {
    const branch = `feature/${storyId}`;
    await execAsync(`git -C "${workspacePath}" checkout -b "${branch}"`);
    this.logger.log(`Created branch ${branch} in ${workspacePath}`);
    return branch;
  }

  async commit(workspacePath: string, message: string): Promise<void> {
    this.acquireLock(workspacePath);
    try {
      await execAsync(`git -C "${workspacePath}" add -A`);
      await execAsync(`git -C "${workspacePath}" commit -m "${message.replace(/"/g, '\\"')}"`);
    } finally {
      this.releaseLock(workspacePath);
    }
  }

  async push(workspacePath: string, branch: string, token: string, repoUrl: string): Promise<void> {
    const authUrl = repoUrl.replace('https://', `https://x-access-token:${token}@`);
    await execAsync(`git -C "${workspacePath}" remote set-url origin "${authUrl}"`);
    await execAsync(`git -C "${workspacePath}" push -u origin "${branch}"`);
  }

  async pull(workspacePath: string): Promise<void> {
    this.acquireLock(workspacePath);
    try {
      await execAsync(`git -C "${workspacePath}" pull`);
    } finally {
      this.releaseLock(workspacePath);
    }
  }
}
