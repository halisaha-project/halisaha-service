import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GroupsService } from '../groups/groups.service';
import { ApplicationException } from '../../common/errors/application.exception';
import { ErrorCode } from '../../common/errors/error-code';
import {
  CreateMatchDto,
  GenerateTeamsDto,
  MatchResponseDto,
  ParticipantsDto,
  UpdateMatchDto,
} from './dto/match.dto';
import { Match, MatchStatus } from './schemas/match.schema';
import {
  FootballPosition,
  GeneratedLineupPlayer,
  TeamGeneratorService,
} from './team-generator.service';

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private readonly model: Model<Match>,
    private readonly groups: GroupsService,
    private readonly teamGenerator: TeamGeneratorService = new TeamGeneratorService(),
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
        homeLineup: [],
        awayLineup: [],
        formation: null,
      }),
    );
  }
  async list(groupId: string, userId: string) {
    await this.groups.assertMember(groupId, userId);
    const matches = await this.model
      .find({ groupId })
      .sort({ scheduledAt: 1, _id: 1 })
      .exec();
    return Promise.all(matches.map((match) => this.safe(match)));
  }
  async listForUser(userId: string) {
    const matches = await this.model
      .find({ participantUserIds: userId })
      .sort({ scheduledAt: 1, _id: 1 })
      .exec();
    return Promise.all(matches.map((match) => this.safe(match)));
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
          homeLineup: [],
          awayLineup: [],
          formation: null,
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
  async generate(
    groupId: string,
    matchId: string,
    dto: GenerateTeamsDto,
    userId: string,
  ) {
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
    const formationSize = Object.values(dto.formation).reduce(
      (total, count) => total + count,
      0,
    );
    if (formationSize !== current.participantUserIds.length / 2) {
      throw new ApplicationException(
        400,
        ErrorCode.INVALID_MATCH_FORMATION,
        'Formation size must equal team size',
        undefined,
        'Diziliş toplamı takım oyuncu sayısıyla eşleşmelidir.',
      );
    }
    const participantIds = current.participantUserIds.map(String);
    const memberships = await this.groups.findMembershipProfilesByUserIds(
      groupId,
      participantIds,
    );
    const membershipsByUserId = new Map(
      memberships.map((membership) => [membership.userId, membership]),
    );
    if (participantIds.some((id) => !membershipsByUserId.has(id))) {
      throw new ApplicationException(
        409,
        ErrorCode.MATCH_MEMBERSHIP_PROFILE_MISSING,
        'Match participant membership profile is missing',
        undefined,
        'Bazı oyuncuların grup üyelik bilgileri eksik.',
      );
    }
    const generated = this.teamGenerator.generate(
      participantIds.map((id) => {
        const membership = membershipsByUserId.get(id)!;
        return {
          userId: id,
          mainPosition: membership.mainPosition as FootballPosition,
          altPosition: membership.altPosition as FootballPosition,
          shirtNumber: membership.shirtNumber,
        };
      }),
      dto.formation,
    );
    const home = generated.home.map((player) => player.userId);
    const away = generated.away.map((player) => player.userId);
    const updated = await this.model
      .findOneAndUpdate(
        {
          _id: matchId,
          groupId,
          participantUserIds: current.participantUserIds,
          status: { $nin: [MatchStatus.CANCELLED, MatchStatus.COMPLETED] },
        },
        {
          homeTeamUserIds: home,
          awayTeamUserIds: away,
          homeLineup: generated.home,
          awayLineup: generated.away,
          formation: dto.formation,
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
  private async safe(m: Match): Promise<MatchResponseDto> {
    const v = m as Match & { _id: unknown; createdAt: Date; updatedAt: Date };
    const homeLineup = this.safeLineup(v.homeLineup ?? []);
    const awayLineup = this.safeLineup(v.awayLineup ?? []);
    const lineupIds = [...homeLineup, ...awayLineup].map(
      (player) => player.userId,
    );
    const identities =
      lineupIds.length === 0
        ? []
        : await this.groups.findSafeUserIdentitiesByIds(lineupIds);
    const identitiesById = new Map(identities.map((user) => [user.id, user]));
    const enrich = (players: GeneratedLineupPlayer[]) =>
      players.map((player) => {
        const identity = identitiesById.get(player.userId);
        return {
          ...player,
          ...(identity
            ? { name: identity.name, surname: identity.surname }
            : {}),
        };
      });
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
      formation: v.formation
        ? {
            GK: v.formation.GK,
            DEF: v.formation.DEF,
            MID: v.formation.MID,
            FWD: v.formation.FWD,
          }
        : null,
      homeLineup,
      awayLineup,
      homeTeam: { players: enrich(homeLineup) },
      awayTeam: { players: enrich(awayLineup) },
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    };
  }

  private safeLineup(lineup: Match['homeLineup']): GeneratedLineupPlayer[] {
    return lineup.map((player) => ({
      userId: String(player.userId),
      assignedPosition: player.assignedPosition,
      shirtNumber: player.shirtNumber,
    }));
  }
}
