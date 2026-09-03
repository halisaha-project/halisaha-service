import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApplicationException } from '../../common/errors/application.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { MatchesService } from '../matches/matches.service';
import { CreateVoteDto, VoteResponseDto } from './dto/vote.dto';
import { Vote } from './schemas/vote.schema';

@Injectable()
export class VotingService {
  constructor(
    @InjectModel(Vote.name) private readonly model: Model<Vote>,
    private readonly matches: MatchesService,
  ) {}
  async create(
    groupId: string,
    matchId: string,
    dto: CreateVoteDto,
    voterId: string,
  ): Promise<VoteResponseDto> {
    const match = await this.matches.findRequiredForVoting(
      groupId,
      matchId,
      voterId,
    );
    if (match.status !== 'completed')
      throw new ApplicationException(
        400,
        ErrorCode.VOTING_NOT_ALLOWED,
        'Voting is not allowed',
      );
    const participants = match.participantUserIds.map(String);
    if (!participants.includes(voterId))
      throw new ApplicationException(
        403,
        ErrorCode.VOTER_NOT_MATCH_PARTICIPANT,
        'Voter did not participate',
      );
    if (!participants.includes(dto.targetUserId))
      throw new ApplicationException(
        400,
        ErrorCode.TARGET_NOT_MATCH_PARTICIPANT,
        'Target did not participate',
      );
    if (voterId === dto.targetUserId)
      throw new ApplicationException(
        400,
        ErrorCode.SELF_VOTE_NOT_ALLOWED,
        'Self voting is not allowed',
      );
    try {
      return this.safe(
        await this.model.create({
          matchId,
          groupId,
          voterUserId: voterId,
          targetUserId: dto.targetUserId,
          score: dto.score,
        }),
      );
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: number }).code === 11000
      )
        throw new ApplicationException(
          409,
          ErrorCode.VOTE_ALREADY_EXISTS,
          'Vote already exists',
        );
      throw error;
    }
  }
  async list(groupId: string, matchId: string, userId: string) {
    await this.matches.findRequiredForVoting(groupId, matchId, userId);
    return (
      await this.model
        .find({ groupId, matchId })
        .sort({ createdAt: 1, _id: 1 })
        .exec()
    ).map((vote) => this.safe(vote));
  }
  async results(groupId: string, matchId: string, userId: string) {
    await this.matches.findRequiredForVoting(groupId, matchId, userId);
    return {
      results: await this.model
        .aggregate([
          {
            $match: {
              groupId: new Types.ObjectId(groupId),
              matchId: new Types.ObjectId(matchId),
            },
          },
          {
            $group: {
              _id: '$targetUserId',
              averageScore: { $avg: '$score' },
              voteCount: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: { _id: 0, userId: '$_id', averageScore: 1, voteCount: 1 },
          },
        ])
        .exec(),
    };
  }
  private safe(vote: Vote): VoteResponseDto {
    const value = vote as Vote & { _id: unknown; createdAt: Date };
    return {
      id: String(value._id),
      matchId: String(value.matchId),
      targetUserId: String(value.targetUserId),
      score: value.score,
      createdAt: value.createdAt,
    };
  }
}
