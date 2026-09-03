import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'group_invitations' })
export class GroupInvitation {
  @Prop({ required: true, index: true, type: MongooseSchema.Types.ObjectId })
  groupId!: Types.ObjectId;
  @Prop({ required: true, index: true, type: MongooseSchema.Types.ObjectId })
  invitedUserId!: Types.ObjectId;
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId })
  invitedByUserId!: Types.ObjectId;
  @Prop({ required: true, unique: true, index: true }) tokenHash!: string;
  @Prop({ required: true, index: true }) expiresAt!: Date;
  @Prop({ type: Date, default: null }) acceptedAt!: Date | null;
  @Prop({ type: Date, default: null }) revokedAt!: Date | null;
}
export const GroupInvitationSchema =
  SchemaFactory.createForClass(GroupInvitation);
