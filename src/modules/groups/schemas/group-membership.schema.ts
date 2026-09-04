import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { POSITION_ABBREVIATIONS } from '../../positions/positions.service';

@Schema({ timestamps: true, collection: 'group_memberships' })
export class GroupMembership {
  @Prop({ required: true, index: true, type: MongooseSchema.Types.ObjectId })
  groupId!: Types.ObjectId;

  @Prop({ required: true, index: true, type: MongooseSchema.Types.ObjectId })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: String, enum: POSITION_ABBREVIATIONS })
  mainPosition!: string;

  @Prop({ required: true, type: String, enum: POSITION_ABBREVIATIONS })
  altPosition!: string;

  @Prop({ required: true, min: 1, max: 99 })
  shirtNumber!: number;
}

export const GroupMembershipSchema =
  SchemaFactory.createForClass(GroupMembership);
GroupMembershipSchema.index({ groupId: 1, userId: 1 }, { unique: true });
