import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Aes256EncryptionService } from '../common/services/aes256-encryption.service';
import { Project, ProjectSchema } from './project.schema';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
  ],
  providers: [ProjectsService, Aes256EncryptionService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
