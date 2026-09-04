import { Schema, Types } from 'mongoose';
import { AuthSessionSchema } from '../src/modules/auth/schemas/auth-session.schema';
import { EmailVerificationSchema } from '../src/modules/auth/schemas/email-verification.schema';
import { PasswordResetSchema } from '../src/modules/auth/schemas/password-reset.schema';
import { MatchSchema } from '../src/modules/matches/schemas/match.schema';
import { VoteSchema } from '../src/modules/voting/schemas/vote.schema';

describe('ObjectId schema paths', () => {
  const objectIdPaths: [string, Schema, string][] = [
    ['AuthSession.userId', AuthSessionSchema, 'userId'],
    ['EmailVerification.userId', EmailVerificationSchema, 'userId'],
    ['PasswordReset.userId', PasswordResetSchema, 'userId'],
    ['Match.groupId', MatchSchema, 'groupId'],
    ['Match.createdByUserId', MatchSchema, 'createdByUserId'],
    ['Vote.matchId', VoteSchema, 'matchId'],
    ['Vote.groupId', VoteSchema, 'groupId'],
    ['Vote.voterUserId', VoteSchema, 'voterUserId'],
    ['Vote.targetUserId', VoteSchema, 'targetUserId'],
  ];

  it.each(objectIdPaths)('registers %s as ObjectId', (_label, schema, path) => {
    expect(schema.path(path).instance).toBe('ObjectId');
    expect(schema.path(path).cast('507f1f77bcf86cd799439011')).toBeInstanceOf(
      Types.ObjectId,
    );
  });

  it.each([
    'participantUserIds',
    'homeTeamUserIds',
    'awayTeamUserIds',
  ] as const)('registers Match.%s as an array of ObjectIds', (path) => {
    const schemaPath = MatchSchema.path(path);

    expect(schemaPath.instance).toBe('Array');
    expect(schemaPath.getEmbeddedSchemaType()?.instance).toBe('ObjectId');
    expect(schemaPath.cast(['507f1f77bcf86cd799439011'])[0]).toBeInstanceOf(
      Types.ObjectId,
    );
  });

  it.each(['homeLineup', 'awayLineup'] as const)(
    'registers Match.%s.userId as an ObjectId subdocument field',
    (path) => {
      const lineupPath = MatchSchema.path(path);
      expect(lineupPath.schema).toBeDefined();
      const userIdPath = lineupPath.schema!.path('userId');

      expect(userIdPath.instance).toBe('ObjectId');
      expect(userIdPath.cast('507f1f77bcf86cd799439011')).toBeInstanceOf(
        Types.ObjectId,
      );
    },
  );

  it('registers Match.formation as an embedded numeric structure', () => {
    const formationPath = MatchSchema.path('formation');
    expect(formationPath.schema).toBeDefined();
    for (const position of ['GK', 'DEF', 'MID', 'FWD']) {
      expect(formationPath.schema!.path(position).instance).toBe('Number');
    }
  });
});
