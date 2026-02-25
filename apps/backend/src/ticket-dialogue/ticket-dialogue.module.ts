import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BacklogModule } from '../backlog/backlog.module';
import { GitHubModule } from '../github/github.module';
import { ProjectInitializerModule } from '../project-initializer/project-initializer.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { ZeroClawModule } from '../zeroclaw/zeroclaw.module';
import { TicketCommentSchema, TicketComment } from './ticket-comment.schema';
import { TicketDialogueController } from './ticket-dialogue.controller';
import { TicketDialogueService } from './ticket-dialogue.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TicketComment.name, schema: TicketCommentSchema }]),
    BacklogModule,
    ZeroClawModule,
    WebsocketModule,
    ProjectInitializerModule,
    GitHubModule,
  ],
  providers: [TicketDialogueService],
  controllers: [TicketDialogueController],
  exports: [TicketDialogueService],
})
export class TicketDialogueModule {}
