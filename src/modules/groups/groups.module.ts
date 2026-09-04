import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { Group, GroupSchema } from './schemas/group.schema';
import {
  GroupInvitation,
  GroupInvitationSchema,
} from './schemas/group-invitation.schema';
import {
  GroupMembership,
  GroupMembershipSchema,
} from './schemas/group-membership.schema';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: GroupInvitation.name, schema: GroupInvitationSchema },
      { name: GroupMembership.name, schema: GroupMembershipSchema },
    ]),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
