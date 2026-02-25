import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AgentInstance,
  AgentInstanceSchema,
} from '../agent-instances/agent-instance.schema';
import { BacklogModule } from '../backlog/backlog.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { ZeroClawModule } from '../zeroclaw/zeroclaw.module';
import { WorkflowNodeExecutorService } from './workflow-node-executor.service';
import { WorkflowRun, WorkflowRunSchema } from './workflow-run.schema';
import { WorkflowStoryBridgeService } from './workflow-story-bridge.service';
import {
  WorkflowTemplate,
  WorkflowTemplateSchema,
} from './workflow-template.schema';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkflowTemplate.name, schema: WorkflowTemplateSchema },
      { name: WorkflowRun.name, schema: WorkflowRunSchema },
      { name: AgentInstance.name, schema: AgentInstanceSchema },
    ]),
    WebsocketModule,
    BacklogModule,
    ZeroClawModule,
  ],
  providers: [
    WorkflowsService,
    WorkflowStoryBridgeService,
    WorkflowNodeExecutorService,
  ],
  controllers: [WorkflowsController],
  exports: [WorkflowsService, WorkflowStoryBridgeService, WorkflowNodeExecutorService],
})
export class WorkflowsModule {}
