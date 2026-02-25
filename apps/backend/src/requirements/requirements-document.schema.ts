import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type RequirementsDocumentDoc = RequirementsDocument & Document;

@Schema({ timestamps: true })
export class RequirementsDocument {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ type: SchemaTypes.Mixed, default: '' })
  content: unknown;

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  parentId: Types.ObjectId | null;

  @Prop({ default: 0 })
  order: number;
}

export const RequirementsDocumentSchema =
  SchemaFactory.createForClass(RequirementsDocument);
RequirementsDocumentSchema.index({ projectId: 1, tenantId: 1 });
