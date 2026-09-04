import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { ApplicationException } from '../../common/errors/application.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { MailService } from '../../infrastructure/mail/mail.service';
import { UsersService } from '../users/users.service';
import {
  CreateGroupDto,
  GroupMemberResponseDto,
  GroupNameDto,
  GroupResponseDto,
} from './dto/group.dto';
import {
  AcceptInvitationDto,
  InvitationCreatedResponseDto,
  InviteUserDto,
} from './dto/invitation.dto';
import { Group } from './schemas/group.schema';
import { GroupInvitation } from './schemas/group-invitation.schema';
import { GroupMembership } from './schemas/group-membership.schema';
import { SafeUserIdentity } from '../users/users.service';

export interface MembershipProfile {
  userId: string;
  mainPosition: string;
  altPosition: string;
  shirtNumber: number;
}

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
    @InjectModel(GroupInvitation.name)
    private readonly invitationModel: Model<GroupInvitation>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    @InjectModel(GroupMembership.name)
    private readonly membershipModel?: Model<GroupMembership>,
    private readonly configService: ConfigService = new ConfigService(),
  ) {}

  async create(dto: CreateGroupDto, userId: string): Promise<GroupResponseDto> {
    const group = await this.groupModel.create({
      name: dto.groupName.trim(),
      ownerId: userId,
      memberIds: [userId],
    });
    if (this.membershipModel) {
      await this.membershipModel.create({
        groupId: (group as Group & { _id: unknown })._id,
        userId,
        mainPosition: dto.mainPosition,
        altPosition: dto.altPosition,
        shirtNumber: dto.shirtNumber,
      });
    }
    return this.safe(group);
  }

  async assertMember(groupId: string, userId: string): Promise<Group> {
    const group = await this.required(groupId);
    this.requireMember(group, userId);
    return group;
  }

  async assertOwner(groupId: string, userId: string): Promise<Group> {
    const group = await this.required(groupId);
    this.requireOwner(group, userId);
    return group;
  }

  async list(userId: string): Promise<GroupResponseDto[]> {
    const groups = await this.groupModel.find({ memberIds: userId }).exec();
    return Promise.all(groups.map((group) => this.safe(group)));
  }

  async get(groupId: string, userId: string): Promise<GroupResponseDto> {
    const group = await this.required(groupId);
    this.requireMember(group, userId);
    return this.safe(group);
  }

  async findMembershipProfilesByUserIds(
    groupId: string,
    userIds: string[],
  ): Promise<MembershipProfile[]> {
    if (!this.membershipModel || userIds.length === 0) return [];
    const memberships = await this.membershipModel
      .find({ groupId, userId: { $in: userIds } })
      .select({
        _id: 0,
        userId: 1,
        mainPosition: 1,
        altPosition: 1,
        shirtNumber: 1,
      })
      .lean()
      .exec();
    return memberships.map((membership) => ({
      userId: String(membership.userId),
      mainPosition: membership.mainPosition,
      altPosition: membership.altPosition,
      shirtNumber: membership.shirtNumber,
    }));
  }

  findSafeUserIdentitiesByIds(ids: string[]): Promise<SafeUserIdentity[]> {
    return this.usersService.findSafeIdentitiesByIds(ids);
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
  ): Promise<InvitationCreatedResponseDto> {
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
    const code = await this.createInvitationWithUniqueCode({
      groupId,
      invitedUserId: target._id,
      invitedByUserId: userId,
      token,
    });
    await this.mailService.sendGroupInvitation({
      recipientEmail: target.email,
      groupName: group.name,
      token,
      code,
    });
    return {
      invited: true,
      ...(this.configService.get<string>('nodeEnv') === 'development'
        ? { developmentToken: token, developmentCode: code }
        : {}),
    };
  }

  async accept(
    dto: AcceptInvitationDto,
    userId: string,
  ): Promise<{ accepted: true }> {
    if ((!dto.token && !dto.code) || (dto.token && dto.code)) {
      throw new ApplicationException(
        400,
        ErrorCode.INVALID_GROUP_INVITATION,
        'Exactly one invitation credential is required',
      );
    }
    if (
      this.membershipModel &&
      (!dto.mainPosition || !dto.altPosition || dto.shirtNumber === undefined)
    ) {
      throw new ApplicationException(
        400,
        ErrorCode.BAD_REQUEST,
        'Membership profile is required',
      );
    }
    const now = new Date();
    const invitation = await this.invitationModel
      .findOneAndUpdate(
        {
          ...(dto.code
            ? { codeHash: this.hash(dto.code) }
            : { tokenHash: this.hash(dto.token!) }),
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
    if (this.membershipModel) {
      await this.membershipModel.findOneAndUpdate(
        { groupId: invitation.groupId, userId },
        {
          $setOnInsert: {
            mainPosition: dto.mainPosition,
            altPosition: dto.altPosition,
            shirtNumber: dto.shirtNumber,
          },
        },
        { upsert: true, new: true },
      );
    }
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
  private async createInvitationWithUniqueCode(data: {
    groupId: string;
    invitedUserId: unknown;
    invitedByUserId: string;
    token: string;
  }): Promise<string> {
    let lastCollision: unknown;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
      try {
        await this.invitationModel.create({
          groupId: data.groupId,
          invitedUserId: data.invitedUserId,
          invitedByUserId: data.invitedByUserId,
          tokenHash: this.hash(data.token),
          codeHash: this.hash(code),
          expiresAt: new Date(Date.now() + 7 * 86400000),
          acceptedAt: null,
          revokedAt: null,
        });
        return code;
      } catch (error: unknown) {
        if (!this.isCodeHashCollision(error)) throw error;
        lastCollision = error;
      }
    }
    throw lastCollision;
  }

  private isCodeHashCollision(error: unknown): boolean {
    const mongoError = error as {
      code?: number;
      keyPattern?: Record<string, number>;
    };
    return mongoError.code === 11000 && mongoError.keyPattern?.codeHash === 1;
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
  private async safe(group: Group): Promise<GroupResponseDto> {
    const value = group as Group & {
      _id: unknown;
      createdAt: Date;
      updatedAt: Date;
    };
    const memberships = this.membershipModel
      ? await this.membershipModel
          .find({ groupId: value._id })
          .select({
            _id: 0,
            userId: 1,
            mainPosition: 1,
            altPosition: 1,
            shirtNumber: 1,
          })
          .lean()
          .exec()
      : [];
    const memberIds = value.memberIds.map(String);
    const users = await this.usersService.findSafeIdentitiesByIds(memberIds);
    const usersById = new Map(users.map((user) => [user.id, user]));
    const membershipsByUserId = new Map(
      memberships.map((membership) => [String(membership.userId), membership]),
    );
    const members: GroupMemberResponseDto[] = memberIds.map((userId) => {
      const user = usersById.get(userId);
      const membership = membershipsByUserId.get(userId);
      return {
        userId,
        ...(user ? { name: user.name, surname: user.surname } : {}),
        ...(membership
          ? {
              mainPosition: membership.mainPosition,
              altPosition: membership.altPosition,
              shirtNumber: membership.shirtNumber,
            }
          : {}),
      };
    });
    return {
      id: String(value._id),
      name: value.name,
      ownerId: String(value.ownerId),
      memberIds: value.memberIds.map(String),
      members,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }
  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
