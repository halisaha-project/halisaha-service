import { Connection } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import {
  connectTestDatabase,
  clearDatabase,
  closeTestDatabase,
} from './database';
import { User, UserSchema } from '../../src/modules/users/schemas/user.schema';
import { UsersService } from '../../src/modules/users/users.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import {
  AuthSession,
  AuthSessionSchema,
} from '../../src/modules/auth/schemas/auth-session.schema';
import {
  EmailVerification,
  EmailVerificationSchema,
} from '../../src/modules/auth/schemas/email-verification.schema';
import {
  PasswordReset,
  PasswordResetSchema,
} from '../../src/modules/auth/schemas/password-reset.schema';
import {
  Group,
  GroupSchema,
} from '../../src/modules/groups/schemas/group.schema';
import {
  GroupInvitation,
  GroupInvitationSchema,
} from '../../src/modules/groups/schemas/group-invitation.schema';
import { GroupsService } from '../../src/modules/groups/groups.service';

const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const config = {
  getOrThrow: jest.fn(
    (key: string) =>
      ({
        jwtAccessExpiresIn: '15m',
        jwtRefreshExpiresIn: '30d',
        jwtRefreshSecret: 'refresh-secret',
        jwtAccessSecret: 'access-secret',
      })[key],
  ),
};

describe('real Auth and Groups concurrency behavior', () => {
  let connection: Connection;
  beforeAll(async () => {
    connection = await connectTestDatabase();
  });
  afterEach(async () => clearDatabase(connection));
  afterAll(async () => closeTestDatabase(connection));

  it('consumes an email verification token only once concurrently', async () => {
    const users = connection.model(User.name, UserSchema);
    const verifications = connection.model(
      EmailVerification.name,
      EmailVerificationSchema,
    );
    const user = await users.create({
      name: 'A',
      surname: 'B',
      username: 'verify-user',
      email: 'verify@example.com',
      passwordHash: 'hash',
      emailVerified: false,
    });
    const token = randomBytes(32).toString('hex');
    await verifications.create({
      userId: user._id,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + 60000),
      consumedAt: null,
    });
    const service = new AuthService(
      new UsersService(users),
      {} as never,
      config as never,
      undefined,
      verifications,
      undefined,
      undefined,
    );
    const attempts = await Promise.allSettled([
      service.verifyEmail({ token }),
      service.verifyEmail({ token }),
    ]);
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect((await users.findById(user._id).exec())?.emailVerified).toBe(true);
    expect(
      await verifications.countDocuments({
        tokenHash: hash(token),
        consumedAt: { $ne: null },
      }),
    ).toBe(1);
    await expect(service.verifyEmail({ token })).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'INVALID_EMAIL_VERIFICATION_TOKEN',
      }),
    });
  });

  it('resets a password once and revokes all active refresh sessions', async () => {
    const users = connection.model(User.name, UserSchema);
    const resets = connection.model(PasswordReset.name, PasswordResetSchema);
    const sessions = connection.model(AuthSession.name, AuthSessionSchema);
    const password = await bcrypt.hash('old-password', 4);
    const user = await users.create({
      name: 'A',
      surname: 'B',
      username: 'reset-user',
      email: 'reset@example.com',
      passwordHash: password,
    });
    await sessions.create([
      {
        sid: 'session-a',
        userId: user._id,
        tokenHash: 'a',
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: null,
      },
      {
        sid: 'session-b',
        userId: user._id,
        tokenHash: 'b',
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: null,
      },
    ]);
    const token = randomBytes(32).toString('hex');
    await resets.create({
      userId: user._id,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + 60000),
      consumedAt: null,
    });
    const service = new AuthService(
      new UsersService(users),
      {} as never,
      config as never,
      sessions,
      undefined,
      undefined,
      resets,
    );
    const attempts = await Promise.allSettled([
      service.completePasswordReset({ token, newPassword: 'new-password' }),
      service.completePasswordReset({ token, newPassword: 'new-password' }),
    ]);
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const stored = (await users
      .findById(user._id)
      .select('+passwordHash')
      .exec())!;
    expect(await bcrypt.compare('new-password', stored.passwordHash)).toBe(
      true,
    );
    expect(await bcrypt.compare('old-password', stored.passwordHash)).toBe(
      false,
    );
    expect(
      await sessions.countDocuments({ userId: user._id, revokedAt: null }),
    ).toBe(0);
    expect(
      await resets.countDocuments({
        tokenHash: hash(token),
        consumedAt: { $ne: null },
      }),
    ).toBe(1);
    await expect(
      service.completePasswordReset({ token, newPassword: 'another-password' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'INVALID_PASSWORD_RESET_TOKEN',
      }),
    });
  });

  it('accepts a group invitation only once and prevents duplicate membership', async () => {
    const users = connection.model(User.name, UserSchema);
    const groups = connection.model(Group.name, GroupSchema);
    const invitations = connection.model(
      GroupInvitation.name,
      GroupInvitationSchema,
    );
    const owner = await users.create({
      name: 'Owner',
      surname: 'A',
      username: 'owner',
      email: 'owner@example.com',
      passwordHash: 'hash',
    });
    const invited = await users.create({
      name: 'Invited',
      surname: 'B',
      username: 'invited',
      email: 'invited@example.com',
      passwordHash: 'hash',
    });
    const group = await groups.create({
      name: 'Group',
      ownerId: owner._id,
      memberIds: [owner._id],
    });
    const token = randomBytes(32).toString('hex');
    await invitations.create({
      groupId: group._id,
      invitedUserId: invited._id,
      invitedByUserId: owner._id,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + 60000),
      acceptedAt: null,
      revokedAt: null,
    });
    const service = new GroupsService(
      groups,
      invitations,
      new UsersService(users),
      { sendGroupInvitation: jest.fn() } as never,
    );
    const attempts = await Promise.allSettled([
      service.accept({ token }, String(invited._id)),
      service.accept({ token }, String(invited._id)),
    ]);
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const saved = await groups.findById(group._id).exec();
    expect(
      saved?.memberIds.map(String).filter((id) => id === String(invited._id)),
    ).toHaveLength(1);
    expect(
      await invitations.countDocuments({
        tokenHash: hash(token),
        acceptedAt: { $ne: null },
      }),
    ).toBe(1);
    await expect(
      service.accept({ token }, String(invited._id)),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_GROUP_INVITATION' }),
    });
  });
});
