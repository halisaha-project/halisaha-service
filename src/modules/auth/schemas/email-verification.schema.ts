import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'email_verifications' })
export class EmailVerification {
  @Prop({ required: true, index: true, type: MongooseSchema.Types.ObjectId })
  userId!: Types.ObjectId;
  @Prop({ required: true, unique: true, index: true })
  tokenHash!: string;
  @Prop({ required: true, index: true })
  expiresAt!: Date;
  @Prop({ type: Date, default: null })
  consumedAt!: Date | null;
}

export const EmailVerificationSchema =
  SchemaFactory.createForClass(EmailVerification);
