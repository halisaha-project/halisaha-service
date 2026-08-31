import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'password_resets' })
export class PasswordReset {
  @Prop({ required: true, index: true, type: Types.ObjectId })
  userId!: Types.ObjectId;
  @Prop({ required: true, unique: true, index: true })
  tokenHash!: string;
  @Prop({ required: true, index: true })
  expiresAt!: Date;
  @Prop({ type: Date, default: null })
  consumedAt!: Date | null;
}

export const PasswordResetSchema = SchemaFactory.createForClass(PasswordReset);
