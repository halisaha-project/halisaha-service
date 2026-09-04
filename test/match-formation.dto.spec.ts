import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GenerateTeamsDto } from '../src/modules/matches/dto/match.dto';

describe('GenerateTeamsDto formation validation', () => {
  it('accepts integer zero values', async () => {
    await expect(
      validate(
        plainToInstance(GenerateTeamsDto, {
          formation: { GK: 0, DEF: 3, MID: 2, FWD: 2 },
        }),
      ),
    ).resolves.toHaveLength(0);
  });

  it.each([-1, 1.5])('rejects the invalid formation value %s', async (GK) => {
    const errors = await validate(
      plainToInstance(GenerateTeamsDto, {
        formation: { GK, DEF: 3, MID: 2, FWD: 2 },
      }),
    );
    expect(errors).not.toHaveLength(0);
  });

  it('rejects a missing formation object', async () => {
    await expect(validate(new GenerateTeamsDto())).resolves.not.toHaveLength(0);
  });
});
