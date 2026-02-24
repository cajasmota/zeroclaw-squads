import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { RequestUser } from '@aes/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AgentInstancesService } from './agent-instances.service';

@Controller('projects/:projectId/agents')
@UseGuards(JwtAuthGuard)
export class AgentInstancesController {
  constructor(private readonly agentInstancesService: AgentInstancesService) {}

  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Param('projectId') projectId: string,
  ) {
    return this.agentInstancesService.findByProject(
      new Types.ObjectId(projectId),
      new Types.ObjectId(user.tenantId),
    );
  }

  @Get(':id')
  findById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.agentInstancesService.findById(id, new Types.ObjectId(user.tenantId));
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { soul?: string; aieos_identity?: Record<string, any>; displayName?: string },
  ) {
    return this.agentInstancesService.updateSoulOrIdentity(id, new Types.ObjectId(user.tenantId), body);
  }
}
