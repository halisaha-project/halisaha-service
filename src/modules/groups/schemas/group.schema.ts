import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'groups' })
export class Group {
  @Prop({ required: true, trim: true, minlength: 1, maxlength: 100 })
  name!: string;
  @Prop({ required: true, index: true, type: Types.ObjectId })
  ownerId!: Types.ObjectId;
  @Prop({ required: true, index: true, type: [Types.ObjectId] })
  memberIds!: Types.ObjectId[];
}
export const GroupSchema = SchemaFactory.createForClass(Group);
