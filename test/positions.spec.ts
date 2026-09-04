import { PositionSchema } from '../src/modules/positions/schemas/position.schema';
import {
  CANONICAL_POSITIONS,
  PositionsService,
} from '../src/modules/positions/positions.service';

describe('Positions domain', () => {
  it('defines canonical positions with Turkish labels in football order', () => {
    expect(CANONICAL_POSITIONS).toEqual([
      { name: 'Kaleci', abbreviation: 'GK' },
      { name: 'Defans', abbreviation: 'DEF' },
      { name: 'Orta Saha', abbreviation: 'MID' },
      { name: 'Forvet', abbreviation: 'FWD' },
    ]);
  });

  it('defines unique indexes for name and abbreviation', () => {
    const indexes = PositionSchema.indexes();
    expect(indexes).toEqual(
      expect.arrayContaining([
        [{ name: 1 }, expect.objectContaining({ unique: true })],
        [{ abbreviation: 1 }, expect.objectContaining({ unique: true })],
      ]),
    );
  });

  it('lists and retrieves positions through the service', async () => {
    const positions = [
      { id: '2', abbreviation: 'DEF' },
      { id: '4', abbreviation: 'FWD' },
      { id: '1', abbreviation: 'GK' },
      { id: '3', abbreviation: 'MID' },
    ];
    const model = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(positions),
      }),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(positions[0]),
      }),
    };
    const service = new PositionsService(model as never);

    await expect(service.findAll()).resolves.toEqual([
      positions[2],
      positions[0],
      positions[3],
      positions[1],
    ]);
    await expect(service.findById('1')).resolves.toEqual(positions[0]);
  });

  it('raises POSITION_NOT_FOUND for an unknown valid ID', async () => {
    const model = {
      findById: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };
    const service = new PositionsService(model as never);

    await expect(
      service.findById('6658a63e957fdc8261e8912a'),
    ).rejects.toMatchObject({
      status: 404,
      response: expect.objectContaining({ code: 'POSITION_NOT_FOUND' }),
    });
  });

  it('is idempotent by using abbreviation as the seed key', async () => {
    const updateOne = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
    const service = new PositionsService({ updateOne } as never);

    await service.seedCanonicalPositions();
    await service.seedCanonicalPositions();

    expect(updateOne).toHaveBeenCalledTimes(8);
    expect(updateOne.mock.calls[0][0]).toEqual({ abbreviation: 'GK' });
    expect(updateOne.mock.calls[0][1]).toEqual({
      $set: { name: 'Kaleci', abbreviation: 'GK' },
    });
    expect(updateOne.mock.calls[0][2]).toEqual({ upsert: true });
    expect(updateOne.mock.calls.every(([, update]) => '$set' in update)).toBe(
      true,
    );
  });
});
