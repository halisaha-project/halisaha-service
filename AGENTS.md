# Halisaha Service — Codex Checkpoint

## Project

Clean backend rebuild of the former Express/JavaScript/Mongoose halısaha app. The legacy implementation is historical only and must not be restored. Current target stack:

- NestJS + TypeScript
- MongoDB + Mongoose
- REST API under `/api/v1`
- Client-independent API for React Web and React Native/Expo

Use feature-oriented modules. Auth and Users remain separate; Auth owns OTP, email verification, password reset, and sessions; Groups owns invitations; Positions is standalone reference data. Avoid generic BaseRepository abstractions, universal response wrappers, and plaintext security tokens. Successful responses are ordinary JSON and errors use the existing normalized application-error contract.

## Current implementation

Foundation is implemented: configuration and validation, global ValidationPipe, standardized exception filter, health endpoint, MongoDB infrastructure, and `MongoIdPipe`.

Positions are implemented with canonical reference positions `GK`, `DEF`, `MID`, and `FWD`; read endpoints and seed infrastructure exist, with no public write endpoints.

Users are implemented with `name`, `surname`, normalized lowercase `username`/`email`, `passwordHash`, and `emailVerified`. Email and username are unique; `passwordHash` uses `select: false`; credential lookup explicitly selects it; safe JSON serialization removes password internals.

Auth is implemented:

- Registration: bcrypt (`BCRYPT_ROUNDS = 12`), `POST /api/v1/auth/register`, duplicate protection, safe response, no automatic login.
- Login: email or username identifier normalization, generic `INVALID_CREDENTIALS`, minimal access payload `{ sub, type: 'access' }`.
- Access authentication: `JwtAccessStrategy`, `JwtAuthGuard`, `@CurrentUser()`, minimal `{ userId }` identity, `INVALID_ACCESS_TOKEN`, and `GET /api/v1/users/me`.
- Refresh sessions: Auth-owned `AuthSession`, separate access/refresh secrets, SHA-256 token hashes, `sid`, rotation, logout, and atomic MongoDB session claim. Concurrent reuse permits only one claimant. A failure after revoking the old session and before creating its replacement may require reauthentication.
- Email verification: hashed high-entropy one-time tokens, 24-hour expiry, atomic consumption, anti-enumeration resend, and mockable/no-op mail delivery.
- Password reset: anti-enumeration request, hashed one-time tokens, atomic consumption, bcrypt password replacement, active refresh-session revocation, and concurrent single-use protection. Token consumption, password update, and session revocation are separate operations; do not add transactions casually.

Groups and invitations are implemented with authenticated member/owner authorization, safe group responses, owner-only invitations, hashed one-time invitation tokens, atomic claim, `$addToSet` membership, resend invalidation, and group-deletion invalidation. Invitation claim and membership update remain separate operations.

Matches are implemented with authenticated group scoping, draft/ready/completed/cancelled statuses, owner-only management, participant validation/deduplication (maximum 30), stale lineup clearing, deterministic sorted alternating home/away formation, and minimal owner-only `ready -> completed` transition. No position or skill balancing exists.

Voting is implemented with authenticated match/group scoping, completed-match-only eligibility, participant checks, self-vote prevention, integer scores 1–5, compound unique index `(matchId, voterUserId, targetUserId)`, safe vote responses, match-scoped listing, and aggregate results. Voter identity always comes from JWT, never request input.

## Configuration and security

Environment variables include `MONGODB_URI`, `MONGODB_TEST_URI`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, and `JWT_REFRESH_EXPIRES_IN`. Never commit `.env` or secrets. Never fall back from `MONGODB_TEST_URI` to `MONGODB_URI`.

Never expose or persist `passwordHash` in API responses. Never persist raw refresh, verification, reset, or invitation tokens. Preserve anti-enumeration behavior and authentication/authorization checks. Do not trust client-supplied voter identity or authenticated user IDs.

## Testing

Normal commands:

```text
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

The unit suite covers the implemented domains and currently contains roughly 53 tests. Mocked HTTP contract tests exist but may fail in the Codex sandbox because binding localhost produces `listen EPERM`; do not change runtime behavior to work around that.

Real MongoDB integration tests use:

```text
npm run test:integration -- --runInBand
```

Integration Jest setup loads `.env`, requires only `MONGODB_TEST_URI`, refuses databases whose name is not clearly integration-only, does not bind HTTP ports, cleans collections deterministically between tests, and preserves indexes. The dedicated database is `halisaha_integration_test`; development database is `halisaha`. No `mongodb-memory-server` is used.

Integration coverage includes schema indexes, unique vote enforcement, user normalization/serialization, match/team persistence, voting aggregation, atomic AuthSession claims, email-verification single-use behavior, password-reset behavior, and concurrent invitation acceptance. If Atlas SRV resolution fails with `querySrv ECONNREFUSED`, report the exact error; do not interpret it as a production defect without a successful database run.

## Working rules

1. Read this file and inspect actual code before changing anything.
2. Treat code and tests as the source of truth if this checkpoint differs.
3. Work incrementally with small, focused diffs.
4. Do not recreate implemented domains or restore legacy Express code.
5. Do not add unrelated product features or frontend concerns.
6. Preserve security guarantees and validate request DTOs with the existing global pipe.
7. Before changing an intentional atomicity/failure-window tradeoff, explain the tradeoff and test the change.
8. Run relevant tests, inspect the diff, and report remaining risks.

## Next planned phase

Core backend and integration-test architecture are substantially complete. The next planned work is real mail-provider integration behind the existing `MailService`, followed by environment/security hardening, deployment readiness, Swagger/API review, and production-readiness cleanup. Before adding a provider, inspect `MailService` and its Auth/Groups call sites; keep provider details behind that abstraction.

Do not continue to new product domains or infrastructure/deployment work without an explicit request. Do not commit automatically.
