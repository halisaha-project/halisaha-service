import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuthSessionDocument = HydratedDocument<AuthSession>;

@Schema({ timestamps: true, collection: 'auth_sessions' })
export class AuthSession {
  @Prop({ required: true, index: true, type: Types.ObjectId })
  userId!: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  sid!: string;

  @Prop({ required: true, unique: true, index: true })
  tokenHash!: string;

  @Prop({ required: true, index: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  revokedAt!: Date | null;
}

export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);
