import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MatchStatusDto } from '../src/modules/matches/dto/match.dto';

describe('MatchStatusDto', () => {
  it('accepts completed', async () => {
    const errors = await validate(
      plainToInstance(MatchStatusDto, { status: 'completed' }),
    );

    expect(errors).toHaveLength(0);
  });

  it('rejects a missing status', async () => {
    const errors = await validate(plainToInstance(MatchStatusDto, {}));

    expect(errors).not.toHaveLength(0);
    expect(errors[0]?.property).toBe('status');
  });

  it.each(['ready', 'draft', 'cancelled'])(
    'rejects the %s status',
    async (status) => {
      const errors = await validate(
        plainToInstance(MatchStatusDto, { status }),
      );

      expect(errors).not.toHaveLength(0);
      expect(errors[0]?.constraints).toHaveProperty('equals');
    },
  );
});
