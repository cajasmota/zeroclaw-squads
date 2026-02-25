import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type EpicDocument = Epic & Document;

@Schema({ timestamps: true })
export class Epic {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '#004176' })
  color: string;

  @Prop({ enum: ['open', 'in_progress', 'done'], default: 'open' })
  status: string;

  @Prop({ default: 0 })
  order: number;
}

export const EpicSchema = SchemaFactory.createForClass(Epic);
EpicSchema.index({ projectId: 1, tenantId: 1 });
