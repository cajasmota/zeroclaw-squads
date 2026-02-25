import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebsocketModule } from '../websocket/websocket.module';
import { BacklogController } from './backlog.controller';
import { BacklogService } from './backlog.service';
import { Epic, EpicSchema } from './epic.schema';
import { Sprint, SprintSchema } from './sprint.schema';
import { Story, StorySchema } from './story.schema';
import { Task, TaskSchema } from './task.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Epic.name, schema: EpicSchema },
      { name: Story.name, schema: StorySchema },
      { name: Task.name, schema: TaskSchema },
      { name: Sprint.name, schema: SprintSchema },
    ]),
    WebsocketModule,
  ],
  providers: [BacklogService],
  controllers: [BacklogController],
  exports: [BacklogService],
})
export class BacklogModule {}
