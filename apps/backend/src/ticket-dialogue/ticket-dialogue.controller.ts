import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import type { RequestUser } from '@aes/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TicketDialogueService } from './ticket-dialogue.service';

@Controller('projects/:projectId/stories/:storyId')
@UseGuards(JwtAuthGuard)
export class TicketDialogueController {
  constructor(private readonly dialogue: TicketDialogueService) {}

  @Get('comments')
  getComments(
    @CurrentUser() user: RequestUser,
    @Param('storyId') storyId: string,
  ) {
    return this.dialogue.getComments(
      storyId,
      new Types.ObjectId(user.tenantId),
    );
  }

  @Post('comments')
  postComment(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Param('storyId') storyId: string,
    @Body() dto: { content: string },
  ) {
    return this.dialogue.postHumanComment(
      storyId,
      new Types.ObjectId(pid),
      new Types.ObjectId(user.tenantId),
      user.userId,
      user.email,
      dto.content,
    );
  }

  @Post('approve')
  approveStory(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Param('storyId') storyId: string,
  ) {
    return this.dialogue.approveStory(
      storyId,
      new Types.ObjectId(pid),
      new Types.ObjectId(user.tenantId),
      user.userId,
      user.email,
    );
  }

  @Post('answer')
  answerAgent(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Param('storyId') storyId: string,
    @Body() dto: { answer: string },
  ) {
    return this.dialogue.answerAgent(
      storyId,
      new Types.ObjectId(pid),
      new Types.ObjectId(user.tenantId),
      user.userId,
      user.email,
      dto.answer,
    );
  }
}
