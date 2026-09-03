# Halisaha Service — Codex Checkpoint

## Project

Clean backend rebuild of the former Express/JavaScript/Mongoose halısaha app. The legacy implementation is historical only and must not be restored. Current target stack:

- NestJS + TypeScript
- MongoDB + Mongoose
- REST API under `/api/v1`
- Client-independent API for React Web and React Native/Expo

Use feature-oriented modules. Auth and Users remain separate; Auth owns OTP, email verification, password reset, and sessions; Groups owns invitations; Positions is standalone reference data. Avoid generic BaseRepository abstractions, universal response wrappers, and plaintext security tokens. Successful responses are ordinary JSON and errors use the existing normalized application-error contract.

## Current implementation

Foundation is implemented: configuration and validation, global ValidationPipe, standardized exception filter, health endpoint, MongoDB infrastructure, and `MongoIdPipe`. Shutdown hooks handle `SIGTERM`/`SIGINT` so Nest and Mongoose lifecycle cleanup can run.

Positions are implemented with canonical reference positions `GK`, `DEF`, `MID`, and `FWD`; read endpoints and seed infrastructure exist, with no public write endpoints.

Users are implemented with `name`, `surname`, normalized lowercase `username`/`email`, `passwordHash`, and `emailVerified`. Email and username are unique; `passwordHash` uses `select: false`; credential lookup explicitly selects it; safe JSON serialization removes password internals.

Auth is implemented:

- Registration: bcrypt (`BCRYPT_ROUNDS = 12`), `POST /api/v1/auth/register`, duplicate protection, safe response, no automatic login.
- Login: email or username identifier normalization, generic `INVALID_CREDENTIALS`, minimal access payload `{ sub, type: 'access' }`.
- Access authentication: `JwtAccessStrategy`, `JwtAuthGuard`, `@CurrentUser()`, minimal `{ userId }` identity, `INVALID_ACCESS_TOKEN`, and `GET /api/v1/users/me`.
- Refresh sessions: Auth-owned `AuthSession`, separate access/refresh secrets, SHA-256 token hashes, `sid`, rotation, logout, and atomic MongoDB session claim. Concurrent reuse permits only one claimant. A failure after revoking the old session and before creating its replacement may require reauthentication.
- Email verification: hashed high-entropy one-time tokens, 24-hour expiry, atomic consumption, anti-enumeration resend, and mockable/no-op mail delivery.
- Password reset: anti-enumeration request, hashed one-time tokens, atomic consumption, bcrypt password replacement, active refresh-session revocation, and concurrent single-use protection. Token consumption, password update, and session revocation are separate operations; do not add transactions casually.

Transactional mail is implemented behind the shared `MailService` abstraction. Auth and Groups pass typed verification, password-reset, and group-invitation messages to that abstraction and do not depend on Resend. `MailModule` selects `ResendMailService` only in production; development and tests use `NoopMailService` and never make mail network calls. No development token-capture endpoint exists. Templates are plain HTML kept separate from transport code. Resend delivery is currently best-effort: failures produce only a generic server log and do not change public registration, password-reset, or invitation responses.

HTTP hardening is implemented in the shared bootstrap path for the Express adapter. Helmet is enabled globally with CSP disabled for this API-only service, Express identification is disabled, and JSON/URL-encoded request bodies are limited to `1mb`. The existing global `ValidationPipe` remains configured with `whitelist`, `forbidNonWhitelisted`, and `transform` enabled, and validation errors retain the normalized application-error contract.

Groups and invitations are implemented with authenticated member/owner authorization, safe group responses, owner-only invitations, hashed one-time invitation tokens, atomic claim, `$addToSet` membership, resend invalidation, and group-deletion invalidation. Invitation claim and membership update remain separate operations.

Matches are implemented with authenticated group scoping, draft/ready/completed/cancelled statuses, owner-only management, participant validation/deduplication (maximum 30), stale lineup clearing, deterministic sorted alternating home/away formation, and minimal owner-only `ready -> completed` transition. No position or skill balancing exists.

Voting is implemented with authenticated match/group scoping, completed-match-only eligibility, participant checks, self-vote prevention, integer scores 1–5, compound unique index `(matchId, voterUserId, targetUserId)`, safe vote responses, match-scoped listing, and aggregate results. Voter identity always comes from JWT, never request input.

All domain reference fields use `MongooseSchema.Types.ObjectId` at runtime, including ObjectId arrays; do not replace those declarations with `Types.ObjectId`, which registers as `Mixed` in this project. Normal Mongoose queries cast validated string IDs. Aggregation pipelines do not, so voting results explicitly convert their validated group/match IDs at the aggregation boundary.

Manual Postman smoke testing has covered the main auth, groups/invitations, matches/team generation/completion, and voting flow. Smoke-test fixes include parameter-scoped `MongoIdPipe` usage, runtime ObjectId schema declarations, and completed-only validation for `MatchStatusDto`. The temporary development mail-capture API used during diagnosis has been removed.

## Configuration and security

Environment variables include `MONGODB_URI`, `MONGODB_TEST_URI`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, and `JWT_REFRESH_EXPIRES_IN`. Mail configuration uses `RESEND_API_KEY`, `MAIL_FROM`, and optional `APP_NAME` (default `Halisaha`). CORS uses the comma-separated `CORS_ORIGINS`; only exact configured HTTP(S) origins are allowed, credentials are disabled, and production requires at least one non-wildcard origin. `TRUST_PROXY` defaults to `false` and accepts only `true` or `false`; enable it only behind a trusted reverse proxy/load balancer because client-IP rate limiting relies on Express IP resolution.

Production requires `MONGODB_URI`, both JWT secrets and expiry settings, `RESEND_API_KEY`, `MAIL_FROM`, and `CORS_ORIGINS`. Production JWT secrets must each contain at least 32 characters and must be different. Mail and CORS configuration remain optional outside production. Never commit `.env` or secrets. Never fall back from `MONGODB_TEST_URI` to `MONGODB_URI`.

Never expose or persist `passwordHash` in API responses. Never persist raw refresh, verification, reset, or invitation tokens. Preserve anti-enumeration behavior and authentication/authorization checks. Do not trust client-supplied voter identity or authenticated user IDs.

Application-owned logs must not include authorization headers, access/refresh/verification/reset/invitation tokens, passwords or hashes, Resend keys, MongoDB credentials, provider response details, or request bodies. Unknown application errors and mail-provider failures are logged generically; public 500 responses expose no internals.

## Rate limiting

The Nest throttler guard applies an in-memory, IP-based global limit of 100 requests per minute. Sensitive HTTP routes override it as follows:

- `POST /api/v1/auth/login`: 10 per minute.
- `POST /api/v1/auth/register`: 5 per 10 minutes.
- `POST /api/v1/auth/password-reset/request`: 5 per 15 minutes.
- `POST /api/v1/auth/email-verification/resend`: 5 per 15 minutes.
- `POST /api/v1/groups/:groupId/invitations`: 10 per 15 minutes. This is the current invitation issuance/resend path because issuing another invitation invalidates the previous active invitation.

The health endpoint is exempt from throttling. Rate-limit errors use HTTP 429 with the normalized `RATE_LIMITED` code and a generic message. Storage is currently process-local and per application instance; revisit it before running multiple backend replicas.

## Testing

Normal commands:

```text
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

The unit suite covers the implemented domains and currently contains 105 tests. Mocked HTTP contract tests contain 11 tests and may fail in the Codex sandbox because binding localhost produces `listen EPERM`; do not change runtime behavior to work around that. They pass when local binding is permitted.

Real MongoDB integration tests use:

```text
npm run test:integration -- --runInBand
```

Integration Jest setup loads `.env`, requires only `MONGODB_TEST_URI`, refuses databases whose name is not clearly integration-only, does not bind HTTP ports, cleans collections deterministically between tests, and preserves indexes. The dedicated database is `halisaha_integration_test`; development database is `halisaha`. No `mongodb-memory-server` is used.

Integration coverage includes schema indexes, unique vote enforcement, user normalization/serialization, match/team persistence, voting aggregation, atomic AuthSession claims, email-verification single-use behavior, password-reset behavior, and concurrent invitation acceptance. If Atlas SRV resolution fails with `querySrv ECONNREFUSED`, report the exact error; do not interpret it as a production defect without a successful database run.

## Docker readiness

The multi-stage Node 22 production image installs from `package-lock.json` with `npm ci`, builds TypeScript separately, and copies production dependencies plus compiled output into the runtime stage. It sets `NODE_ENV=production`, runs as the non-root `node` user, exposes port 3000 while honoring runtime `PORT`, and starts one Node process with `node dist/main.js`. The Node-based healthcheck calls `/api/v1/health` on localhost using runtime `PORT`; no curl/wget package is added. `.dockerignore` excludes dependencies, build/test artifacts, Git metadata, local logs, and `.env` files.

## Working rules

1. Read this file and inspect actual code before changing anything.
2. Treat code and tests as the source of truth if this checkpoint differs.
3. Work incrementally with small, focused diffs.
4. Do not recreate implemented domains or restore legacy Express code.
5. Do not add unrelated product features or frontend concerns.
6. Preserve security guarantees and validate request DTOs with the existing global pipe.
7. Before changing an intentional atomicity/failure-window tradeoff, explain the tradeoff and test the change.
8. Run relevant tests, inspect the diff, and report remaining risks.

## Mail production activation

The Resend adapter is prepared, but real delivery cannot be considered production-ready until a product and sender domain are finalized. There are deliberately no frontend links in templates yet; emails carry the existing raw one-time token because no production web URL is available. Complete these steps later:

1. Finalize the product name and domain.
2. Purchase the domain.
3. Verify the sender domain in Resend.
4. Configure the DNS/SPF/DKIM records required by Resend.
5. Set production `MAIL_FROM` and `RESEND_API_KEY`.
6. Configure frontend/base URLs and replace token-only instructions with appropriate links.
7. Perform a real end-to-end delivery test.

## Readiness and remaining work

The backend and Docker image are ready for frontend integration, and the principal unit/integration/manual flows pass. Before production deployment, remediate or explicitly assess the current npm audit findings, finalize and verify the mail sender/domain, configure exact frontend origins, confirm whether `TRUST_PROXY` matches the real proxy topology, verify the `1mb` body limit, and replace in-memory throttling with shared storage if multiple replicas are introduced. Confirm Helmet, CORS, health checking, graceful shutdown, and rate limiting through the deployed proxy.

The Postman collection's main requests remain useful, but some descriptions and negative-test expectations still mention the now-fixed method-level `MongoIdPipe` and `MatchStatusDto` issues. Refresh those assertions before treating the collection as an automated acceptance suite. Docker runtime output still includes TypeScript declarations, source maps, and build metadata from `dist`; these are non-secret but can be pruned in a later image-cleanliness pass.

Known failure windows remain intentional: refresh rotation can require reauthentication if replacement creation fails after old-session revocation; password reset and invitation acceptance perform token claim and downstream updates as separate operations. Do not introduce transactions without reviewing those tradeoffs.

Do not continue to new product domains or infrastructure/deployment work without an explicit request. Do not commit automatically.
