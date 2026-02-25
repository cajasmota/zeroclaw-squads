import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BacklogModule } from '../backlog/backlog.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { WorkflowRun, WorkflowRunSchema } from './workflow-run.schema';
import { WorkflowStoryBridgeService } from './workflow-story-bridge.service';
import { WorkflowTemplate, WorkflowTemplateSchema } from './workflow-template.schema';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkflowTemplate.name, schema: WorkflowTemplateSchema },
      { name: WorkflowRun.name, schema: WorkflowRunSchema },
    ]),
    WebsocketModule,
    BacklogModule,
  ],
  providers: [WorkflowsService, WorkflowStoryBridgeService],
  controllers: [WorkflowsController],
  exports: [WorkflowsService, WorkflowStoryBridgeService],
})
export class WorkflowsModule {}
