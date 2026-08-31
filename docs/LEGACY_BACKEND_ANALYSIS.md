# Legacy Backend Analysis

Analysis of the repository as inspected on 2026-08-31. This document describes the Express/Mongoose implementation; it does not describe a replacement API. “Confirmed” means directly observable in source. “Assumption” identifies behavior that depends on runtime data, Mongoose defaults, or code that is malformed/incomplete.

## 1. Current Confirmed Behavior

### Runtime and global behavior

- `app.js` loads `express-async-errors`, dotenv, the database module, routers, Swagger UI, and CORS. JSON parsing is enabled.
- `GET /` returns HTTP 200 `{ "message": "index" }` (not the common response wrapper).
- All API routers are mounted below `/api`. Swagger UI is at `/api-docs` and serves the committed `swagger.json`.
- CORS allows only `http://localhost:5173`; credentials are not configured. `PORT` is passed to `app.listen`.
- There is no 404 middleware. Unmatched routes therefore receive Express’s default response.
- `errorHandler.middleware.js` returns `{success:false,message}` for `APIError`, using its status; all other errors return HTTP 500 and `Internal Error: <message>`. It is registered after routes.
- `Response` emits `{success:true,data,message}`, defaulting to `data:null`, status 200, and message `Operation is successful.`. Controllers sometimes use raw JSON or incorrectly call methods that do not exist, so actual error behavior is not uniform.
- No request DTO/schema validation, rate limiting, request size policy, or centralized logging is present.

### Complete endpoint inventory

Base URL is `/api` (examples use `http://localhost:3000/api`). Parameters are path parameters unless explicitly called query parameters; no controller reads query parameters.

| Method/path | Auth | Input | Confirmed behavior / response |
|---|---|---|---|
| GET `/` | none | none | `{message:"index"}`, 200. |
| POST `/auth/login` | none | body `email,password` | Finds `{email,isVerified:true}`, compares bcrypt password, returns JWT in `data`, 200. Missing/unverified or wrong password: `APIError`, 401. |
| POST `/auth/register` | none | body `nameSurname,username,email,password` | Deletes old unverified users with same username (>5 minutes), rejects verified duplicate email or any remaining duplicate username, hashes password, creates user, emails a six-digit code, and returns a JWT with literal `5m` expiry, 201 with token and message. Email failure prevents response and reaches generic 500. |
| POST `/auth/confirmMail` | none | body `token,verificationCode` | Verifies JWT, loads user by `sub`, compares code with loose inequality, marks verified and deletes unverified users with JWT email; success wrapper 200. JWT errors are not converted to a defined API error. |
| GET `/users/profile` | Bearer JWT | none | Returns middleware’s projected user (`_id,nameSurname,email`), wrapper 200. |
| GET `/users/` | none | none | Returns every User document, including password and verificationCode, raw `{success:true,data}`. |
| GET `/users/:id` | none | `id` | Returns complete User document, including sensitive fields, wrapper 200; absent user is APIError 404. |
| POST `/users/` | none | arbitrary body | Hashes `password` if present, constructs/saves User, returns complete saved document, wrapper 201. Mongoose required fields still apply. |
| PATCH `/users/:id` | none | `id`; arbitrary body except controller deletes `createdAt`,`updatedAt` | Hashes password if supplied; `findByIdAndUpdate(...,new:true,runValidators:true)`, returns complete user wrapper 200 or APIError 404. |
| POST `/users/change-password` | Bearer JWT | body `currentPassword,newPassword` | Checks current bcrypt password, hashes replacement; incorrect current password raw 400; success wrapper with `{message:"Password updated successfully"}`. |
| DELETE `/users/` | Bearer JWT | none | Deletes the authenticated user and returns deleted document wrapper 200. |
| GET `/groups/` | Bearer JWT | none | Finds groups containing user, populates positions, then filters each returned group’s members to the current user only; wrapper 200. Query errors are returned as successful-looking wrapper with status 500. |
| GET `/groups/:id` | Bearer JWT | `id` | Only members can see group. Populates member users/positions and creator; absent or non-member is wrapper 404 `Group not found`. |
| POST `/groups/` | Bearer JWT | body `groupName,mainPosition,altPosition,shirtNumber` | Adds authenticated user as first member using positions found by abbreviation; saves and returns populated group wrapper 201. Missing positions can throw before the local try/catch. |
| POST `/groups/join` | Bearer JWT | body `invitationToken,mainPosition,altPosition,shirtNumber` | Validates invitation existence, expiry, usesLeft, group, duplicate membership, and shirt number; adds member, decrements usesLeft, saves both documents, returns populated group wrapper 201. |
| POST `/groups/invite` | Bearer JWT | body `groupId` | Reuses existing unexpired invitation for that group without checking requester membership first; otherwise checks membership, creates random six-digit token, expiry one hour, unlimited uses (`-1`), wrapper 201. |
| PATCH `/groups/:id` | none (router omission) | `id`; body `groupName` | Updates any group by id, no membership/creator authorization, wrapper 200 or wrapper 404. |
| DELETE `/groups/:id` | Bearer JWT | `id` | Intended creator-only deletion; compares `group.createdBy` with `req.user.id`, returns wrapper 403/404/200. Because middleware projects `_id` and Mongoose documents commonly expose `id`, this is runtime-dependent but likely works. |
| POST `/groups/leave` | Bearer JWT | body `userId,groupId` | Creator may remove any specified user; any user may remove themself; otherwise wrapper 403. Saves filtered members and returns wrapper with string data. No protection for creator leaving or missing target membership. |
| POST `/matches/` | Bearer JWT | body `groupId,players[],formation,matchDate,location` | Requires requester’s membership, selects listed group members, creates a lineup for fewer than 12 players, returns saved match wrapper 200. For 12+ selected players `newMatch` is never assigned (assumption: request crashes with 500). |
| GET `/matches/byGroup/:groupId` | Bearer JWT | `groupId` | Requires group membership; returns matches for group sorted `matchDate:-1`, wrapper 200. |
| GET `/matches/byUser` | Bearer JWT | none | Searches only `lineup.homeTeam.user.user` for current user, sorted newest first, wrapper 200. Error path calls nonexistent `APIError.send` (assumption: becomes generic failure). |
| GET `/matches/:matchId` | Bearer JWT | `matchId` | Loads/populates match, then checks group membership, computes average ratings, adds `rating` to each player; wrapper 200. Missing match is dereferenced before a useful not-found response. Error path calls nonexistent `Response.error`. |
| POST `/voting/vote` | Bearer JWT | body `matchId,votes[]`; only `votes[0]` is used | Requires basic array fields, finds match, rejects self-vote by supplied `voterId`, appends vote to one Voting document or creates it, marks matching lineup player `hasVoted`, saves match. All outcomes, including errors, use a successful-looking `{success:true,data:null,message}` wrapper with status 200/derived error status. |
| GET `/voting/:id` | none | `id` | Returns Voting document by `matchId`, wrapper 200. Error path incorrectly invokes `APIError.success`. |
| POST `/otp/send-otp` | none | body `email` | Requires any existing user, creates six-digit OTP, stores it, logs it, emails reset email; wrapper data is `{success:true,message:"OTP başarıyla oluşturuldu"}`. Existing unique email can cause duplicate-key failure. |
| POST `/otp/verify-otp` | none | body `email,otp` | Finds OTP by email and compares exact string; does not delete/consume it and does not explicitly check age (TTL handles eventual deletion). Wrapper data says verified. |
| POST `/otp/reset-password` | none | body `email,newPassword` | Finds user and changes password after hashing. It does not require a verified OTP or token. Wrapper data says reset succeeded. |

### Authentication and JWT

`createToken` signs payload `{sub:_id,nameSurname,email,username}` with `process.env.JWT_SECRET`, algorithm HS512, and the supplied expiry. Login uses `JWT_EXPIRES_IN`; registration uses literal `5m`. `checkToken` reads the second whitespace-separated Authorization token, rejects absent or failed verification with 401, then loads the user by `decoded.sub` selecting only `_id,nameSurname,email` and assigns it to `req.user`. It does not explicitly constrain algorithms, check verification status, or preserve username in `req.user`.

### Models, fields, and relationships

- **User / `users`**: required trimmed `nameSurname`; required lowercase trimmed `username` and `email`; required trimmed `password`; required `isVerified` default false; required numeric `verificationCode`; timestamps. No unique indexes on email/username are declared.
- **Group / `groups`**: required trimmed `groupName`; `members[]` (subdocuments `_id:false`) with User ref `user`, number `shirtNumber`, required Position refs `mainPosition` and `altPosition`; User ref `createdBy`; timestamps.
- **GroupInvitation / `groupInvitations`**: required Group ref `groupId`, unique required token, `expireAt` indexed with TTL `'1h'`, `usesLeft` default -1. Controller sets expiry one hour; TTL deletion is asynchronous.
- **Match / `matches`**: required `matchDate`, required Group ref `createdGroupId`, required `location`, timestamps; embedded `lineup.homeTeam` and `awayTeam` player objects. Each embeds User ref at `user.user`, shirt number, Position refs for main/alternate position, lineup Position ref, and `hasVoted` default false.
- **Voting / `votings`**: required Match ref `matchId`; embedded votes with User ref `voterId` and voted User refs/rating. Ratings are required, 1–10, integer or half-integer. No uniqueness constraint on matchId or voterId.
- **Position / `positions`**: required trimmed name, trimmed abbreviation, timestamps. Import triggers `Position.init()` and upserts four names: FWD, MID, DEF, GK. No uniqueness index is declared.

### Domain logic and utilities

- Registration cleanup and email verification are in `auth.controller`; password hashing/login are also there. OTP reset workflow is separately duplicated in `otp.controller`.
- Group membership, shirt-number uniqueness, invitation lifecycle, creator deletion, and leave/kick rules are all controller logic. Invitation tokens use `Math.random`; `crypto` is imported but unused. Group creation redundantly queries positions twice and shadows variables.
- Match formation logic is in `match.controller.createLineup`: parses `D-M-F`; fills main positions, but the intended alternate-position pass repeats `mainPosition` (confirmed bug), then assigns leftovers to GK/DEF/MID/FWD. It can silently omit players and does not validate formation or player count.
- Voting persistence and rating calculation are in `voting.controller`; match details directly imports that controller helper, coupling controllers. Averages are returned as one-decimal strings from `toFixed(1)`.
- Email utilities create a new Gmail SMTP transporter for every message. Verification mail uses `from: process.env.USER`; reset mail uses `from: process.env.MAIL`; both use `MAIL`/`PASS` credentials and embed an HTML OTP. Text claims five-minute validity.

## 2. Risks / Problems

### Confirmed or directly observable

- User listing, user lookup, user creation, user update, and group update are unauthenticated. Sensitive user fields, especially password hashes and verification codes, are returned.
- Password reset is possible with only an email; OTP verification is not linked to reset, consumed, rate-limited, or checked synchronously for expiry. OTPs are logged in plaintext.
- JWT secret and all SMTP behavior depend on environment variables with no startup validation. JWT registration token includes user data and is accepted by `confirmMail` without an explicit purpose claim; malformed/expired verification JWTs are not normalized.
- `groups/invite` returns an existing invitation before checking membership, potentially disclosing/using a group invitation to any authenticated caller who knows a group id.
- Vote authorization trusts client-supplied `voterId`; it does not verify voter membership, that voter is authenticated requester, that targets are match players, that voting is open, or that a voter has not already voted. Public vote reads expose voting data.
- Match detail dereferences a null match; the documented error paths use nonexistent methods (`Response.error`, `APIError.send`). Similar malformed error paths exist in OTP and voting. These produce inconsistent or secondary errors.
- Registration duplicate checks and invitation membership/use updates are multi-step, non-transactional operations. Concurrent requests can create duplicate users/invitations, duplicate shirt numbers, overspend invitation uses, or lose group updates.
- `users` has no database uniqueness constraints; `groupId` in Voting is not unique; positions are not unique. TTL indexes delete eventually rather than at the exact expiry instant.
- Match creation can leave invalid/incomplete lineups, ignores away-team creation, has a 12-player crash path, does not ensure all selected players belong to the group, and performs an unindexed full Position read.
- `getMatchesByUserId` excludes away-team participation. Group list mutates response documents to return only the current member, unlike group detail.
- Raw request bodies are trusted, updates permit broad User field changes, and no validation/sanitization limits password, email, identifier, formation, date, rating, or array shapes beyond selected Mongoose rules.

### Likely / runtime-dependent concerns

- Mongoose cast errors, SMTP errors, malformed ObjectIds, and duplicate-key errors generally reach generic 500 handling rather than stable API errors. Exact output depends on Express async-error propagation.
- `req.user.id` is expected to work as Mongoose’s virtual string id, but the middleware explicitly selects `_id`; this should be verified in integration tests before migration.
- `Position.init()` runs on module import while database connection startup is asynchronous; initialization timing and duplicate upserts are not coordinated. `expireAt` is declared with a TTL option but the controller also manually checks expiry.

### Architecture and naming inconsistencies

Routes use mixed singular/plural naming and verbs (`confirmMail`, `send-otp`, `byGroup`, `leave`), trailing-slash variants, and inconsistent `id` names. Controllers mix direct persistence, response formatting, authorization, email, and domain algorithms. There are duplicate variable declarations/queries, unused imports, controller-to-controller imports, mixed Turkish/English messages, and no tests or schema/API contract validation.

## 3. Future Migration Recommendations

These are recommendations, not changes to current behavior.

1. Preserve the route/response compatibility surface first, then introduce versioned NestJS routes deliberately. Build an endpoint contract table and characterization tests for status, body, populated fields, and known failure paths.
2. Create feature modules around auth (including OTP), users, groups/invitations, matches, and voting. Keep controllers transport-only; move authorization and workflows into services, and isolate Mongoose queries in repositories where they are repeated or complex.
3. Add explicit DTOs and validation with `class-validator`/`class-transformer`; use response DTOs that never expose password, verificationCode, or persistence internals. Normalize errors with stable codes only behind an intentional compatibility boundary.
4. Redesign authentication with explicit access/refresh token purposes, algorithm configuration, verified-user checks, logout/revocation, secure OTP challenge state, one-time consumption, rate limiting, and safe password-reset proof. Do not change deployed semantics without a migration plan.
5. Add database constraints and indexes after checking existing data: normalized unique email/username, invitation token and appropriate group lookup indexes, voting match uniqueness strategy, and position uniqueness. Use atomic updates or transactions for invitation uses, membership changes, duplicate prevention, and voting.
6. Specify match invariants: valid formation, exact eligible group members, both teams where intended, deterministic fallback/alternate positions, lifecycle/status, and authorization for creation, viewing, and voting. Add integration tests for concurrency and every critical permission rule.
7. Centralize configuration with validated environment schemas (`PORT`, `DB_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `MAIL`, `PASS`, and sender settings), structured logging, and a reusable mail provider. Keep secrets out of source and logs.
8. Replace Swagger Autogen with an accurate NestJS OpenAPI definition only after comparing generated/current `swagger.json` with runtime routes. Preserve `/api-docs` compatibility as needed and document any renamed endpoint.
9. Add Jest/Supertest characterization tests before removing legacy code, prioritizing auth/OTP, user exposure controls, group invitations/membership, match formation, voting authorization, and error handling. Remove the Express implementation only after parity and data migration checks.

### Configuration and documentation gaps

The code references `PORT`, `DB_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `MAIL`, `PASS`, and `USER`. No `.env.example`, startup validation, or environment-specific configuration files are present. `swagger.js` declares OpenAPI 3 generation with title/description, `host: localhost:3000/api`, and `schemes: ['http']`; the committed output is served directly by Swagger UI. The generated document should be treated as supplementary because it does not itself establish authentication enforcement or complete response schemas.
