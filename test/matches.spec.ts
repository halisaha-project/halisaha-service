import { MatchesService } from '../src/modules/matches/matches.service';
import { MatchStatus } from '../src/modules/matches/schemas/match.schema';
import { GroupsService } from '../src/modules/groups/groups.service';
import { Model } from 'mongoose';
import { Match } from '../src/modules/matches/schemas/match.schema';
import { MatchesMeController } from '../src/modules/matches/matches.controller';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';

const ids = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    `0000000000000000000000${String(i + 1).padStart(2, '0')}`.slice(-24),
  );
const match = (participants: string[], status = MatchStatus.DRAFT) => ({
  _id: 'match',
  groupId: 'group',
  createdByUserId: 'owner',
  name: 'Match',
  scheduledAt: new Date(),
  status,
  participantUserIds: participants,
  homeTeamUserIds: [],
  awayTeamUserIds: [],
  homeLineup: [],
  awayLineup: [],
  formation: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

function serviceFor(group = { ownerId: 'owner', memberIds: ids(30) }) {
  const create = jest.fn();
  const find = jest.fn();
  const findOne = jest.fn();
  const findOneAndUpdate = jest.fn();
  const deleteOne = jest.fn();
  const model = {
    create,
    find,
    findOne,
    findOneAndUpdate,
    deleteOne,
  } as unknown as Model<Match>;
  const groups = {
    assertOwner: jest.fn().mockResolvedValue(group),
    assertMember: jest.fn().mockResolvedValue(group),
    findMembershipProfilesByUserIds: jest
      .fn()
      .mockImplementation(async (_groupId: string, userIds: string[]) =>
        userIds.map((userId, index) => ({
          userId,
          mainPosition: index < 2 ? 'GK' : index % 2 ? 'DEF' : 'MID',
          altPosition: index < 2 ? 'GK' : 'FWD',
          shirtNumber: index + 1,
        })),
      ),
    findSafeUserIdentitiesByIds: jest
      .fn()
      .mockImplementation(async (userIds: string[]) =>
        userIds.map((id) => ({ id, name: `Name-${id}`, surname: 'Surname' })),
      ),
  } as unknown as GroupsService;
  return {
    service: new MatchesService(model, groups),
    model,
    groups,
    create,
    find,
    findOne,
    findOneAndUpdate,
    deleteOne,
  };
}

describe('MatchesService', () => {
  it('lists only matches containing the authenticated participant in scheduled order', async () => {
    const h = serviceFor();
    const participantMatch = match(['current-user']);
    const exec = jest.fn().mockResolvedValue([participantMatch]);
    const sort = jest.fn().mockReturnValue({ exec });
    h.find.mockReturnValue({ sort });

    await expect(h.service.listForUser('current-user')).resolves.toEqual([
      expect.objectContaining({ name: 'Match' }),
    ]);
    expect(h.find).toHaveBeenCalledWith({
      participantUserIds: 'current-user',
    });
    expect(sort).toHaveBeenCalledWith({ scheduledAt: 1, _id: 1 });
  });

  it('returns an empty array when the authenticated user has no matches', async () => {
    const h = serviceFor();
    const exec = jest.fn().mockResolvedValue([]);
    h.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec }),
    });

    await expect(h.service.listForUser('current-user')).resolves.toEqual([]);
  });

  it('gets the match-list identity only from the authenticated user', async () => {
    const listForUser = jest.fn().mockResolvedValue([]);
    const controller = new MatchesMeController({ listForUser } as never);

    await expect(
      controller.listMine({ userId: 'authenticated-user' }),
    ).resolves.toEqual([]);
    expect(listForUser).toHaveBeenCalledWith('authenticated-user');
    expect(Reflect.getMetadata(GUARDS_METADATA, MatchesMeController)).toContain(
      JwtAuthGuard,
    );
  });

  it("atomically transitions an owner's ready match to completed", async () => {
    const h = serviceFor();
    h.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(match(ids(2), MatchStatus.COMPLETED)),
    });

    const result = await h.service.updateStatus(
      'group',
      'match',
      MatchStatus.COMPLETED,
      'owner',
    );

    expect(h.groups.assertOwner).toHaveBeenCalledWith('group', 'owner');
    expect(h.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'match', groupId: 'group', status: MatchStatus.READY },
      { status: MatchStatus.COMPLETED },
      { new: true },
    );
    expect(result.status).toBe(MatchStatus.COMPLETED);
  });

  it('creates draft matches from the authenticated owner', async () => {
    const h = serviceFor();
    h.create.mockResolvedValue(match([]));
    await h.service.create(
      'group',
      { name: ' Match ', scheduledAt: '2026-09-05T18:00:00.000Z' },
      'owner',
    );
    expect(h.groups.assertOwner).toHaveBeenCalledWith('group', 'owner');
    expect(h.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdByUserId: 'owner',
        groupId: 'group',
        name: 'Match',
        status: MatchStatus.DRAFT,
        participantUserIds: [],
        homeTeamUserIds: [],
        awayTeamUserIds: [],
        homeLineup: [],
        awayLineup: [],
        formation: null,
      }),
    );
  });

  it('scopes reads, updates, and deletes by both group and match', async () => {
    const h = serviceFor();
    h.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(match(ids(2))),
    });
    h.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(match(ids(2))),
    });
    h.deleteOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    });
    await h.service.get('group', 'match', 'owner');
    await h.service.update('group', 'match', { name: 'New' }, 'owner');
    await h.service.remove('group', 'match', 'owner');
    expect(h.findOne).toHaveBeenCalledWith({ _id: 'match', groupId: 'group' });
    expect(h.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'match', groupId: 'group' },
      expect.anything(),
      { new: true },
    );
    expect(h.deleteOne).toHaveBeenCalledWith({
      _id: 'match',
      groupId: 'group',
    });
  });

  it.each([2, 4, 10, 12, 14, 20, 30])(
    'forms deterministic equal teams for %i players',
    async (count) => {
      const participants = ids(count);
      const h = serviceFor();
      h.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(match([...participants].reverse())),
      });
      h.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockImplementation(async () => {
          const update = h.findOneAndUpdate.mock.calls[0][1];
          return { ...match(participants), ...update };
        }),
      });
      const result = await h.service.generate(
        'group',
        'match',
        { formation: { GK: 0, DEF: 0, MID: count / 2, FWD: 0 } },
        'owner',
      );
      expect(result.homeTeamUserIds).toHaveLength(count / 2);
      expect(result.awayTeamUserIds).toHaveLength(count / 2);
      expect(
        new Set([...result.homeTeamUserIds, ...result.awayTeamUserIds]).size,
      ).toBe(count);
      expect(
        [...result.homeTeamUserIds, ...result.awayTeamUserIds].sort(),
      ).toEqual(participants.sort());
      expect(result.status).toBe(MatchStatus.READY);
      expect(h.groups.findMembershipProfilesByUserIds).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects odd, insufficient, cancelled, and completed lineups', async () => {
    for (const [players, status] of [
      [[], MatchStatus.DRAFT],
      [ids(1), MatchStatus.DRAFT],
      [ids(3), MatchStatus.DRAFT],
      [ids(2), MatchStatus.CANCELLED],
      [ids(2), MatchStatus.COMPLETED],
    ] as const) {
      const h = serviceFor();
      h.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(match(players as string[], status)),
      });
      await expect(
        h.service.generate(
          'group',
          'match',
          { formation: { GK: 0, DEF: 0, MID: players.length / 2, FWD: 0 } },
          'owner',
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'INVALID_MATCH_STATE' }),
      });
    }
  });

  it('deduplicates participants, rejects outsiders, and clears stale teams', async () => {
    const h = serviceFor({ ownerId: 'owner', memberIds: ['a', 'b'] });
    h.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(match(['a', 'b'])),
    });
    await h.service.participants(
      'group',
      'match',
      { participantUserIds: ['a', 'a', 'b'] },
      'owner',
    );
    expect(h.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'match', groupId: 'group' },
      expect.objectContaining({
        participantUserIds: ['a', 'b'],
        homeTeamUserIds: [],
        awayTeamUserIds: [],
        homeLineup: [],
        awayLineup: [],
        formation: null,
        status: MatchStatus.DRAFT,
      }),
      { new: true },
    );
    await expect(
      h.service.participants(
        'group',
        'match',
        { participantUserIds: ['a', 'outsider'] },
        'owner',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_MATCH_STATE' }),
    });
  });

  it('fails safely when a participant membership profile is missing', async () => {
    const h = serviceFor();
    h.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(match(ids(2))),
    });
    h.groups.findMembershipProfilesByUserIds = jest.fn().mockResolvedValue([]);

    await expect(
      h.service.generate(
        'group',
        'match',
        { formation: { GK: 1, DEF: 0, MID: 0, FWD: 0 } },
        'owner',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'MATCH_MEMBERSHIP_PROFILE_MISSING',
      }),
      clientMessage: 'Bazı oyuncuların grup üyelik bilgileri eksik.',
    });
    expect(h.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('persists lineup snapshots and returns bulk-enriched safe players', async () => {
    const participants = ids(4);
    const h = serviceFor();
    h.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(match(participants)),
    });
    h.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockImplementation(async () => ({
        ...match(participants),
        ...h.findOneAndUpdate.mock.calls[0][1],
      })),
    });

    const formation = { GK: 1, DEF: 1, MID: 0, FWD: 0 };
    const result = await h.service.generate(
      'group',
      'match',
      { formation },
      'owner',
    );
    const update = h.findOneAndUpdate.mock.calls[0][1];
    expect(update).toEqual(
      expect.objectContaining({
        homeTeamUserIds: expect.any(Array),
        awayTeamUserIds: expect.any(Array),
        homeLineup: expect.any(Array),
        awayLineup: expect.any(Array),
        formation,
        status: MatchStatus.READY,
      }),
    );
    expect(h.groups.findSafeUserIdentitiesByIds).toHaveBeenCalledTimes(1);
    expect(result.homeTeam.players[0]).toEqual({
      userId: expect.any(String),
      name: expect.any(String),
      surname: 'Surname',
      shirtNumber: expect.any(Number),
      assignedPosition: expect.stringMatching(/^(GK|DEF|MID|FWD)$/),
    });
    expect(result.homeTeam.players[0]).not.toHaveProperty('email');
    expect(result.homeTeam.players[0]).not.toHaveProperty('passwordHash');
    expect(result.formation).toEqual(formation);
  });

  it('returns persisted assigned positions from match detail with safe identities', async () => {
    const h = serviceFor();
    h.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...match(ids(2), MatchStatus.READY),
        homeTeamUserIds: [ids(2)[0]],
        awayTeamUserIds: [ids(2)[1]],
        homeLineup: [
          { userId: ids(2)[0], assignedPosition: 'FWD', shirtNumber: 9 },
        ],
        awayLineup: [
          { userId: ids(2)[1], assignedPosition: 'GK', shirtNumber: 1 },
        ],
        formation: { GK: 1, DEF: 0, MID: 0, FWD: 0 },
      }),
    });

    const result = await h.service.get('group', 'match', 'owner');

    expect(result.homeTeam.players[0]).toEqual({
      userId: ids(2)[0],
      name: `Name-${ids(2)[0]}`,
      surname: 'Surname',
      assignedPosition: 'FWD',
      shirtNumber: 9,
    });
    expect(h.groups.findMembershipProfilesByUserIds).not.toHaveBeenCalled();
    expect(h.groups.findSafeUserIdentitiesByIds).toHaveBeenCalledTimes(1);
    expect(result.formation).toEqual({ GK: 1, DEF: 0, MID: 0, FWD: 0 });
  });

  it('regeneration atomically replaces the previous formation and lineups', async () => {
    const participants = ids(4);
    const h = serviceFor();
    h.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...match(participants, MatchStatus.READY),
        formation: { GK: 1, DEF: 1, MID: 0, FWD: 0 },
      }),
    });
    h.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockImplementation(async () => ({
        ...match(participants),
        ...h.findOneAndUpdate.mock.calls[0][1],
      })),
    });
    const replacement = { GK: 0, DEF: 0, MID: 1, FWD: 1 };

    const result = await h.service.generate(
      'group',
      'match',
      { formation: replacement },
      'owner',
    );

    expect(h.findOneAndUpdate.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        formation: replacement,
        homeLineup: expect.any(Array),
        awayLineup: expect.any(Array),
        status: MatchStatus.READY,
      }),
    );
    expect(result.formation).toEqual(replacement);
  });

  it('rejects an invalid formation total without replacing generated state', async () => {
    const h = serviceFor();
    h.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(match(ids(14), MatchStatus.READY)),
    });

    await expect(
      h.service.generate(
        'group',
        'match',
        { formation: { GK: 1, DEF: 2, MID: 2, FWD: 1 } },
        'owner',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_MATCH_FORMATION' }),
      clientMessage: 'Diziliş toplamı takım oyuncu sayısıyla eşleşmelidir.',
    });
    expect(h.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects non-owner operations through group authorization', async () => {
    const h = serviceFor();
    h.groups.assertOwner = jest
      .fn()
      .mockRejectedValue(new Error('GROUP_ACCESS_DENIED'));
    await expect(
      h.service.create(
        'group',
        { name: 'x', scheduledAt: '2026-09-05T18:00:00.000Z' },
        'member',
      ),
    ).rejects.toThrow('GROUP_ACCESS_DENIED');
  });
});
