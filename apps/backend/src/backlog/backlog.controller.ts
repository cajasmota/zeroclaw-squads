import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { RequestUser } from '@aes/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BacklogService } from './backlog.service';

@Controller('projects/:projectId')
@UseGuards(JwtAuthGuard)
export class BacklogController {
  constructor(private readonly backlogService: BacklogService) {}

  private tenantId(user: RequestUser) {
    return new Types.ObjectId(user.tenantId);
  }
  private projectOid(id: string) {
    return new Types.ObjectId(id);
  }

  // ── Epics ──────────────────────────────────────────────────────────────────
  @Get('epics')
  findEpics(@CurrentUser() user: RequestUser, @Param('projectId') pid: string) {
    return this.backlogService.findEpics(
      this.projectOid(pid),
      this.tenantId(user),
    );
  }

  @Post('epics')
  createEpic(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Body() dto: any,
  ) {
    return this.backlogService.createEpic(
      this.projectOid(pid),
      this.tenantId(user),
      dto,
    );
  }

  @Patch('epics/:epicId')
  updateEpic(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Param('epicId') eid: string,
    @Body() dto: any,
  ) {
    return this.backlogService.updateEpic(
      this.projectOid(pid),
      this.tenantId(user),
      eid,
      dto,
    );
  }

  @Delete('epics/:epicId')
  deleteEpic(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Param('epicId') eid: string,
  ) {
    return this.backlogService.deleteEpic(
      this.projectOid(pid),
      this.tenantId(user),
      eid,
    );
  }

  // ── Stories ────────────────────────────────────────────────────────────────
  @Get('stories')
  findStories(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Query('epicId') epicId?: string,
    @Query('sprintId') sprintId?: string,
    @Query('status') status?: string,
  ) {
    return this.backlogService.findStories(
      this.projectOid(pid),
      this.tenantId(user),
      { epicId, sprintId, status },
    );
  }

  @Post('stories')
  createStory(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Body() dto: any,
  ) {
    return this.backlogService.createStory(
      this.projectOid(pid),
      this.tenantId(user),
      dto,
    );
  }

  @Patch('stories/:storyId')
  updateStory(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Param('storyId') sid: string,
    @Body() dto: any,
  ) {
    return this.backlogService.updateStory(
      this.projectOid(pid),
      this.tenantId(user),
      sid,
      dto,
    );
  }

  @Delete('stories/:storyId')
  deleteStory(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Param('storyId') sid: string,
  ) {
    return this.backlogService.deleteStory(
      this.projectOid(pid),
      this.tenantId(user),
      sid,
    );
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────
  @Get('stories/:storyId/tasks')
  findTasks(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Param('storyId') sid: string,
  ) {
    return this.backlogService.findTasks(
      sid,
      this.projectOid(pid),
      this.tenantId(user),
    );
  }

  @Post('stories/:storyId/tasks')
  createTask(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Param('storyId') sid: string,
    @Body() dto: any,
  ) {
    return this.backlogService.createTask(
      sid,
      this.projectOid(pid),
      this.tenantId(user),
      dto,
    );
  }

  @Patch('stories/:storyId/tasks/:taskId')
  updateTask(
    @CurrentUser() user: RequestUser,
    @Param('taskId') tid: string,
    @Body() dto: any,
  ) {
    return this.backlogService.updateTask(this.tenantId(user), tid, dto);
  }

  @Delete('stories/:storyId/tasks/:taskId')
  deleteTask(@CurrentUser() user: RequestUser, @Param('taskId') tid: string) {
    return this.backlogService.deleteTask(this.tenantId(user), tid);
  }

  // ── Sprints ────────────────────────────────────────────────────────────────
  @Get('sprints')
  findSprints(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
  ) {
    return this.backlogService.findSprints(
      this.projectOid(pid),
      this.tenantId(user),
    );
  }

  @Post('sprints')
  createSprint(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Body() dto: any,
  ) {
    return this.backlogService.createSprint(
      this.projectOid(pid),
      this.tenantId(user),
      dto,
    );
  }

  @Patch('sprints/:sprintId')
  updateSprint(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Param('sprintId') sid: string,
    @Body() dto: any,
  ) {
    return this.backlogService.updateSprint(
      this.projectOid(pid),
      this.tenantId(user),
      sid,
      dto,
    );
  }

  @Post('sprints/:sprintId/ready')
  markSprintReady(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Param('sprintId') sid: string,
  ) {
    return this.backlogService.markSprintReady(
      this.projectOid(pid),
      this.tenantId(user),
      sid,
    );
  }
}
