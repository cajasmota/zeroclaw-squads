import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AgentInstance,
  AgentInstanceSchema,
} from '../agent-instances/agent-instance.schema';
import { BacklogModule } from '../backlog/backlog.module';
import { ProjectInitializerModule } from '../project-initializer/project-initializer.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { ZeroClawModule } from '../zeroclaw/zeroclaw.module';
import { AgentAvailabilityService } from './agent-availability.service';
import { DevOrchestrationController } from './dev-orchestration.controller';
import { DevelopmentOrchestrationService } from './development-orchestration.service';
import { StoryContextSerializerService } from './story-context-serializer.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AgentInstance.name, schema: AgentInstanceSchema },
    ]),
    BacklogModule,
    ZeroClawModule,
    WebsocketModule,
    ProjectInitializerModule,
  ],
  providers: [
    DevelopmentOrchestrationService,
    AgentAvailabilityService,
    StoryContextSerializerService,
  ],
  controllers: [DevOrchestrationController],
  exports: [DevelopmentOrchestrationService, AgentAvailabilityService],
})
export class DevOrchestrationModule {}
