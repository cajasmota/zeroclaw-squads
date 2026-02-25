import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { RequestUser } from '@aes/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequirementsService } from './requirements.service';

@Controller('projects/:projectId/requirements')
@UseGuards(JwtAuthGuard)
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  private tenantId(user: RequestUser) {
    return new Types.ObjectId(user.tenantId);
  }
  private projectOid(id: string) {
    return new Types.ObjectId(id);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Param('projectId') pid: string) {
    return this.requirementsService.findAll(
      this.projectOid(pid),
      this.tenantId(user),
    );
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Body() dto: any,
  ) {
    return this.requirementsService.create(
      this.projectOid(pid),
      this.tenantId(user),
      dto,
    );
  }

  @Patch(':docId')
  update(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Param('docId') docId: string,
    @Body() dto: any,
  ) {
    return this.requirementsService.update(
      this.projectOid(pid),
      this.tenantId(user),
      docId,
      dto,
    );
  }

  @Delete(':docId')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('projectId') pid: string,
    @Param('docId') docId: string,
  ) {
    await this.requirementsService.delete(
      this.projectOid(pid),
      this.tenantId(user),
      docId,
    );
  }
}
