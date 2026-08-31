import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  surname!: string;

  @Prop({ required: true, trim: true, lowercase: true, unique: true })
  username!: string;

  @Prop({ required: true, trim: true, lowercase: true, unique: true })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ required: true, default: false })
  emailVerified!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.set('toJSON', {
  transform: (_document, returned) => {
    const serialized = returned as unknown as Record<string, unknown>;
    serialized.id = String(serialized._id);
    delete serialized._id;
    delete serialized.__v;
    delete serialized.passwordHash;
    return serialized;
  },
});
