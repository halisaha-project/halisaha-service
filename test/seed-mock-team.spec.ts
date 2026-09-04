import {
  assertMockTeamSeedAllowed,
  MOCK_TEAM_NAME,
  MOCK_TEAM_PLAYERS,
  seedMockTeam,
} from '../src/scripts/seed-mock-team';

describe('mock team seed', () => {
  it('contains the exact safe 20-player position pool', () => {
    expect(MOCK_TEAM_PLAYERS).toHaveLength(20);
    expect(new Set(MOCK_TEAM_PLAYERS.map((player) => player.email)).size).toBe(
      20,
    );
    expect(
      MOCK_TEAM_PLAYERS.every((player) =>
        player.email.endsWith('@halisaha.local'),
      ),
    ).toBe(true);
    expect(
      MOCK_TEAM_PLAYERS.reduce<Record<string, number>>((counts, player) => {
        counts[player.mainPosition] = (counts[player.mainPosition] ?? 0) + 1;
        return counts;
      }, {}),
    ).toEqual({ GK: 2, DEF: 8, MID: 6, FWD: 4 });
    expect(
      MOCK_TEAM_PLAYERS.filter(
        (player) =>
          player.mainPosition === 'DEF' && player.altPosition === 'GK',
      ),
    ).toHaveLength(2);
  });

  it('refuses production before seed writes are attempted', () => {
    expect(() => assertMockTeamSeedAllowed('production')).toThrow(
      'Mock team seed is disabled in production',
    );
    expect(() => assertMockTeamSeedAllowed('development')).not.toThrow();
    expect(() => assertMockTeamSeedAllowed('test')).not.toThrow();
  });

  it('reruns by updating stable users, one group, and upserting memberships', async () => {
    const storedUsers: Array<Record<string, unknown>> = [];
    const findOne = jest.fn((filter: { $or: Record<string, string>[] }) => ({
      exec: jest.fn().mockResolvedValue(
        storedUsers.find((user) =>
          filter.$or.some((condition) => {
            const [field, value] = Object.entries(condition)[0];
            return user[field] === value;
          }),
        ) ?? null,
      ),
    }));
    const create = jest.fn(async (fields: Record<string, unknown>) => {
      const user = { ...fields, _id: `user-${storedUsers.length + 1}` };
      storedUsers.push(user);
      return user;
    });
    const findByIdAndUpdate = jest.fn(
      (id: string, update: { $set: Record<string, unknown> }) => ({
        exec: jest.fn().mockImplementation(async () => {
          const user = storedUsers.find((value) => value._id === id)!;
          Object.assign(user, update.$set);
          return user;
        }),
      }),
    );
    const groupUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'seed-group-id' }),
    });
    const bulkWrite = jest.fn().mockResolvedValue({});
    const models = {
      users: { findOne, create, findByIdAndUpdate },
      groups: { findOneAndUpdate: groupUpdate },
      memberships: { bulkWrite },
    } as never;

    await seedMockTeam(models);
    await seedMockTeam(models);

    expect(create).toHaveBeenCalledTimes(20);
    expect(findByIdAndUpdate).toHaveBeenCalledTimes(20);
    expect(storedUsers).toHaveLength(20);
    expect(storedUsers[0]).toEqual(
      expect.objectContaining({
        name: 'Murat',
        email: 'murat.mock@halisaha.local',
        emailVerified: true,
        passwordHash: expect.any(String),
      }),
    );
    expect(storedUsers[0]).not.toHaveProperty('password');
    expect(groupUpdate).toHaveBeenCalledTimes(2);
    expect(groupUpdate).toHaveBeenLastCalledWith(
      { name: MOCK_TEAM_NAME },
      {
        $set: {
          ownerId: 'user-1',
          memberIds: MOCK_TEAM_PLAYERS.map((_, index) => `user-${index + 1}`),
        },
      },
      { upsert: true, new: true },
    );
    expect(bulkWrite).toHaveBeenCalledTimes(2);
    expect(bulkWrite.mock.calls[1][0]).toHaveLength(20);
    expect(
      bulkWrite.mock.calls[1][0].every(
        (operation: { updateOne: { upsert: boolean } }) =>
          operation.updateOne.upsert,
      ),
    ).toBe(true);
  });
});
