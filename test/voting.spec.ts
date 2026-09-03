import { VotingService } from '../src/modules/voting/voting.service';
import { MatchesService } from '../src/modules/matches/matches.service';
import { Vote } from '../src/modules/voting/schemas/vote.schema';
import { Model, Types } from 'mongoose';

const participantMatch = {
  status: 'completed',
  participantUserIds: ['voter', 'target'],
};
function make(
  match = participantMatch,
  create = jest.fn().mockResolvedValue({
    _id: 'v',
    matchId: 'm',
    targetUserId: 'target',
    score: 4,
    createdAt: new Date(),
  }),
) {
  const matches = {
    findRequiredForVoting: jest.fn().mockResolvedValue(match),
  } as unknown as MatchesService;
  const model = {
    create,
    find: jest.fn(),
    aggregate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    }),
  } as unknown as Model<Vote>;
  return {
    service: new VotingService(model, matches),
    matches,
    create,
    aggregate: model.aggregate as jest.Mock,
  };
}

describe('VotingService', () => {
  it('derives voter identity and persists a safe vote', async () => {
    const h = make();
    await expect(
      h.service.create('g', 'm', { targetUserId: 'target', score: 4 }, 'voter'),
    ).resolves.toMatchObject({ score: 4 });
    expect(h.create).toHaveBeenCalledWith({
      matchId: 'm',
      groupId: 'g',
      voterUserId: 'voter',
      targetUserId: 'target',
      score: 4,
    });
  });
  it('rejects self votes, non-participants, and non-completed matches', async () => {
    await expect(
      make().service.create(
        'g',
        'm',
        { targetUserId: 'voter', score: 4 },
        'voter',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SELF_VOTE_NOT_ALLOWED' }),
    });
    await expect(
      make({
        status: 'completed',
        participantUserIds: ['target'],
      }).service.create(
        'g',
        'm',
        { targetUserId: 'target', score: 4 },
        'voter',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'VOTER_NOT_MATCH_PARTICIPANT',
      }),
    });
    await expect(
      make({
        status: 'draft',
        participantUserIds: ['voter', 'target'],
      }).service.create(
        'g',
        'm',
        { targetUserId: 'target', score: 4 },
        'voter',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'VOTING_NOT_ALLOWED' }),
    });
  });
  it('normalizes duplicate database errors', async () => {
    const h = make(
      participantMatch,
      jest.fn().mockRejectedValue({ code: 11000 }),
    );
    await expect(
      h.service.create('g', 'm', { targetUserId: 'target', score: 4 }, 'voter'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'VOTE_ALREADY_EXISTS' }),
    });
  });
  it('matches ObjectIds in the voting-results aggregation', async () => {
    const h = make();
    const groupId = '507f1f77bcf86cd799439011';
    const matchId = '507f1f77bcf86cd799439012';

    await h.service.results(groupId, matchId, 'voter');

    const pipeline = h.aggregate.mock.calls[0][0] as Array<{
      $match?: { groupId: Types.ObjectId; matchId: Types.ObjectId };
    }>;
    expect(pipeline[0].$match?.groupId).toBeInstanceOf(Types.ObjectId);
    expect(pipeline[0].$match?.groupId.toHexString()).toBe(groupId);
    expect(pipeline[0].$match?.matchId).toBeInstanceOf(Types.ObjectId);
    expect(pipeline[0].$match?.matchId.toHexString()).toBe(matchId);
  });
});
