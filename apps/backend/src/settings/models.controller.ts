import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import type { RequestUser } from '@aes/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GlobalSettingsService } from './global-settings.service';
import { OllamaService } from './ollama.service';

const VALID_PROVIDERS = ['openai', 'anthropic', 'google', 'ollama'] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

@Controller('settings/models')
@UseGuards(JwtAuthGuard)
export class ModelsController {
  constructor(
    private readonly ollamaService: OllamaService,
    private readonly settingsService: GlobalSettingsService,
  ) {}

  @Get('ollama/status')
  getOllamaStatus() {
    return this.ollamaService.getStatus();
  }

  @Post('ollama/pull')
  pullModel(@Body() body: { model: string }) {
    return this.ollamaService
      .pullModel(body.model)
      .then(() => ({ success: true }));
  }

  @Delete('ollama/:modelName')
  deleteModel(@Param('modelName') modelName: string) {
    return this.ollamaService
      .deleteModel(modelName)
      .then(() => ({ success: true }));
  }

  @Post('ollama/:modelName/unload')
  unloadModel(@Param('modelName') modelName: string) {
    return this.ollamaService
      .unloadModel(modelName)
      .then(() => ({ success: true }));
  }

  @Post('ollama/:modelName/load')
  loadModel(@Param('modelName') modelName: string) {
    return this.ollamaService
      .loadModel(modelName)
      .then(() => ({ success: true }));
  }

  @Get('providers')
  async getProviders(@CurrentUser() user: RequestUser) {
    const settings = await this.settingsService.getForDisplay(
      new Types.ObjectId(user.tenantId),
    );
    return settings.providers;
  }

  @Patch('providers/:provider')
  async toggleProvider(
    @CurrentUser() user: RequestUser,
    @Param('provider') provider: string,
    @Body() body: { enabled: boolean },
  ) {
    if (!VALID_PROVIDERS.includes(provider as Provider)) {
      return { error: 'Invalid provider' };
    }
    const tenantId = new Types.ObjectId(user.tenantId);
    const settings = await this.settingsService.get(tenantId);
    const updatedProviders = {
      ...(settings.providers ?? {}),
      [provider]: body.enabled,
    };
    return this.settingsService.update(tenantId, {
      providers: updatedProviders as any,
    });
  }
}
