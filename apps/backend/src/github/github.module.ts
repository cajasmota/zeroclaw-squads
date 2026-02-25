import { Module } from '@nestjs/common';
import { Aes256EncryptionService } from '../common/services/aes256-encryption.service';
import { ZeroClawModule } from '../zeroclaw/zeroclaw.module';
import { GitHubAppService } from './github-app.service';
import { GitHubPRService } from './github-pr.service';
import { GitHubWebhookController } from './github-webhook.controller';
import { GitWorkspaceService } from './git-workspace.service';

@Module({
  imports: [ZeroClawModule],
  providers: [GitHubAppService, GitHubPRService, GitWorkspaceService, Aes256EncryptionService],
  controllers: [GitHubWebhookController],
  exports: [GitHubAppService, GitHubPRService, GitWorkspaceService],
})
export class GitHubModule {}
