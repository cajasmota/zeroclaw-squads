import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './auth/auth.module';
import { TemplatesModule } from './templates/templates.module';
import { ProjectsModule } from './projects/projects.module';
import { AgentInstancesModule } from './agent-instances/agent-instances.module';
import { WebsocketModule } from './websocket/websocket.module';
import { ProjectInitializerModule } from './project-initializer/project-initializer.module';
import { ZeroClawModule } from './zeroclaw/zeroclaw.module';
import { BacklogModule } from './backlog/backlog.module';
import { GitHubModule } from './github/github.module';
import { LibrarianModule } from './librarian/librarian.module';
import { DevOrchestrationModule } from './dev-orchestration/dev-orchestration.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { TicketDialogueModule } from './ticket-dialogue/ticket-dialogue.module';
import { SettingsModule } from './settings/settings.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { RequirementsModule } from './requirements/requirements.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/aes',
        ),
      }),
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot(),
    AuthModule,
    TemplatesModule,
    ProjectsModule,
    AgentInstancesModule,
    WebsocketModule,
    ProjectInitializerModule,
    ZeroClawModule,
    BacklogModule,
    GitHubModule,
    LibrarianModule,
    DevOrchestrationModule,
    WorkflowsModule,
    TicketDialogueModule,
    SettingsModule,
    AnalyticsModule,
    RequirementsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
