import * as bcrypt from 'bcrypt';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsersService } from '../src/modules/users/users.service';

describe('Auth registration', () => {
  it('hashes the password, persists only the hash, and returns safe data', async () => {
    const create = jest.fn().mockResolvedValue({
      toJSON: () => ({ id: '1', email: 'mail@example.com' }),
    });
    const service = new AuthService({ create } as unknown as UsersService);

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
      const service = new AuthService({
        create: jest.fn().mockRejectedValue(error),
      } as unknown as UsersService);
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
});
