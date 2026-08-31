import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';
import { ApplicationException } from '../../common/errors/application.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { MailService } from '../../infrastructure/mail/mail.service';
import { UsersService } from '../users/users.service';
import { GroupNameDto, GroupResponseDto } from './dto/group.dto';
import { AcceptInvitationDto, InviteUserDto } from './dto/invitation.dto';
import { Group } from './schemas/group.schema';
import { GroupInvitation } from './schemas/group-invitation.schema';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(GroupInvitation.name)
    private readonly invitationModel: Model<GroupInvitation>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  async create(dto: GroupNameDto, userId: string): Promise<GroupResponseDto> {
    const group = await this.groupModel.create({
      name: dto.name.trim(),
      ownerId: userId,
      memberIds: [userId],
    });
    return this.safe(group);
  }

  async list(userId: string): Promise<GroupResponseDto[]> {
    const groups = await this.groupModel.find({ memberIds: userId }).exec();
    return groups.map((group) => this.safe(group));
  }

  async get(groupId: string, userId: string): Promise<GroupResponseDto> {
    const group = await this.required(groupId);
    this.requireMember(group, userId);
    return this.safe(group);
  }

  async update(
    groupId: string,
    dto: GroupNameDto,
    userId: string,
  ): Promise<GroupResponseDto> {
    const group = await this.required(groupId);
    this.requireOwner(group, userId);
    const updated = await this.groupModel
      .findByIdAndUpdate(groupId, { name: dto.name.trim() }, { new: true })
      .exec();
    return this.safe(updated!);
  }

  async remove(groupId: string, userId: string): Promise<{ deleted: true }> {
    const group = await this.required(groupId);
    this.requireOwner(group, userId);
    await this.groupModel.deleteOne({ _id: groupId }).exec();
    await this.invitationModel
      .updateMany(
        { groupId, acceptedAt: null, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      )
      .exec();
    return { deleted: true };
  }

  async invite(
    groupId: string,
    dto: InviteUserDto,
    userId: string,
  ): Promise<{ invited: true }> {
    const group = await this.required(groupId);
    this.requireOwner(group, userId);
    const target = await this.usersService.findByEmail(dto.email);
    if (!target)
      throw new ApplicationException(
        404,
        ErrorCode.GROUP_INVITED_USER_NOT_FOUND,
        'Invited user not found',
      );
    if (group.memberIds.some((id) => String(id) === String(target._id)))
      throw new ApplicationException(
        409,
        ErrorCode.GROUP_MEMBER_ALREADY_EXISTS,
        'User is already a group member',
      );
    await this.invitationModel
      .updateMany(
        {
          groupId,
          invitedUserId: target._id,
          acceptedAt: null,
          revokedAt: null,
        },
        { $set: { revokedAt: new Date() } },
      )
      .exec();
    const token = randomBytes(32).toString('hex');
    await this.invitationModel.create({
      groupId,
      invitedUserId: target._id,
      invitedByUserId: userId,
      tokenHash: this.hash(token),
      expiresAt: new Date(Date.now() + 7 * 86400000),
      acceptedAt: null,
      revokedAt: null,
    });
    await this.mailService.sendGroupInvitation(target.email, token);
    return { invited: true };
  }

  async accept(
    dto: AcceptInvitationDto,
    userId: string,
  ): Promise<{ accepted: true }> {
    const now = new Date();
    const invitation = await this.invitationModel
      .findOneAndUpdate(
        {
          tokenHash: this.hash(dto.token),
          invitedUserId: userId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { $gt: now },
        },
        { $set: { acceptedAt: now } },
        { new: true },
      )
      .exec();
    if (!invitation)
      throw new ApplicationException(
        400,
        ErrorCode.INVALID_GROUP_INVITATION,
        'Invalid group invitation',
      );
    await this.groupModel
      .updateOne(
        { _id: invitation.groupId },
        { $addToSet: { memberIds: userId } },
      )
      .exec();
    return { accepted: true };
  }

  private async required(id: string): Promise<Group> {
    const group = await this.groupModel.findById(id).exec();
    if (!group)
      throw new ApplicationException(
        404,
        ErrorCode.GROUP_NOT_FOUND,
        'Group not found',
      );
    return group;
  }
  private requireMember(group: Group, userId: string): void {
    if (!group.memberIds.some((id) => String(id) === userId))
      throw new ApplicationException(
        403,
        ErrorCode.GROUP_ACCESS_DENIED,
        'Group access denied',
      );
  }
  private requireOwner(group: Group, userId: string): void {
    if (String(group.ownerId) !== userId)
      throw new ApplicationException(
        403,
        ErrorCode.GROUP_ACCESS_DENIED,
        'Group access denied',
      );
  }
  private safe(group: Group): GroupResponseDto {
    const value = group as Group & {
      _id: unknown;
      createdAt: Date;
      updatedAt: Date;
    };
    return {
      id: String(value._id),
      name: value.name,
      ownerId: String(value.ownerId),
      memberIds: value.memberIds.map(String),
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }
  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
