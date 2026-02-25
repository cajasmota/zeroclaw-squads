import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentInstance, AgentInstanceSchema } from '../agent-instances/agent-instance.schema';
import { Aes256EncryptionService } from '../common/services/aes256-encryption.service';
import { Project, ProjectSchema } from '../projects/project.schema';
import { SettingsModule } from '../settings/settings.module';
import { SlackChannelMapping, SlackChannelMappingSchema } from '../websocket/slack-channel-mapping.schema';
import { AgentRoleEmojiService } from './agent-role-emoji.service';
import { ProjectInitializerService } from './project-initializer.service';
import { SlackService } from './slack.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: AgentInstance.name, schema: AgentInstanceSchema },
      { name: SlackChannelMapping.name, schema: SlackChannelMappingSchema },
    ]),
    SettingsModule,
  ],
  providers: [
    ProjectInitializerService,
    SlackService,
    AgentRoleEmojiService,
    Aes256EncryptionService,
  ],
  exports: [SlackService, AgentRoleEmojiService],
})
export class ProjectInitializerModule {}
