import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsersService } from '../src/modules/users/users.service';

describe('Auth registration', () => {
  it('hashes the password, persists only the hash, and returns safe data', async () => {
    const create = jest.fn().mockResolvedValue({
      toJSON: () => ({ id: '1', email: 'mail@example.com' }),
    });
    const service = new AuthService(
      { create } as unknown as UsersService,
      {} as JwtService,
      {} as ConfigService,
    );

    await expect(
      service.register({
        name: 'A',
        surname: 'B',
        username: 'user',
        email: 'mail@example.com',
        password: 'plaintext',
      }),
    ).resolves.toEqual({ id: '1', email: 'mail@example.com' });
    const { passwordHash } = create.mock.calls[0][0] as {
      passwordHash: string;
    };
    expect(passwordHash).not.toBe('plaintext');
    await expect(bcrypt.compare('plaintext', passwordHash)).resolves.toBe(true);
    expect(passwordHash).toHaveLength(60);
    expect(create.mock.calls[0][0]).not.toHaveProperty('password');
  });

  it.each(['EMAIL_ALREADY_EXISTS', 'USERNAME_ALREADY_EXISTS'])(
    'propagates %s',
    async (code) => {
      const error = { response: { code } };
      const service = new AuthService(
        {
          create: jest.fn().mockRejectedValue(error),
        } as unknown as UsersService,
        {} as JwtService,
        {} as ConfigService,
      );
      await expect(
        service.register({
          name: 'A',
          surname: 'B',
          username: 'user',
          email: 'mail@example.com',
          password: 'plaintext',
        }),
      ).rejects.toBe(error);
    },
  );

  it.each(['email', 'username'])(
    'logs in by %s with a minimal token',
    async (kind) => {
      const passwordHash = await bcrypt.hash('password', 4);
      const lookup = jest
        .fn()
        .mockResolvedValue({ _id: 'user-id', passwordHash });
      const users = {
        findCredentialsByEmail: kind === 'email' ? lookup : jest.fn(),
        findCredentialsByUsername: kind === 'username' ? lookup : jest.fn(),
      } as unknown as UsersService;
      const signAsync = jest.fn().mockResolvedValue('access-token');
      const config = {
        getOrThrow: jest.fn().mockReturnValue('15m'),
      } as unknown as ConfigService;
      const service = new AuthService(
        users,
        { signAsync } as unknown as JwtService,
        config,
      );
      const result = await service.login({
        identifier: `  ${kind === 'email' ? 'MAIL@EXAMPLE.COM' : 'User'}  `,
        password: 'password',
      });
      expect(result).toEqual({ accessToken: 'access-token', expiresIn: 900 });
      expect(lookup).toHaveBeenCalledWith(
        kind === 'email' ? 'mail@example.com' : 'user',
      );
      expect(signAsync).toHaveBeenCalledWith({
        sub: 'user-id',
        type: 'access',
      });
    },
  );

  it('uses the same invalid credentials error for unknown users and bad passwords', async () => {
    const config = {
      getOrThrow: jest.fn().mockReturnValue('15m'),
    } as unknown as ConfigService;
    const missing = new AuthService(
      {
        findCredentialsByEmail: jest.fn().mockResolvedValue(null),
      } as unknown as UsersService,
      {} as JwtService,
      config,
    );
    const wrong = new AuthService(
      {
        findCredentialsByEmail: jest
          .fn()
          .mockResolvedValue({ _id: '1', passwordHash: 'not-a-match' }),
      } as unknown as UsersService,
      {} as JwtService,
      config,
    );
    const missingError = await missing
      .login({ identifier: 'mail@example.com', password: 'wrong' })
      .catch((error) => error);
    const wrongError = await wrong
      .login({ identifier: 'mail@example.com', password: 'wrong' })
      .catch((error) => error);
    expect(missingError.response).toEqual(wrongError.response);
    expect(missingError.response).toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid credentials',
    });
  });
});
