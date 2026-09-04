import {
  FootballPosition,
  TeamFormation,
  TeamGenerationPlayer,
  TeamGeneratorService,
} from '../src/modules/matches/team-generator.service';

const player = (
  userId: string,
  mainPosition: FootballPosition,
  altPosition = mainPosition,
): TeamGenerationPlayer => ({
  userId,
  mainPosition,
  altPosition,
  shirtNumber: Number(userId) || 1,
});
const countPositions = (lineup: { assignedPosition: FootballPosition }[]) =>
  lineup.reduce<Record<FootballPosition, number>>(
    (counts, player) => ({
      ...counts,
      [player.assignedPosition]: counts[player.assignedPosition] + 1,
    }),
    { GK: 0, DEF: 0, MID: 0, FWD: 0 },
  );
const ids = (result: ReturnType<TeamGeneratorService['generate']>) =>
  [...result.home, ...result.away].map((item) => item.userId);

describe('TeamGeneratorService formation assignment', () => {
  const generator = new TeamGeneratorService();
  const sevenAside: TeamFormation = { GK: 1, DEF: 2, MID: 3, FWD: 1 };
  const players = [
    player('01', 'GK', 'DEF'),
    player('02', 'GK', 'DEF'),
    player('03', 'DEF', 'MID'),
    player('04', 'DEF'),
    player('05', 'DEF'),
    player('06', 'DEF'),
    player('07', 'MID', 'DEF'),
    player('08', 'MID'),
    player('09', 'MID'),
    player('10', 'MID'),
    player('11', 'MID'),
    player('12', 'MID'),
    player('13', 'FWD', 'MID'),
    player('14', 'FWD', 'MID'),
  ];

  it('fills the exact selected formation for both 7-player teams', () => {
    const result = generator.generate(players, sevenAside);
    expect(countPositions(result.home)).toEqual(sevenAside);
    expect(countPositions(result.away)).toEqual(sevenAside);
    expect(new Set(ids(result)).size).toBe(14);
    expect(ids(result).sort()).toEqual(
      players.map((item) => item.userId).sort(),
    );
  });

  it('honors a goalkeeper-less formation even with natural goalkeepers', () => {
    const formation = { GK: 0, DEF: 3, MID: 2, FWD: 2 };
    const result = generator.generate(players, formation);
    expect(countPositions(result.home)).toEqual(formation);
    expect(countPositions(result.away)).toEqual(formation);
    expect(
      [...result.home, ...result.away].some(
        (item) => item.assignedPosition === 'GK',
      ),
    ).toBe(false);
    expect(
      [...result.home, ...result.away]
        .filter((item) => ['01', '02'].includes(item.userId))
        .every((item) => item.assignedPosition === 'DEF'),
    ).toBe(true);
  });

  it('globally moves a flexible player instead of forcing a fallback', () => {
    const result = generator.generate(
      [
        player('01', 'DEF', 'MID'),
        player('02', 'DEF', 'DEF'),
        player('03', 'DEF', 'MID'),
        player('04', 'DEF', 'DEF'),
      ],
      { GK: 0, DEF: 1, MID: 1, FWD: 0 },
    );
    expect(
      [...result.home, ...result.away].find((item) => item.userId === '01')
        ?.assignedPosition,
    ).toBe('MID');
    expect(
      [...result.home, ...result.away].find((item) => item.userId === '02')
        ?.assignedPosition,
    ).toBe('DEF');
    expect(
      [...result.home, ...result.away].find((item) => item.userId === '03')
        ?.assignedPosition,
    ).toBe('MID');
    expect(
      [...result.home, ...result.away].find((item) => item.userId === '04')
        ?.assignedPosition,
    ).toBe('DEF');
  });

  it('prefers main over alt and alt over fallback globally', () => {
    const result = generator.generate(
      [
        player('01', 'DEF', 'MID'),
        player('02', 'MID', 'FWD'),
        player('03', 'FWD', 'DEF'),
        player('04', 'GK', 'MID'),
      ],
      { GK: 0, DEF: 1, MID: 1, FWD: 0 },
    );
    const assigned = new Map(
      [...result.home, ...result.away].map((item) => [
        item.userId,
        item.assignedPosition,
      ]),
    );
    expect(assigned.get('01')).toBe('DEF');
    expect(assigned.get('02')).toBe('MID');
    expect(assigned.get('03')).toBe('DEF');
    expect(assigned.get('04')).toBe('MID');
  });

  it('puts two natural goalkeepers into the two required team GK slots', () => {
    const result = generator.generate(
      [
        player('01', 'GK', 'DEF'),
        player('02', 'GK', 'DEF'),
        player('03', 'DEF'),
        player('04', 'DEF'),
      ],
      { GK: 1, DEF: 1, MID: 0, FWD: 0 },
    );
    expect(
      result.home.find((item) => item.assignedPosition === 'GK')?.userId,
    ).toMatch(/01|02/);
    expect(
      result.away.find((item) => item.assignedPosition === 'GK')?.userId,
    ).toMatch(/01|02/);
    expect(
      new Set([
        result.home.find((item) => item.assignedPosition === 'GK')?.userId,
        result.away.find((item) => item.assignedPosition === 'GK')?.userId,
      ]).size,
    ).toBe(2);
  });

  it('is deterministic regardless of participant input order', () => {
    expect(generator.generate(players, sevenAside)).toEqual(
      generator.generate([...players].reverse(), sevenAside),
    );
  });

  it('rejects a formation whose slot count does not match team size', () => {
    expect(() =>
      generator.generate(players, { GK: 1, DEF: 2, MID: 2, FWD: 1 }),
    ).toThrow('Formation size must equal team size');
  });
});
