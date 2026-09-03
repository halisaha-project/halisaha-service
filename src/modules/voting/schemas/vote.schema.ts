import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'votes' })
export class Vote {
  @Prop({ required: true, index: true, type: MongooseSchema.Types.ObjectId })
  matchId!: Types.ObjectId;
  @Prop({ required: true, index: true, type: MongooseSchema.Types.ObjectId })
  groupId!: Types.ObjectId;
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId })
  voterUserId!: Types.ObjectId;
  @Prop({ required: true, index: true, type: MongooseSchema.Types.ObjectId })
  targetUserId!: Types.ObjectId;
  @Prop({ required: true, min: 1, max: 5 }) score!: number;
}
export const VoteSchema = SchemaFactory.createForClass(Vote);
VoteSchema.index(
  { matchId: 1, voterUserId: 1, targetUserId: 1 },
  { unique: true },
);
VoteSchema.index({ matchId: 1, targetUserId: 1 });
