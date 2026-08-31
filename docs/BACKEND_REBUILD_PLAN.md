# NestJS Backend Rebuild Plan

## Purpose and scope

The current branch will become a clean NestJS + TypeScript backend. The Express application is treated as a historical reference and will remain available separately in Git history, a legacy branch, or a tag. This plan does not preserve unsafe routes or legacy layering. MongoDB remains the database.

The rebuild should preserve valid domain intent and data compatibility where practical, while explicitly fixing security and integrity defects. Existing MongoDB data must be profiled before schema constraints are enabled.

## 1. Target architecture

### Directory structure

```text
src/
├── main.ts
├── app.module.ts
├── config/
│   ├── configuration.ts
│   └── env.validation.ts
├── common/
│   ├── decorators/        # CurrentUser, Roles/Permissions, Public
│   ├── dto/               # pagination and shared transport DTOs
│   ├── exceptions/        # domain exceptions and error codes
│   ├── filters/           # global exception filter
│   ├── guards/            # access-token and authorization guards
│   ├── interceptors/      # request correlation and response concerns
│   ├── pipes/             # validation and ObjectId parsing
│   └── utils/
├── infrastructure/
│   ├── database/          # Mongo connection, migrations/data checks
│   └── mail/              # SMTP provider, templates, delivery service
└── modules/
    ├── positions/
    ├── users/
    ├── auth/
    ├── groups/
    ├── matches/
    └── voting/
```

Each feature owns its controller, application service, DTOs, schemas, response models, and repository only where persistence isolation is useful. Controllers never receive Express response objects or issue Mongoose queries. Cross-feature calls use services/interfaces, not controller imports. Shared infrastructure must not contain domain decisions.

### Module boundaries and responsibilities

| Module | Owns | Does not own |
|---|---|---|
| Positions | Position catalog, validated abbreviations, seed/read operations | User or lineup authorization |
| Users | Public-safe profile data, account lifecycle, password change, user repository | Token issuance, OTP workflows |
| Auth | Registration, login, verification challenges, access/refresh tokens, reset challenges, logout/revocation | Group/match permissions |
| Groups | Group aggregate, memberships, roles, invitations, shirt-number rules | Match lineup generation or voting |
| Matches | Match aggregate, eligibility, lifecycle, lineup generation, match queries | Rating aggregation persistence |
| Voting | Vote submission/authorization, vote records, rating aggregation/read model | Authentication and group membership ownership |

Suggested ownership: `Group` owns embedded membership records and invitation workflows; `Match` owns embedded lineup snapshots; `Voting` owns vote documents and rating calculations; `Auth` owns OTP/reset challenge documents. Positions are referenced by ObjectId but may be snapshotted into lineups for historical display if that is an explicit product decision.

## 2. Clean REST API

All routes are versioned under `/api/v1`; no legacy names are copied. Responses use the standard envelope below. IDs are validated before repository calls. Pagination is explicit for collection endpoints.

### Auth

```text
POST /auth/register
POST /auth/verify-email
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/password-reset/request
POST /auth/password-reset/confirm
POST /auth/change-password          # authenticated
GET  /auth/me                       # authenticated
```

Registration accepts `nameSurname`, `username`, `email`, and `password`; it creates an unverified account and sends a time-limited verification challenge. Login returns a short-lived access token and a refresh-token representation. Email verification consumes a purpose-specific challenge. Password reset requires a verified, single-use reset challenge; it never accepts email plus a new password alone.

### Users and positions

```text
GET /users/me                       # authenticated
GET /users/:userId                  # authenticated, safe public projection
GET /users                          # authenticated, paginated safe projection
PATCH /users/me                     # authenticated, allowlisted profile fields
DELETE /users/me                    # authenticated, explicit account policy
GET /positions                      # authenticated or public, product decision
GET /positions/:positionId
```

There is no arbitrary user creation/update endpoint. Password changes stay in Auth. Password hashes, verification state, reset material, and tokens are never serialized.

### Groups and invitations

```text
POST /groups
GET  /groups
GET  /groups/:groupId
PATCH /groups/:groupId               # owner/admin permission
DELETE /groups/:groupId              # owner permission
POST /groups/:groupId/members        # invitation acceptance or explicit join flow
PATCH /groups/:groupId/members/:userId
DELETE /groups/:groupId/members/:userId
POST /groups/:groupId/invitations
GET  /groups/:groupId/invitations    # owner/admin only, if needed
DELETE /groups/:groupId/invitations/:invitationId
POST /invitations/:token/accept
POST /groups/:groupId/leave
```

The API derives the acting user from the access token. A client cannot choose another `voterId`/member identity for an operation. Owner/admin/member permissions are explicit and tested.

### Matches and voting

```text
POST /groups/:groupId/matches
GET  /groups/:groupId/matches
GET  /matches/:matchId
GET  /matches?participation=mine
POST /matches/:matchId/votes
GET  /matches/:matchId/votes          # authorized group participant
GET  /matches/:matchId/ratings       # authorized group participant
```

Match creation accepts a validated player selection, formation, date, and location. The service verifies every selected player is an active group member, defines supported team sizes/formations, and writes a complete valid lineup. Voting accepts ratings for eligible match participants and enforces the match’s voting lifecycle.

### Standard response and errors

Success responses use either `{ "data": value, "error": null }` or a documented pagination shape. Errors use:

```json
{
  "data": null,
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "Group could not be found.",
    "details": {}
  }
}
```

Codes are stable; messages are human-readable and localization-ready. Use 400 for malformed input, 401 for missing/invalid authentication, 403 for insufficient permission, 404 for absent resources, 409 for uniqueness/state conflicts, and 422 where semantic validation is distinct. Do not expose stack traces, database errors, hashes, or internal query details.

## 3. Schemas, constraints, and persistence

### Schema ownership

- `User`: name, normalized unique username, normalized unique email, password hash, verification status/timestamps, account timestamps. Verification/reset secrets are separate challenge records, never user response fields.
- `Position`: unique normalized abbreviation and unique canonical name, display name, active flag. Seed four existing concepts (FWD, MID, DEF, GK) through an idempotent startup/data migration, not import-time side effects.
- `Group`: name, owner User reference, embedded member entries (`userId`, shirt number, main/alternate Position references, role, joinedAt, status), timestamps, optional version field.
- `GroupInvitation`: Group/User references, hashed random token or token identifier, expiry, use limit/current uses, revoked/accepted timestamps, creator. A unique token index and atomic acceptance are required.
- `Match`: group reference, date/location, explicit status (`scheduled`, `completed`, `cancelled`), complete home/away lineup snapshots, and timestamps. Lineup entries contain user reference, shirt number, selected position, preferred positions, and `hasVoted` only if that projection is retained.
- `Vote`: one document per match/voter, or a uniquely constrained subdocument model; match and voter references, target ratings, timestamps. The selected model must make duplicate-vote prevention atomic.
- `AuthChallenge`: purpose (`email_verification` or `password_reset`), user/email reference, hashed code/token, expiry, attempt count, consumedAt, and timestamps. Add TTL cleanup plus synchronous expiry checks.
- `RefreshSession`: user reference, hashed refresh-token identifier, family/device metadata, expiry, revokedAt/replacedBy, timestamps. Store no reusable raw refresh token.

### Indexes and consistency

Before creating unique indexes, detect and resolve existing duplicates. Recommended indexes include:

- unique normalized `users.email` and `users.username`;
- unique `positions.abbreviation` and canonical name;
- `groups.members.userId`, `groups.ownerId`;
- unique invitation token hash, plus `{groupId, revokedAt, expiresAt}`;
- `{createdGroupId, matchDate:-1}` and lineup participant indexes as query patterns justify;
- unique `{matchId, voterId}` if votes are separate documents;
- `{purpose, expiresAt}` for challenges and `{userId, revokedAt, expiresAt}` for sessions.

Use atomic conditional updates for invitation uses, membership add/remove, challenge consumption, and vote insertion. Use MongoDB transactions for multi-document operations where the deployment supports them; otherwise design idempotent compensating workflows. Add optimistic version checks to aggregate updates to prevent lost writes.

## 4. Services, authorization, and authentication

### Service/repository split

Services validate business invariants, permissions, state transitions, and orchestration. Repositories expose typed persistence operations such as `findById`, `findMember`, `insert`, atomic conditional updates, and match-specific queries. Repositories do not decide whether a requester is allowed to perform an operation. Mail and token providers are infrastructure ports injected into Auth.

### Authentication architecture

- Use signed JWT access tokens with a configured algorithm, issuer, audience, key/secret rotation strategy, and short expiry. Include only stable claims: subject, token type, issuer, audience, issued-at, and expiry.
- An access-token guard verifies signature, algorithm, issuer/audience, expiry, and active user status. A `CurrentUser` decorator exposes a typed identity; it never loads or exposes a whole persistence document by accident.
- Refresh tokens are opaque high-entropy values (or JWTs with server-side session state), returned in a mobile-safe response and optionally an HttpOnly/Secure/SameSite cookie for web. The server stores only a hash/token family, rotates on every refresh, detects reuse, revokes the family on reuse, and supports logout/revocation.
- Registration and password reset challenges have purpose, expiry, attempt limits, one-time consumption, rate limits, and generic responses that avoid account enumeration where appropriate. Never log codes or tokens.
- Passwords use a current approved bcrypt/argon configuration; minimum length and breached/common-password policy belong in DTO/service validation. Changing a password revokes refresh sessions according to the account policy.

### Authorization strategy

Use guards for authentication and a policy/ability service for resource permissions. Group policies derive ownership, admin role, membership, and active status from the database. Match and vote services re-check group membership and match eligibility server-side. Object IDs in bodies are never treated as identity claims. Every policy gets positive and negative integration tests.

## 5. Match and voting domain rules

Preserve the concepts of position preferences, shirt numbers, group membership, match date/location, lineups, and player ratings. Fix the old algorithm by defining supported formations and team sizes, validating exact selected membership, using alternate positions correctly, ensuring no player is duplicated/omitted, and failing with a domain error when a valid lineup cannot be generated. Decide explicitly whether one-team small matches or two-team matches are supported; do not infer this from the old `<12` branch.

Voting is permitted only for an authenticated eligible participant, only while the match is in a votable state, with allowed targets and rating range/precision. Enforce one submission per voter per match atomically, reject self-rating if that remains the product rule, and make rating aggregation deterministic. Return numeric ratings in the API unless a string representation is explicitly required by the client contract.

## 6. Legacy reference classification

This table classifies every legacy behavior carried into the design. “Preserve” means preserve domain intent, not the old endpoint or unsafe implementation.

| Legacy reference | Classification | Rebuild treatment |
|---|---|---|
| Users have name, username, email, password, verification state | DOMAIN RULE TO PRESERVE | Keep as explicit User fields with normalization and safe projections. |
| Passwords are bcrypt-hashed | DOMAIN RULE TO PRESERVE | Keep password hashing, with stronger validation/configuration. |
| Only verified users may log in | DOMAIN RULE TO PRESERVE | Enforce in Auth service and guard/session policy. |
| Email verification code is sent after registration | DOMAIN RULE TO PRESERVE | Replace with purpose-bound, hashed, expiring one-time challenge. |
| OTP is used for password reset | DOMAIN RULE TO PRESERVE | Make verification mandatory and cryptographically bound to reset confirmation. |
| Five-minute verification/reset validity stated by email | DOMAIN RULE TO PRESERVE | Use explicit configured TTL and synchronous expiry checks. |
| Six-digit codes | DOMAIN RULE TO PRESERVE | Keep format if product requires it; rate-limit and never log it. |
| Group has members with main/alternate positions and shirt number | DOMAIN RULE TO PRESERVE | Keep aggregate concept, add roles/status/timestamps and constraints. |
| Group owner/creator can manage the group | DOMAIN RULE TO PRESERVE | Formalize owner/admin policies and prevent owner invariant violations. |
| Members can leave; owner can remove members | DOMAIN RULE TO PRESERVE | Separate self-leave and kick commands with authorization and state rules. |
| Invitation expiry, usage limit, and unlimited-use concept | DOMAIN RULE TO PRESERVE | Keep semantics with random high-entropy tokens and atomic acceptance. |
| Four position concepts FWD/MID/DEF/GK | DOMAIN RULE TO PRESERVE | Seed idempotently with unique constraints. |
| Match references a group and stores lineup/player positions | DOMAIN RULE TO PRESERVE | Keep references/snapshots, add status and complete invariant-checked lineup. |
| Ratings range 1–10 in half-point increments | DOMAIN RULE TO PRESERVE | Keep unless product changes; validate at DTO and schema layers. |
| Legacy `<12` match branch and one-team lineup | BUG TO FIX | Define supported match sizes/teams explicitly and reject unsupported input. |
| Alternate-position pass repeats main position | BUG TO FIX | Implement actual alternate-position fallback and test it. |
| Players can be silently omitted or duplicated/invalidly assigned | BUG TO FIX | Validate exact lineup coverage and fail atomically. |
| Away-team participation omitted from user match query | BUG TO FIX | Query all lineup sides through a participant index/query. |
| Null match dereference and broken `.send`/`.error` error paths | BUG TO FIX | Use NestJS exceptions and one global filter. |
| Duplicate position queries/variable shadowing and unused imports | LEGACY IMPLEMENTATION TO DISCARD | Rebuild focused services without copied controller code. |
| Controller-to-controller rating helper import | LEGACY IMPLEMENTATION TO DISCARD | Put rating calculation behind Voting service/repository. |
| Mixed route names, trailing slashes, and inconsistent IDs | LEGACY IMPLEMENTATION TO DISCARD | Use the versioned resource API in this plan. |
| Response helper’s `{success,data,message}` wrapper | LEGACY IMPLEMENTATION TO DISCARD | Use the documented standard envelope; no compatibility requirement on this branch. |
| Public CRUD user endpoints and full User serialization | SECURITY ISSUE TO FIX | Require authentication/authorization and safe response DTOs. |
| Password reset by email and new password alone | SECURITY ISSUE TO FIX | Require consumed reset challenge/token. |
| OTP not consumed, not synchronously expired, unlimited attempts | SECURITY ISSUE TO FIX | Atomic one-time consumption, TTL plus expiry check, attempts/rate limits. |
| OTPs logged; secrets embedded in JWT payload | SECURITY ISSUE TO FIX | Remove logs and minimize purpose-specific claims. |
| Unauthenticated group update | SECURITY ISSUE TO FIX | Owner/admin policy required. |
| Existing invitation returned before membership check | SECURITY ISSUE TO FIX | Authorize before lookup/reuse and avoid token disclosure. |
| Client-supplied voter identity and no target/membership/state checks | SECURITY ISSUE TO FIX | Derive identity from token and enforce Voting policy. |
| Public vote reads | SECURITY ISSUE TO FIX | Require match participant/group authorization. |
| `Math.random` invitation/code generation | SECURITY ISSUE TO FIX | Use cryptographically secure random values and store hashes where appropriate. |
| Missing unique indexes and multi-step duplicate checks | SECURITY ISSUE TO FIX | Normalize, index, and use atomic/transactional writes. |
| Password hashes/verification codes returned by user endpoints | SECURITY ISSUE TO FIX | Projection/DTO denylist and serialization tests. |
| Embedded membership/lineup concepts in MongoDB | DOMAIN RULE TO PRESERVE | Keep where aggregate boundaries and document size remain safe; reassess vote/session/challenge storage. |
| Import-time position upserts and new mail transporter per email | LEGACY IMPLEMENTATION TO DISCARD | Use startup seed/data migration and injected reusable mail provider. |
| Legacy environment names and unvalidated configuration | LEGACY IMPLEMENTATION TO DISCARD | Centralize and validate configuration; map old names only during controlled deployment. |

## 7. OpenAPI strategy

Generate OpenAPI 3 from NestJS decorators and explicit DTOs. Document bearer access authentication, refresh/logout semantics, every request/response schema, error codes, pagination, authorization requirements, and examples. Serve `/api-docs` from the NestJS app and export the specification in CI. Treat the old Swagger Autogen file as an inventory reference, not a contract. Add a breaking-change review when any documented contract changes.

## 8. Test strategy

Use Jest unit tests for token/challenge services, policies, formation algorithms, and rating calculations. Use Mongo-backed integration tests (isolated database or controlled test container) for repositories, indexes, atomic invitation/vote operations, and transactions. Use Supertest E2E tests for:

- register → verify email → login → refresh → logout;
- reset request → verify/confirm → old session policy;
- group creation, invitation acceptance, duplicate shirt numbers, leave/kick, owner permissions;
- valid/invalid formations, membership eligibility, match lifecycle;
- one-vote enforcement, self/foreign target rejection, rating bounds, and authorized reads;
- DTO validation, 401/403/404/409 envelopes, and sensitive-field non-disclosure.

Include concurrency tests for invitation acceptance, duplicate membership, refresh reuse, and voting. Tests should target domain invariants and security boundaries rather than superficial controller coverage.

## 9. Step-by-step implementation checklist

1. Freeze/reference the legacy branch or tag and document the MongoDB collections, indexes, document counts, duplicate identities, malformed references, and environment requirements.
2. Agree on the clean API contract, status codes, error codes, authentication transport for web/mobile, supported match formations, and group role model.
3. Create the NestJS TypeScript foundation, strict compiler settings, validated configuration, global validation pipe, global exception filter, logging, `/api/v1` prefix, and health endpoint.
4. Add MongoDB infrastructure and connection lifecycle handling; add non-destructive schema/data inspection scripts and idempotent position seeding.
5. Implement Positions schemas/service/repository and safe read endpoints with indexes.
6. Implement Users schemas, safe response DTOs, repository, profile/update/delete policy, and password hashing boundary.
7. Implement Auth registration, login, email challenges, access tokens, refresh-session rotation/revocation, logout, and `/auth/me`.
8. Implement password-reset request/confirm with one-time challenge consumption, rate limits, mail templates, and security tests.
9. Implement Groups and embedded membership with owner/admin policies, atomic shirt-number/membership operations, and invitation lifecycle.
10. Implement Matches with explicit lifecycle, eligibility checks, formation validation, deterministic lineup generation, and participant queries.
11. Implement Voting with atomic one-vote constraints, authenticated voter identity, eligible targets, lifecycle checks, and rating reads.
12. Add/execute integration and E2E coverage for all critical workflows and concurrency cases; compare only intended domain outcomes with legacy data.
13. Generate and review OpenAPI from DTOs/controllers; publish the contract and client-facing migration notes for the new resource names.
14. Run security review, dependency/license review, index rollout review, load checks for common queries, and secret/logging audit.
15. Deploy against a controlled environment, monitor errors/latency/auth flows, then decide whether and when the separately preserved legacy branch can be retired. Do not delete legacy files as part of this planning step.

## 10. Explicit non-goals

This plan does not create NestJS source files, modify `package.json`, install dependencies, migrate or delete legacy files, or promise byte-for-byte compatibility with the unsafe Express API. It defines the target behavior and the work needed to build it safely on the existing MongoDB foundation.
