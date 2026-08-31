import { MatchesService } from '../src/modules/matches/matches.service';
import { MatchStatus } from '../src/modules/matches/schemas/match.schema';
import { GroupsService } from '../src/modules/groups/groups.service';
import { Model } from 'mongoose';
import { Match } from '../src/modules/matches/schemas/match.schema';

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
      const home = participants.sort().filter((_, i) => i % 2 === 0);
      const away = participants.sort().filter((_, i) => i % 2 === 1);
      h.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockImplementation(async () => ({
          ...match(participants),
          homeTeamUserIds: home,
          awayTeamUserIds: away,
          status: MatchStatus.READY,
        })),
      });
      const result = await h.service.generate('group', 'match', 'owner');
      expect(result.homeTeamUserIds).toHaveLength(count / 2);
      expect(result.awayTeamUserIds).toHaveLength(count / 2);
      expect(
        new Set([...result.homeTeamUserIds, ...result.awayTeamUserIds]).size,
      ).toBe(count);
      expect(
        [...result.homeTeamUserIds, ...result.awayTeamUserIds].sort(),
      ).toEqual(participants.sort());
      expect(result.status).toBe(MatchStatus.READY);
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
        h.service.generate('group', 'match', 'owner'),
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
