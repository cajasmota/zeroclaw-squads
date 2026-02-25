import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AgentInstance,
  AgentInstanceSchema,
} from '../agent-instances/agent-instance.schema';
import { AnalyticsController } from './analytics.controller';
import { RuntimeTraceArchiveService } from './runtime-trace-archive.service';
import { Transcript, TranscriptSchema } from './transcript.schema';
import { UsageEvent, UsageEventSchema } from './usage-event.schema';
import { UsageMonitorService } from './usage-monitor.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UsageEvent.name, schema: UsageEventSchema },
      { name: Transcript.name, schema: TranscriptSchema },
      { name: AgentInstance.name, schema: AgentInstanceSchema },
    ]),
  ],
  providers: [UsageMonitorService, RuntimeTraceArchiveService],
  controllers: [AnalyticsController],
  exports: [RuntimeTraceArchiveService],
})
export class AnalyticsModule {}
