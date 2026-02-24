import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.passwordHash;
      return ret;
    },
  },
  toObject: {
    transform: (_doc, ret) => {
      delete ret.passwordHash;
      return ret;
    },
  },
})
export class User {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  name: string;

  @Prop({ enum: ['admin', 'member'], default: 'member' })
  role: string;

  @Prop({ enum: ['active', 'inactive'], default: 'active' })
  status: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Compound unique index: one email per tenant
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
