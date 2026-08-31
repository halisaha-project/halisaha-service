import { PositionSchema } from '../src/modules/positions/schemas/position.schema';
import { PositionsService } from '../src/modules/positions/positions.service';

describe('Positions domain', () => {
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
    const positions = [{ id: '1', abbreviation: 'GK' }];
    const model = {
      find: jest.fn().mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue(positions) }),
      }),
      findById: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(positions[0]) }),
    };
    const service = new PositionsService(model as never);

    await expect(service.findAll()).resolves.toEqual(positions);
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
    expect(updateOne.mock.calls[0][2]).toEqual({ upsert: true });
  });
});
