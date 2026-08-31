import { ConfigService } from '@nestjs/config';
import { JwtAccessStrategy } from '../src/modules/auth/strategies/jwt-access.strategy';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';

describe('access-token authentication infrastructure', () => {
  const strategy = new JwtAccessStrategy({
    getOrThrow: jest.fn().mockReturnValue('secret'),
  } as unknown as ConfigService);

  it('accepts access tokens and returns only userId', () => {
    expect(strategy.validate({ sub: 'user-id', type: 'access' })).toEqual({
      userId: 'user-id',
    });
  });

  it.each([
    { sub: 'user-id', type: 'refresh' },
    { sub: 123, type: 'access' },
  ])('rejects invalid token payloads', (payload) => {
    expect(() => strategy.validate(payload)).toThrow('Invalid access token');
  });

  it('normalizes guard failures to INVALID_ACCESS_TOKEN', () => {
    const guard = new JwtAuthGuard();
    expect(() => guard.handleRequest(new Error('jwt details'), null)).toThrow(
      'Invalid access token',
    );
    expect(() => guard.handleRequest(null, null)).toThrow(
      'Invalid access token',
    );
  });

  it('uses the authenticated user id for /users/me', async () => {
    const findRequiredById = jest.fn().mockResolvedValue({
      id: 'user-id',
      email: 'mail@example.com',
    });
    const controller = new UsersController({
      findRequiredById,
    } as unknown as UsersService);
    await expect(controller.findMe({ userId: 'user-id' })).resolves.toEqual({
      id: 'user-id',
      email: 'mail@example.com',
    });
    expect(findRequiredById).toHaveBeenCalledWith('user-id');
  });
});
