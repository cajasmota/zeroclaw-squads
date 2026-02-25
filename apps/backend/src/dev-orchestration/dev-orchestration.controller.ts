import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import type { RequestUser } from '@aes/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DevelopmentOrchestrationService } from './development-orchestration.service';

@Controller('projects/:projectId/stories')
@UseGuards(JwtAuthGuard)
export class DevOrchestrationController {
  constructor(
    private readonly orchestration: DevelopmentOrchestrationService,
  ) {}

  @Post(':storyId/assign')
  assignStory(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Param('storyId') storyId: string,
    @Body() dto: { agentInstanceId: string },
  ) {
    return this.orchestration.assignStory(
      storyId,
      dto.agentInstanceId,
      new Types.ObjectId(pid),
      new Types.ObjectId(user.tenantId),
    );
  }
}
