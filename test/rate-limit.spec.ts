import { AUTH_RATE_LIMITS } from '../src/common/security/rate-limit.constants';
import { AuthController } from '../src/modules/auth/auth.controller';
import { GroupsController } from '../src/modules/groups/groups.controller';
import { HealthController } from '../src/modules/health/health.controller';

const limitMetadata = 'THROTTLER:LIMITdefault';
const ttlMetadata = 'THROTTLER:TTLdefault';
const skipMetadata = 'THROTTLER:SKIPdefault';

function expectRateLimit(
  method: (...args: never[]) => unknown,
  expected: { limit: number; ttl: number },
): void {
  expect(Reflect.getMetadata(limitMetadata, method)).toBe(expected.limit);
  expect(Reflect.getMetadata(ttlMetadata, method)).toBe(expected.ttl);
}

describe('rate-limit metadata', () => {
  it('applies stricter limits to abuse-sensitive auth endpoints', () => {
    expectRateLimit(AuthController.prototype.login, AUTH_RATE_LIMITS.login);
    expectRateLimit(
      AuthController.prototype.register,
      AUTH_RATE_LIMITS.register,
    );
    expectRateLimit(
      AuthController.prototype.requestPasswordReset,
      AUTH_RATE_LIMITS.passwordResetRequest,
    );
    expectRateLimit(
      AuthController.prototype.resendVerification,
      AUTH_RATE_LIMITS.emailVerificationResend,
    );
  });

  it('limits group invitation issuance and skips health checks', () => {
    expectRateLimit(
      GroupsController.prototype.invite,
      AUTH_RATE_LIMITS.groupInvitation,
    );
    expectRateLimit(
      GroupsController.prototype.accept,
      AUTH_RATE_LIMITS.groupInvitationAccept,
    );
    expect(Reflect.getMetadata(skipMetadata, HealthController)).toBe(true);
  });
});
