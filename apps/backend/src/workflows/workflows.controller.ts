import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import type { RequestUser } from '@aes/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkflowsService } from './workflows.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  private tenantId(user: RequestUser) {
    return new Types.ObjectId(user.tenantId);
  }

  @Get('workflows/templates')
  findAllTemplates(@CurrentUser() user: RequestUser) {
    return this.workflowsService.findAllTemplates(this.tenantId(user));
  }

  @Post('workflows/templates')
  createTemplate(@CurrentUser() user: RequestUser, @Body() dto: any) {
    return this.workflowsService.createTemplate(this.tenantId(user), dto);
  }

  @Post('projects/:projectId/workflows/trigger')
  triggerWorkflow(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Body() dto: { templateId: string; storyId?: string },
  ) {
    return this.workflowsService.triggerWorkflow(
      new Types.ObjectId(pid),
      this.tenantId(user),
      dto.templateId,
      dto.storyId,
    );
  }

  @Get('projects/:projectId/workflows/runs')
  getRunHistory(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
  ) {
    return this.workflowsService.getRunHistory(
      new Types.ObjectId(pid),
      this.tenantId(user),
    );
  }

  @Get('projects/:projectId/workflows/runs/:runId')
  getRunById(@CurrentUser() user: RequestUser, @Param('runId') runId: string) {
    return this.workflowsService.getRunById(runId, this.tenantId(user));
  }

  @Post('projects/:projectId/workflows/runs/:runId/approve')
  approveNode(@Param('runId') runId: string, @Body() dto: { nodeId: string }) {
    return this.workflowsService.approveNode(runId, dto.nodeId);
  }
}
