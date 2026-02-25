import { Body, Controller, Headers, HttpCode, HttpException, HttpStatus, Logger, Post } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Public } from '../common/decorators/public.decorator';
import { SlackChannelMappingService } from './slack-channel-mapping.service';

@Controller('webhooks')
export class SlackEventsController {
  private readonly logger = new Logger(SlackEventsController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly channelMapping: SlackChannelMappingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  verifySlackSignature(body: string, timestamp: string, signature: string): boolean {
    const secret = this.configService.get<string>('SLACK_SIGNING_SECRET', '');
    if (!secret) return false;

    const sigBaseString = `v0:${timestamp}:${body}`;
    const hmac = crypto.createHmac('sha256', secret);
    const computedSig = `v0=${hmac.update(sigBaseString).digest('hex')}`;
    const a = Buffer.from(computedSig);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  @Post('slack')
  @Public()
  @HttpCode(200)
  async handleSlackEvent(
    @Body() body: any,
    @Headers('x-slack-signature') signature: string,
    @Headers('x-slack-request-timestamp') timestamp: string,
  ) {
    if (signature && timestamp) {
      const rawBody = JSON.stringify(body);
      if (!this.verifySlackSignature(rawBody, timestamp, signature)) {
        throw new HttpException('Invalid Slack signature', HttpStatus.UNAUTHORIZED);
      }
    }

    // Slack URL verification challenge
    if (body.type === 'url_verification') {
      return { challenge: body.challenge };
    }

    if (body.type === 'event_callback') {
      const event = body.event;
      this.logger.debug(`Slack event: ${event?.type}`);

      // Skip bot messages and A2A messages
      if (event?.bot_id || event?.text?.startsWith('[A2A]')) {
        return { ok: true };
      }

      if (event?.type === 'message' || event?.type === 'app_mention') {
        await this.routeMessageToAgent(event).catch((e) =>
          this.logger.error(`Failed to route Slack message: ${e.message}`),
        );
      }
    }

    return { ok: true };
  }

  private async routeMessageToAgent(event: any): Promise<void> {
    const channelId: string = event.channel;
    if (!channelId) return;

    const mapping = await this.channelMapping.getProjectByChannel(channelId);
    if (!mapping) {
      this.logger.debug(`No project mapping for Slack channel ${channelId}`);
      return;
    }

    const mentionMatch = event.text?.match(/<@([A-Z0-9]+)>/);
    const mentionedSlackUserId = mentionMatch?.[1];

    this.eventEmitter.emit('slack.message.received', {
      projectId: mapping.projectId.toString(),
      tenantId: mapping.tenantId.toString(),
      channelId,
      text: event.text ?? '',
      mentionedSlackUserId,
    });
  }
}
