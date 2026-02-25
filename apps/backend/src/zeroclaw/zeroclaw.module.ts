import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentInstance, AgentInstanceSchema } from '../agent-instances/agent-instance.schema';
import { AgentInstancesModule } from '../agent-instances/agent-instances.module';
import { SettingsModule } from '../settings/settings.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { AgentFileWriterService } from './agent-file-writer.service';
import { AieosGeneratorService } from './aieos-generator.service';
import { ZeroClawConfigGeneratorService } from './zeroclaw-config-generator.service';
import { ZeroClawProcessManagerService } from './zeroclaw-process-manager.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AgentInstance.name, schema: AgentInstanceSchema }]),
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
