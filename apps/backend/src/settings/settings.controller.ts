import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { RequestUser } from '@aes/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GlobalSettingsService } from './global-settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: GlobalSettingsService) {}

  @Get()
  getSettings(@CurrentUser() user: RequestUser) {
    return this.settingsService.getForDisplay(new Types.ObjectId(user.tenantId));
  }

  @Patch()
  updateSettings(@CurrentUser() user: RequestUser, @Body() dto: Record<string, any>) {
    return this.settingsService.update(new Types.ObjectId(user.tenantId), dto);
  }
}
