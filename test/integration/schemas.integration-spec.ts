import { Connection } from 'mongoose';
import {
  connectTestDatabase,
  clearDatabase,
  closeTestDatabase,
} from './database';
import { User, UserSchema } from '../../src/modules/users/schemas/user.schema';
import { Vote, VoteSchema } from '../../src/modules/voting/schemas/vote.schema';
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
  GroupInvitation,
  GroupInvitationSchema,
} from '../../src/modules/groups/schemas/group-invitation.schema';

describe('MongoDB schema integration', () => {
  let connection: Connection | undefined;
  beforeAll(async () => {
    connection = await connectTestDatabase();
  });
  afterEach(async () => clearDatabase(connection));
  afterAll(async () => closeTestDatabase(connection));

  it('enforces the compound unique vote index', async () => {
    if (!connection) return;
    const model = connection.model(Vote.name, VoteSchema);
    await model.createIndexes();
    const indexes = await model.collection.indexes();
    expect(
      indexes.some(
        (i) =>
          i.unique &&
          i.key?.matchId &&
          i.key?.voterUserId &&
          i.key?.targetUserId,
      ),
    ).toBe(true);
    const data = {
      matchId: '507f1f77bcf86cd799439011',
      groupId: '507f1f77bcf86cd799439012',
      voterUserId: '507f1f77bcf86cd799439013',
      targetUserId: '507f1f77bcf86cd799439014',
      score: 4,
    };
    await model.create(data);
    await expect(model.create(data)).rejects.toMatchObject({ code: 11000 });
  });

  it('creates the critical user and auth-token indexes', async () => {
    if (!connection) return;
    const models = [
      connection.model(User.name, UserSchema),
      connection.model(AuthSession.name, AuthSessionSchema),
      connection.model(EmailVerification.name, EmailVerificationSchema),
      connection.model(PasswordReset.name, PasswordResetSchema),
      connection.model(GroupInvitation.name, GroupInvitationSchema),
    ];
    for (const model of models) await model.createIndexes();
    const userIndexes = await models[0].collection.indexes();
    expect(userIndexes.some((i) => i.unique && i.key?.email)).toBe(true);
    expect(userIndexes.some((i) => i.unique && i.key?.username)).toBe(true);
    for (const model of models.slice(1))
      expect((await model.collection.indexes()).length).toBeGreaterThan(1);
  });
});
