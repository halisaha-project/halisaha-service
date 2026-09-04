export const GLOBAL_RATE_LIMIT = { limit: 100, ttl: 60_000 } as const;

export const AUTH_RATE_LIMITS = {
  login: { limit: 10, ttl: 60_000 },
  register: { limit: 5, ttl: 10 * 60_000 },
  passwordResetRequest: { limit: 5, ttl: 15 * 60_000 },
  emailVerificationResend: { limit: 5, ttl: 15 * 60_000 },
  groupInvitation: { limit: 10, ttl: 15 * 60_000 },
  groupInvitationAccept: { limit: 5, ttl: 15 * 60_000 },
} as const;
