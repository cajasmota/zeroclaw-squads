import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Aes256EncryptionService } from '../common/services/aes256-encryption.service';
import { GlobalSettings, GlobalSettingsSchema } from './global-settings.schema';
import { GlobalSettingsService } from './global-settings.service';
import { ModelsController } from './models.controller';
import { OllamaService } from './ollama.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GlobalSettings.name, schema: GlobalSettingsSchema },
    ]),
  ],
  providers: [GlobalSettingsService, OllamaService, Aes256EncryptionService],
  controllers: [SettingsController, ModelsController],
  exports: [GlobalSettingsService, OllamaService],
})
export class SettingsModule {}
