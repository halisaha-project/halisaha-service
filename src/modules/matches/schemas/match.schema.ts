import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum MatchStatus {
  DRAFT = 'draft',
  READY = 'ready',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
@Schema({ timestamps: true, collection: 'matches' })
export class Match {
  @Prop({ required: true, index: true, type: Types.ObjectId })
  groupId!: Types.ObjectId;
  @Prop({ required: true, type: Types.ObjectId })
  createdByUserId!: Types.ObjectId;
  @Prop({ required: true, trim: true, maxlength: 100 }) name!: string;
  @Prop({ required: true, index: true }) scheduledAt!: Date;
  @Prop({
    required: true,
    enum: MatchStatus,
    default: MatchStatus.DRAFT,
    index: true,
  })
  status!: MatchStatus;
  @Prop({ type: [Types.ObjectId], default: [] })
  participantUserIds!: Types.ObjectId[];
  @Prop({ type: [Types.ObjectId], default: [] })
  homeTeamUserIds!: Types.ObjectId[];
  @Prop({ type: [Types.ObjectId], default: [] })
  awayTeamUserIds!: Types.ObjectId[];
}
export const MatchSchema = SchemaFactory.createForClass(Match);
MatchSchema.index({ groupId: 1, scheduledAt: 1 });
