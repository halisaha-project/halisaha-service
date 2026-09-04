import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GroupsService } from '../groups/groups.service';
import { ApplicationException } from '../../common/errors/application.exception';
import { ErrorCode } from '../../common/errors/error-code';
import {
  CreateMatchDto,
  MatchResponseDto,
  ParticipantsDto,
  UpdateMatchDto,
} from './dto/match.dto';
import { Match, MatchStatus } from './schemas/match.schema';

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private readonly model: Model<Match>,
    private readonly groups: GroupsService,
  ) {}

  async findRequiredForVoting(
    groupId: string,
    matchId: string,
    userId: string,
  ): Promise<Match> {
    await this.groups.assertMember(groupId, userId);
    const match = await this.model.findOne({ _id: matchId, groupId }).exec();
    if (!match)
      throw new ApplicationException(
        404,
        ErrorCode.MATCH_NOT_FOUND,
        'Match not found',
      );
    return match;
  }
  async updateStatus(
    groupId: string,
    matchId: string,
    status: string,
    userId: string,
  ) {
    await this.groups.assertOwner(groupId, userId);
    if (status !== MatchStatus.COMPLETED)
      throw new ApplicationException(
        400,
        ErrorCode.INVALID_MATCH_STATE,
        'Invalid match state',
      );
    const match = await this.model
      .findOneAndUpdate(
        { _id: matchId, groupId, status: MatchStatus.READY },
        { status },
        { new: true },
      )
      .exec();
    if (!match)
      throw new ApplicationException(
        400,
        ErrorCode.INVALID_MATCH_STATE,
        'Invalid match state',
      );
    return this.safe(match);
  }
  async create(groupId: string, dto: CreateMatchDto, userId: string) {
    await this.groups.assertOwner(groupId, userId);
    return this.safe(
      await this.model.create({
        groupId,
        createdByUserId: userId,
        name: dto.name.trim(),
        scheduledAt: new Date(dto.scheduledAt),
        status: MatchStatus.DRAFT,
        participantUserIds: [],
        homeTeamUserIds: [],
        awayTeamUserIds: [],
      }),
    );
  }
  async list(groupId: string, userId: string) {
    await this.groups.assertMember(groupId, userId);
    return (
      await this.model.find({ groupId }).sort({ scheduledAt: 1, _id: 1 }).exec()
    ).map((m) => this.safe(m));
  }
  async listForUser(userId: string) {
    return (
      await this.model
        .find({ participantUserIds: userId })
        .sort({ scheduledAt: 1, _id: 1 })
        .exec()
    ).map((m) => this.safe(m));
  }
  async get(groupId: string, matchId: string, userId: string) {
    await this.groups.assertMember(groupId, userId);
    const m = await this.model.findOne({ _id: matchId, groupId }).exec();
    if (!m)
      throw new ApplicationException(
        404,
        ErrorCode.MATCH_NOT_FOUND,
        'Match not found',
      );
    return this.safe(m);
  }
  async update(
    groupId: string,
    matchId: string,
    dto: UpdateMatchDto,
    userId: string,
  ) {
    await this.groups.assertOwner(groupId, userId);
    const m = await this.model
      .findOneAndUpdate(
        { _id: matchId, groupId },
        {
          ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
          ...(dto.scheduledAt === undefined
            ? {}
            : { scheduledAt: new Date(dto.scheduledAt) }),
        },
        { new: true },
      )
      .exec();
    if (!m)
      throw new ApplicationException(
        404,
        ErrorCode.MATCH_NOT_FOUND,
        'Match not found',
      );
    return this.safe(m);
  }
  async remove(groupId: string, matchId: string, userId: string) {
    await this.groups.assertOwner(groupId, userId);
    const r = await this.model.deleteOne({ _id: matchId, groupId }).exec();
    if (!r.deletedCount)
      throw new ApplicationException(
        404,
        ErrorCode.MATCH_NOT_FOUND,
        'Match not found',
      );
    return { deleted: true as const };
  }
  async participants(
    groupId: string,
    matchId: string,
    dto: ParticipantsDto,
    userId: string,
  ) {
    const group = await this.groups.assertOwner(groupId, userId);
    const ids = [...new Set(dto.participantUserIds)];
    if (
      ids.length < 2 ||
      ids.length > 30 ||
      ids.some((id) => !group.memberIds.some((m) => String(m) === id))
    )
      throw new ApplicationException(
        400,
        ErrorCode.INVALID_MATCH_STATE,
        'Invalid participants',
      );
    const m = await this.model
      .findOneAndUpdate(
        { _id: matchId, groupId },
        {
          participantUserIds: ids,
          homeTeamUserIds: [],
          awayTeamUserIds: [],
          status: MatchStatus.DRAFT,
        },
        { new: true },
      )
      .exec();
    if (!m)
      throw new ApplicationException(
        404,
        ErrorCode.MATCH_NOT_FOUND,
        'Match not found',
      );
    return this.safe(m);
  }
  async generate(groupId: string, matchId: string, userId: string) {
    await this.groups.assertOwner(groupId, userId);
    const current = await this.model.findOne({ _id: matchId, groupId }).exec();
    if (!current)
      throw new ApplicationException(
        404,
        ErrorCode.MATCH_NOT_FOUND,
        'Match not found',
      );
    if (
      current.status === MatchStatus.CANCELLED ||
      current.status === MatchStatus.COMPLETED ||
      current.participantUserIds.length < 2 ||
      current.participantUserIds.length % 2
    )
      throw new ApplicationException(
        400,
        ErrorCode.INVALID_MATCH_STATE,
        'Invalid match state',
      );
    const sorted = current.participantUserIds.map(String).sort();
    const home = sorted.filter((_, i) => i % 2 === 0);
    const away = sorted.filter((_, i) => i % 2 === 1);
    const updated = await this.model
      .findOneAndUpdate(
        {
          _id: matchId,
          groupId,
          status: { $nin: [MatchStatus.CANCELLED, MatchStatus.COMPLETED] },
        },
        {
          homeTeamUserIds: home,
          awayTeamUserIds: away,
          status: MatchStatus.READY,
        },
        { new: true },
      )
      .exec();
    if (!updated)
      throw new ApplicationException(
        400,
        ErrorCode.INVALID_MATCH_STATE,
        'Invalid match state',
      );
    return this.safe(updated);
  }
  private safe(m: Match): MatchResponseDto {
    const v = m as Match & { _id: unknown; createdAt: Date; updatedAt: Date };
    return {
      id: String(v._id),
      groupId: String(v.groupId),
      createdByUserId: String(v.createdByUserId),
      name: v.name,
      scheduledAt: v.scheduledAt,
      status: v.status,
      participantUserIds: v.participantUserIds.map(String),
      homeTeamUserIds: v.homeTeamUserIds.map(String),
      awayTeamUserIds: v.awayTeamUserIds.map(String),
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    };
  }
}
