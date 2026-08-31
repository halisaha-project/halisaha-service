import { UserSchema } from '../src/modules/users/schemas/user.schema';
import { UsersService } from '../src/modules/users/users.service';

describe('Users domain', () => {
  it('defines unique username and email indexes and hides passwordHash', () => {
    expect(UserSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ username: 1 }, expect.objectContaining({ unique: true })],
        [{ email: 1 }, expect.objectContaining({ unique: true })],
      ]),
    );
    expect(UserSchema.path('passwordHash').options.select).toBe(false);
  });

  it('normalizes user creation input', async () => {
    const save = jest
      .fn()
      .mockResolvedValue({ username: 'newuser', email: 'mail@example.com' });
    const Model = jest.fn().mockImplementation((data) => ({ ...data, save }));
    const service = new UsersService(Model as never);

    await expect(
      service.create({
        name: ' Name ',
        surname: ' Surname ',
        username: ' NewUser ',
        email: ' MAIL@EXAMPLE.COM ',
        passwordHash: 'hash',
      }),
    ).resolves.toEqual({ username: 'newuser', email: 'mail@example.com' });
    expect(Model).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Name',
        surname: 'Surname',
        username: 'newuser',
        email: 'mail@example.com',
      }),
    );
  });

  it('uses normalized lookup values and explicitly selects credentials', async () => {
    const exec = jest.fn().mockResolvedValue({});
    const select = jest.fn().mockReturnValue({ exec });
    const findOne = jest.fn().mockReturnValue({ exec, select });
    const findById = jest.fn().mockReturnValue({ exec });
    const service = new UsersService({ findOne, findById } as never);

    await service.findByEmail(' MAIL@EXAMPLE.COM ');
    await service.findByUsername(' NewUser ');
    await service.findCredentialsByEmail(' MAIL@EXAMPLE.COM ');
    await service.findById('1');

    expect(findOne).toHaveBeenNthCalledWith(1, { email: 'mail@example.com' });
    expect(findOne).toHaveBeenNthCalledWith(2, { username: 'newuser' });
    expect(select).toHaveBeenCalledWith('+passwordHash');
    expect(findById).toHaveBeenCalledWith('1');
  });

  it('translates duplicate email and username errors', async () => {
    const duplicate = (field: string) => ({
      code: 11000,
      keyPattern: { [field]: 1 },
    });
    const makeService = (error: unknown) => {
      const Model = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(error),
      }));
      return new UsersService(Model as never);
    };
    const data = {
      name: 'A',
      surname: 'B',
      username: 'user',
      email: 'mail@example.com',
      passwordHash: 'hash',
    };

    await expect(
      makeService(duplicate('email')).create(data),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'EMAIL_ALREADY_EXISTS' }),
    });
    await expect(
      makeService(duplicate('username')).create(data),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'USERNAME_ALREADY_EXISTS' }),
    });
  });

  it('translates missing users to USER_NOT_FOUND', async () => {
    const exec = jest.fn().mockResolvedValue(null);
    const service = new UsersService({
      findById: jest.fn().mockReturnValue({ exec }),
    } as never);
    await expect(service.findRequiredById('missing')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'USER_NOT_FOUND' }),
    });
  });

  it('serializes a user without persistence internals or passwordHash', () => {
    const serialized = JSON.parse(
      JSON.stringify(
        {
          _id: 'abc',
          __v: 0,
          passwordHash: 'secret',
          name: 'A',
          surname: 'B',
          username: 'user',
          email: 'mail@example.com',
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        (_key, value) => value,
      ),
    );
    const transform = (
      UserSchema.get('toJSON') as {
        transform: (
          document: unknown,
          returned: Record<string, unknown>,
        ) => Record<string, unknown>;
      }
    ).transform;
    const result = transform({} as never, serialized);
    expect(result).not.toHaveProperty('_id');
    expect(result).not.toHaveProperty('__v');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).toHaveProperty('id', 'abc');
  });
});
