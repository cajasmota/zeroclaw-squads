import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Story, StorySchema } from '../backlog/story.schema';
import { AgentInstance, AgentInstanceSchema } from '../agent-instances/agent-instance.schema';
import { AgentInstancesModule } from '../agent-instances/agent-instances.module';
import { SettingsModule } from '../settings/settings.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { TicketComment, TicketCommentSchema } from '../ticket-dialogue/ticket-comment.schema';
import { AgentFileWriterService } from './agent-file-writer.service';
import { AieosGeneratorService } from './aieos-generator.service';
import { ZeroClawConfigGeneratorService } from './zeroclaw-config-generator.service';
import { ZeroClawProcessManagerService } from './zeroclaw-process-manager.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AgentInstance.name, schema: AgentInstanceSchema },
      { name: Story.name, schema: StorySchema },
      { name: TicketComment.name, schema: TicketCommentSchema },
    ]),
    AgentInstancesModule,
    SettingsModule,
    WebsocketModule,
  ],
  providers: [
    ZeroClawProcessManagerService,
    ZeroClawConfigGeneratorService,
    AieosGeneratorService,
    AgentFileWriterService,
  ],
  exports: [ZeroClawProcessManagerService, ZeroClawConfigGeneratorService, AieosGeneratorService, AgentFileWriterService],
})
export class ZeroClawModule {}
