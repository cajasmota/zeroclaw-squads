import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AesGateway } from './aes.gateway';
import { SlackChannelMapping, SlackChannelMappingSchema } from './slack-channel-mapping.schema';
import { SlackChannelMappingService } from './slack-channel-mapping.service';
import { SlackEventsController } from './slack-events.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SlackChannelMapping.name, schema: SlackChannelMappingSchema },
    ]),
  ],
  providers: [AesGateway, SlackChannelMappingService],
  controllers: [SlackEventsController],
  exports: [AesGateway, SlackChannelMappingService],
})
export class WebsocketModule {}
