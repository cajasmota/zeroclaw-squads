import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RequirementsController } from './requirements.controller';
import { RequirementsService } from './requirements.service';
import {
  RequirementsDocument,
  RequirementsDocumentSchema,
} from './requirements-document.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RequirementsDocument.name, schema: RequirementsDocumentSchema },
    ]),
  ],
  providers: [RequirementsService],
  controllers: [RequirementsController],
  exports: [RequirementsService],
})
export class RequirementsModule {}
