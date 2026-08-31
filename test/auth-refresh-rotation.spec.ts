import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthSession } from '../src/modules/auth/schemas/auth-session.schema';
import { UsersService } from '../src/modules/users/users.service';

describe('refresh-token atomic rotation', () => {
  function makeService(claimed: unknown) {
    const exec = jest.fn().mockResolvedValue(claimed);
    const findOneAndUpdate = jest.fn().mockReturnValue({ exec });
    const service = new AuthService(
      {} as UsersService,
      {
        signAsync: jest.fn().mockResolvedValue('new-access'),
      } as unknown as JwtService,
      {
        getOrThrow: jest.fn().mockReturnValue('15m'),
      } as unknown as ConfigService,
      { findOneAndUpdate } as unknown as import('mongoose').Model<AuthSession>,
    ) as unknown as {
      refresh: AuthService['refresh'];
      verifyRefreshToken: jest.Mock;
      createRefreshToken: jest.Mock;
    };
    service.verifyRefreshToken = jest
      .fn()
      .mockResolvedValue({ sub: 'user', sid: 'session', type: 'refresh' });
    service.createRefreshToken = jest.fn().mockResolvedValue('new-refresh');
    return { service, findOneAndUpdate };
  }

  it('claims only an active, matching, unexpired session atomically', async () => {
    const { service, findOneAndUpdate } = makeService({});
    await service.refresh({ refreshToken: 'old-refresh' });
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        sid: 'session',
        userId: 'user',
        tokenHash: expect.any(String),
        revokedAt: null,
        expiresAt: expect.objectContaining({ $gt: expect.any(Date) }),
      }),
      { $set: { revokedAt: expect.any(Date) } },
      { new: true },
    );
  });

  it('fails when another request already claimed the session', async () => {
    const { service } = makeService(null);
    await expect(
      service.refresh({ refreshToken: 'old-refresh' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
      }),
    });
  });
});
