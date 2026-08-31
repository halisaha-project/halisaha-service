import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PositionDocument = HydratedDocument<Position>;

@Schema({ timestamps: true, collection: 'positions' })
export class Position {
  @Prop({ required: true, trim: true, unique: true })
  name!: string;

  @Prop({ required: true, trim: true, uppercase: true, unique: true })
  abbreviation!: string;
}

export const PositionSchema = SchemaFactory.createForClass(Position);
PositionSchema.set('toJSON', {
  transform: (_document, returned) => {
    const serialized = returned as unknown as Record<string, unknown>;
    serialized.id = String(serialized._id);
    delete serialized._id;
    delete serialized.__v;
    return serialized;
  },
});
