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
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplatesService } from './templates.service';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('role') role?: string,
    @Query('tags') tags?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAll(new Types.ObjectId(user.tenantId), {
      role,
      tags,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  findById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.templatesService.findById(
      new Types.ObjectId(user.tenantId),
      id,
    );
  }

  @Get(':id/export')
  exportJson(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.templatesService.exportJson(
      new Types.ObjectId(user.tenantId),
      id,
    );
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(new Types.ObjectId(user.tenantId), dto);
  }

  @Post('import')
  importJson(@CurrentUser() user: RequestUser, @Body() payload: any) {
    return this.templatesService.importJson(
      new Types.ObjectId(user.tenantId),
      payload,
    );
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(
      new Types.ObjectId(user.tenantId),
      id,
      dto,
    );
  }

  @Delete(':id')
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.templatesService.delete(new Types.ObjectId(user.tenantId), id);
  }
}
