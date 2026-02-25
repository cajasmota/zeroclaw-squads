import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import { Aes256EncryptionService } from '../common/services/aes256-encryption.service';

@Injectable()
export class GitHubAppService {
  private readonly logger = new Logger(GitHubAppService.name);

  constructor(private readonly encryption: Aes256EncryptionService) {}

  async getInstallationToken(project: {
    config: { githubApp?: { appId?: string; privateKey?: string; installationId?: string } };
  }): Promise<string> {
    const app = project.config?.githubApp;
    if (!app?.appId || !app?.privateKey || !app?.installationId) {
      throw new Error('GitHub App credentials not configured on this project');
    }

    const privateKey = this.tryDecrypt(app.privateKey);
    const auth = createAppAuth({ appId: app.appId, privateKey });

    const installationAuth = await auth({
      type: 'installation',
      installationId: Number(app.installationId),
    });

    return (installationAuth as any).token as string;
  }

  async getAuthenticatedOctokit(project: {
    config: { githubApp?: { appId?: string; privateKey?: string; installationId?: string } };
  }): Promise<Octokit> {
    const token = await this.getInstallationToken(project);
    return new Octokit({ auth: token });
  }

  private tryDecrypt(value: string): string {
    try {
      return this.encryption.decrypt(value);
    } catch {
      return value;
    }
  }
}
