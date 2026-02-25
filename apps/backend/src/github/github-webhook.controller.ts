import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type {RawBodyRequest} from "@nestjs/common";
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { ZeroClawProcessManagerService } from '../zeroclaw/zeroclaw-process-manager.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('webhooks')
export class GitHubWebhookController {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly processManager: ZeroClawProcessManagerService,
  ) {}

  @Public()
  @Post('github')
  @HttpCode(200)
  async handleGitHubWebhook(
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-event') event: string,
    @Req() req: RawBodyRequest<any>,
    @Body() payload: any,
  ): Promise<{ ok: boolean }> {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret) {
      this.verifySignature(
        req.rawBody?.toString() ?? JSON.stringify(payload),
        signature,
        secret,
      );
    }

    await this.routeEvent(event, payload);
    return { ok: true };
  }

  private verifySignature(
    body: string,
    signature: string,
    secret: string,
  ): void {
    if (!signature) throw new UnauthorizedException('Missing signature');
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
    if (
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  private async routeEvent(event: string, payload: any): Promise<void> {
    if (event === 'pull_request' && payload.action === 'opened') {
      this.eventEmitter.emit('github.pr.opened', {
        prNumber: payload.pull_request?.number,
        branchName: payload.pull_request?.head?.ref ?? '',
        repoUrl: payload.repository?.clone_url,
      });
    } else if (
      event === 'pull_request' &&
      payload.action === 'closed' &&
      payload.pull_request?.merged === true
    ) {
      this.eventEmitter.emit('github.pr.merged', {
        prNumber: payload.pull_request?.number,
        branchName: payload.pull_request?.head?.ref ?? '',
        repoUrl: payload.repository?.clone_url,
      });
    } else if (event === 'issue_comment' && payload.action === 'created') {
      this.eventEmitter.emit('github.pr.comment', {
        prNumber: payload.issue?.number,
        branchName: payload.issue?.pull_request ? '' : '',
        body: payload.comment?.body,
      });
    } else if (
      event === 'pull_request_review_comment' &&
      payload.action === 'created'
    ) {
      this.eventEmitter.emit('github.pr.comment', {
        prNumber: payload.pull_request?.number,
        branchName: payload.pull_request?.head?.ref ?? '',
        body: payload.comment?.body,
      });
    } else if (event === 'push' && payload.ref === 'refs/heads/main') {
      this.eventEmitter.emit('librarian.reindex', {
        repoUrl: payload.repository?.clone_url,
      });
    }
  }
}
