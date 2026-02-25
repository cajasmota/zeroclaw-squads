import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AgentTemplate,
  AgentTemplateSchema,
} from '../templates/agent-template.schema';
import { AgentInstance, AgentInstanceSchema } from './agent-instance.schema';
import { AgentInstancesController } from './agent-instances.controller';
import { AgentInstancesService } from './agent-instances.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AgentInstance.name, schema: AgentInstanceSchema },
      { name: AgentTemplate.name, schema: AgentTemplateSchema },
    ]),
  ],
  providers: [AgentInstancesService],
  controllers: [AgentInstancesController],
  exports: [AgentInstancesService],
})
export class AgentInstancesModule {}
