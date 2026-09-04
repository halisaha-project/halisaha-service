import { Connection, Types, Schema } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  connectTestDatabase,
  clearDatabase,
  closeTestDatabase,
} from './database';
import { User, UserSchema } from '../../src/modules/users/schemas/user.schema';
import { UsersService } from '../../src/modules/users/users.service';
import {
  Group,
  GroupSchema,
} from '../../src/modules/groups/schemas/group.schema';
import {
  Match,
  MatchSchema,
  MatchStatus,
} from '../../src/modules/matches/schemas/match.schema';
import { Vote, VoteSchema } from '../../src/modules/voting/schemas/vote.schema';
import { MatchesService } from '../../src/modules/matches/matches.service';
import { VotingService } from '../../src/modules/voting/voting.service';
import { GroupsService } from '../../src/modules/groups/groups.service';

describe('real domain persistence', () => {
  let connection: Connection;
  beforeAll(async () => {
    connection = await connectTestDatabase();
  });
  afterEach(async () => clearDatabase(connection));
  afterAll(async () => closeTestDatabase(connection));

  it('persists normalized users and excludes passwordHash from normal serialization', async () => {
    const model = connection.model(User.name, UserSchema);
    const users = new UsersService(model);
    const user = await users.create({
      name: ' A ',
      surname: ' B ',
      username: ' Player ',
      email: ' PLAYER@EXAMPLE.COM ',
      passwordHash: await bcrypt.hash('password', 4),
    });
    expect(user.email).toBe('player@example.com');
    expect(user.username).toBe('player');
    const stored = await model.findById(user._id).exec();
    expect(stored?.passwordHash).toBeUndefined();
    const credentials =
      await users.findCredentialsByEmail('PLAYER@example.com');
    expect(credentials?.passwordHash).toBeDefined();
    expect(JSON.stringify(user)).not.toContain('passwordHash');
  });

  it('persists deterministic match teams and aggregate votes', async () => {
    const groupModel = connection.model(Group.name, GroupSchema);
    const matchModel = connection.model(Match.name, MatchSchema);
    const voteModel = connection.model(Vote.name, VoteSchema);
    const groups = new GroupsService(
      groupModel,
      {} as never,
      {} as UsersService,
      { sendGroupInvitation: jest.fn() } as never,
    );
    const matches = new MatchesService(matchModel, groups);
    const groupId = new Types.ObjectId().toString();
    const players = Array.from({ length: 4 }, () =>
      new Types.ObjectId().toString(),
    );
    await groupModel.create({
      _id: groupId,
      name: 'Group',
      ownerId: players[0],
      memberIds: players,
    });
    await matchModel.create({
      _id: new Types.ObjectId(),
      groupId,
      createdByUserId: players[0],
      name: 'Match',
      scheduledAt: new Date(),
      status: MatchStatus.DRAFT,
      participantUserIds: players,
      homeTeamUserIds: [],
      awayTeamUserIds: [],
    });
    const matchId = (await matchModel
      .findOne({ groupId })
      .exec())!._id.toString();
    await matches.generate(
      groupId,
      matchId,
      { formation: { GK: 0, DEF: 0, MID: 1, FWD: 0 } },
      players[0],
    );
    const saved = await matchModel.findById(matchId).exec();
    expect(
      [...saved!.homeTeamUserIds, ...saved!.awayTeamUserIds].map(String).sort(),
    ).toEqual(players.sort());
    await matchModel
      .updateOne({ _id: matchId }, { status: MatchStatus.COMPLETED })
      .exec();
    const voting = new VotingService(voteModel, matches);
    await voting.create(
      groupId,
      matchId,
      { targetUserId: players[1], score: 5 },
      players[0],
    );
    await voting.create(
      groupId,
      matchId,
      { targetUserId: players[1], score: 3 },
      players[2],
    );
    expect(
      (await voting.results(groupId, matchId, players[0])).results,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ averageScore: 4, voteCount: 2 }),
      ]),
    );
    await expect(
      voting.create(
        groupId,
        matchId,
        { targetUserId: players[1], score: 4 },
        players[0],
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'VOTE_ALREADY_EXISTS' }),
    });
  });

  it('allows only one concurrent atomic session claim', async () => {
    const model = connection.model(
      'IntegrationSession',
      new Schema({
        sid: String,
        tokenHash: String,
        revokedAt: Date,
        expiresAt: Date,
      }),
    );
    await model.create({
      sid: 'session',
      tokenHash: 'hash',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60000),
    });
    const filter = {
      sid: 'session',
      tokenHash: 'hash',
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    };
    const results = await Promise.all(
      [1, 2].map(() =>
        model
          .findOneAndUpdate(
            filter,
            { $set: { revokedAt: new Date() } },
            { new: true },
          )
          .exec(),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
