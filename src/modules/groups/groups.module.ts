import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { MailService } from '../../infrastructure/mail/mail.service';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { Group, GroupSchema } from './schemas/group.schema';
import {
  GroupInvitation,
  GroupInvitationSchema,
} from './schemas/group-invitation.schema';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: GroupInvitation.name, schema: GroupInvitationSchema },
    ]),
  ],
  controllers: [GroupsController],
  providers: [GroupsService, MailService],
  exports: [GroupsService],
})
export class GroupsModule {}
