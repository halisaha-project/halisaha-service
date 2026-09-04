import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { POSITION_ABBREVIATIONS } from '../../positions/positions.service';
import type {
  FootballPosition,
  TeamFormation,
} from '../team-generator.service';

export enum MatchStatus {
  DRAFT = 'draft',
  READY = 'ready',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Schema({ _id: false })
export class MatchLineupPlayer {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: String, enum: POSITION_ABBREVIATIONS })
  assignedPosition!: FootballPosition;

  @Prop({ required: true, min: 1, max: 99 })
  shirtNumber!: number;
}

const MatchLineupPlayerSchema = SchemaFactory.createForClass(MatchLineupPlayer);

@Schema({ _id: false })
export class MatchFormation implements TeamFormation {
  @Prop({ required: true, min: 0 }) GK!: number;
  @Prop({ required: true, min: 0 }) DEF!: number;
  @Prop({ required: true, min: 0 }) MID!: number;
  @Prop({ required: true, min: 0 }) FWD!: number;
}
const MatchFormationSchema = SchemaFactory.createForClass(MatchFormation);

@Schema({ timestamps: true, collection: 'matches' })
export class Match {
  @Prop({ required: true, index: true, type: MongooseSchema.Types.ObjectId })
  groupId!: Types.ObjectId;
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId })
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
  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] })
  participantUserIds!: Types.ObjectId[];
  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] })
  homeTeamUserIds!: Types.ObjectId[];
  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] })
  awayTeamUserIds!: Types.ObjectId[];
  @Prop({ type: [MatchLineupPlayerSchema], default: [] })
  homeLineup!: MatchLineupPlayer[];
  @Prop({ type: [MatchLineupPlayerSchema], default: [] })
  awayLineup!: MatchLineupPlayer[];
  @Prop({ type: MatchFormationSchema, default: null })
  formation!: MatchFormation | null;
}
export const MatchSchema = SchemaFactory.createForClass(Match);
MatchSchema.index({ groupId: 1, scheduledAt: 1 });
