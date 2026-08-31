# Halisaha Service — Codex Instructions

## Project Context

This repository is the backend service of Halisaha App.

The application will eventually support:

- React Web
- React Native / Expo for Android and iOS
- A shared backend API for all clients

The current backend is a legacy Express.js application written in JavaScript and uses MongoDB through Mongoose.

Current stack:

- Node.js
- JavaScript
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt
- Nodemailer
- Swagger Autogen

The backend is going to be incrementally refactored into a production-ready NestJS + TypeScript application.

Target backend stack:

- Node.js
- TypeScript
- NestJS
- MongoDB
- Mongoose / @nestjs/mongoose
- JWT authentication
- OpenAPI / Swagger
- Jest
- Supertest

Do not assume the existing behavior is disposable. Existing API behavior and business rules must first be understood and documented before they are changed.

---

## Core Refactoring Principle

Do NOT perform a big-bang rewrite.

The migration must be incremental.

Preferred process:

1. Analyze the existing implementation.
2. Document current behavior.
3. Identify business rules and dependencies.
4. Propose the smallest reasonable refactor.
5. Implement one isolated change.
6. Run relevant tests.
7. Review the resulting diff.
8. Continue with the next isolated change.

Existing production behavior must be preserved unless the task explicitly requests a behavior change.

---

## Legacy Architecture

The current source structure is approximately:

```text
src/
├── config/
├── controllers/
├── middlewares/
├── models/
├── routers/
└── utils/
```

Important legacy domains currently include:

- authentication
- users
- groups
- group invitations
- matches
- voting
- OTP
- player positions

During analysis, determine the real domain relationships instead of assuming every current file should become a separate NestJS module.

For example:

- OTP may belong to authentication.
- Group invitations may belong inside the groups domain.
- Positions may belong to users, matches, or a shared domain.

Make architectural recommendations based on actual usage in the codebase.

---

## Target Architecture

The target architecture is feature-oriented.

Preferred high-level structure:

```text
src/
├── main.ts
├── app.module.ts
│
├── config/
│
├── common/
│   ├── decorators/
│   ├── exceptions/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── utils/
│
├── infrastructure/
│   ├── database/
│   └── mail/
│
└── modules/
    ├── auth/
    ├── users/
    ├── groups/
    ├── matches/
    └── voting/
```

A feature module may use a structure such as:

```text
modules/
└── matches/
    ├── controllers/
    ├── services/
    ├── repositories/
    ├── schemas/
    ├── dto/
    ├── interfaces/
    └── match.module.ts
```

Do not create unnecessary abstraction layers purely for architectural appearance.

Repositories should be introduced where isolating persistence logic provides clear value.

---

## Layer Responsibilities

### Controller

Controllers are responsible only for transport-layer concerns.

They may:

- receive request input
- invoke DTO validation
- access authenticated user information
- call application services
- return responses

Controllers must NOT contain substantial business logic or database queries.

---

### Service

Services contain application and business logic.

Examples:

- permission checks
- group membership rules
- match creation rules
- voting rules
- invitation workflows
- authentication workflows

Services should not depend directly on Express request or response objects.

---

### Repository

Repositories isolate persistence behavior where useful.

Examples:

- MongoDB queries
- Mongoose query composition
- persistence-specific filtering
- aggregation pipelines

Business decisions must not be hidden inside repositories.

---

### Schema

Mongoose schemas describe persistence models.

Do not expose persistence schemas directly as API contracts when a DTO or response model is more appropriate.

---

### DTO

Request DTOs and response DTOs should be explicit where useful.

Use:

- class-validator
- class-transformer

Avoid trusting raw request payloads.

---

## API Design

The future API should support versioning.

Preferred prefix:

```text
/api/v1
```

Example:

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/users/me
GET  /api/v1/groups
POST /api/v1/matches
```

Do not silently rename or remove existing endpoints during migration.

If an endpoint should change, document:

- current endpoint
- proposed endpoint
- compatibility impact
- migration strategy

---

## Web and Mobile Compatibility

The backend must remain client-independent.

It must support both:

- React Web
- React Native / Expo

Never introduce browser-only assumptions into backend API behavior.

Authentication flows must eventually support mobile secure token storage and web authentication.

Avoid making API contracts dependent on frontend implementation details.

---

## Authentication

Authentication requires special care because the future application will have web and mobile clients.

The target authentication architecture will likely include:

- access tokens
- refresh tokens
- logout/revocation flow
- authenticated `/me` endpoint
- OTP verification where required

Do not implement the final authentication architecture without first documenting the existing authentication and OTP behavior.

Security-sensitive behavior must not be changed casually.

---

## Error Handling

The target backend should eventually have a consistent error model.

Preferred conceptual shape:

```json
{
  "data": null,
  "error": {
    "code": "MATCH_NOT_FOUND",
    "message": "Match could not be found."
  }
}
```

Business logic should expose stable machine-readable error codes where useful.

Frontend clients should not need to parse error message text to determine application behavior.

During legacy migration, preserve existing response behavior unless explicitly instructed otherwise.

---

## API Responses

Do not introduce response wrappers globally without considering compatibility with the current frontend.

First document the current response structures.

Any future standardization should be introduced intentionally.

---

## Database

The current database is MongoDB.

MongoDB will remain the database during the initial backend refactor.

Do NOT migrate the application to PostgreSQL or another database unless explicitly requested.

Use NestJS MongoDB integration through:

```text
@nestjs/mongoose
mongoose
```

when the NestJS migration begins.

During analysis, identify:

- model relationships
- ObjectId references
- embedded documents
- indexes
- uniqueness constraints
- queries that may cause performance issues
- possible concurrency issues
- potentially missing database constraints

---

## Match and Voting Integrity

Match creation, membership, voting, invitations, and related workflows are considered important business logic.

When changing these areas:

- understand existing behavior first
- identify authorization rules
- identify concurrency risks
- preserve domain invariants
- add tests before or together with behavioral changes

Do not rely exclusively on frontend validation for critical rules.

---

## Tests

The legacy project currently has little or no automated test infrastructure.

The target test stack is:

- Jest
- Supertest

Preferred priorities:

1. Integration tests for critical business workflows.
2. E2E tests for important API flows.
3. Unit tests where business logic is isolated and meaningful to test.

Critical areas include:

- authentication
- OTP verification
- group membership
- group invitations
- match creation
- voting
- authorization and permissions

Do not generate large quantities of superficial tests merely to increase coverage.

---

## OpenAPI

The target backend should expose an accurate Swagger/OpenAPI specification.

OpenAPI will eventually be used as an API contract between:

- NestJS backend
- React Web
- React Native mobile application

When the NestJS migration begins, prefer `@nestjs/swagger`.

The existing Swagger Autogen setup should first be analyzed before replacement.

---

## Configuration

Application configuration must eventually be centralized.

Environment-specific configuration should support:

- local
- development
- staging
- production

Secrets must never be committed to the repository.

The repository should eventually contain an `.env.example` file documenting required environment variables without real secret values.

---

## Logging

Avoid uncontrolled production `console.log` usage.

The target backend should eventually have structured application logging.

Do not introduce a complex observability stack during early migration unless explicitly requested.

---

## Dependency Policy

Before adding a new dependency:

1. Check whether NestJS or the existing stack already provides the required functionality.
2. Avoid duplicate libraries solving the same problem.
3. Avoid unnecessary abstractions.
4. Prefer actively maintained, widely used packages.

Do not upgrade all dependencies at once during architectural refactoring unless required.

Dependency upgrades and architecture changes should preferably be separate changes.

---

## Coding Style

For new TypeScript code:

- use strict typing
- avoid `any` unless genuinely necessary
- prefer explicit domain types
- prefer async/await
- keep functions focused
- prefer readable code over clever abstractions
- avoid unnecessary inheritance
- avoid premature generic frameworks
- use descriptive names

Do not perform unrelated formatting across the entire repository while implementing a focused change.

Keep diffs reviewable.

---

## Git and Change Scope

Do not modify unrelated files.

Do not delete legacy implementations until their replacement is verified.

Prefer small commits and small diffs.

For every requested implementation:

1. inspect the relevant files
2. state what needs to change
3. make only the required changes
4. run relevant validation/tests
5. inspect the resulting diff
6. report any remaining risks

---

## Current Migration Roadmap

The expected migration order is currently:

```text
1. Legacy backend analysis
2. NestJS foundation
3. Common infrastructure
4. Authentication + OTP
5. Users
6. Groups + invitations
7. Matches
8. Voting
9. Automated tests
10. OpenAPI stabilization
11. Remove legacy Express implementation
12. Mobile readiness review
```

This roadmap may change after legacy analysis.

Do not treat it as permission to implement later phases unless explicitly requested.

---

## Current Task Safety Rule

When asked to analyze the repository:

DO NOT modify application code unless explicitly instructed.

When asked to create documentation only:

Only create or update the requested documentation files.

When asked to implement one migration step:

Do not automatically continue with subsequent migration steps.

---

## First Analysis Goal

Before beginning the NestJS migration, create a complete picture of the legacy backend.

The analysis should identify:

- every REST endpoint
- HTTP method
- route path
- authentication requirements
- request params
- query params
- request bodies
- response structures
- status codes where identifiable
- controllers used
- models used
- model relationships
- JWT behavior
- OTP behavior
- mail behavior
- authorization rules
- group membership rules
- invitation rules
- match rules
- voting rules
- business logic located in controllers
- business logic located in utility functions
- possible bugs
- security risks
- architecture problems
- database consistency risks

Analysis must distinguish between:

- confirmed behavior from code
- likely behavior inferred from code
- recommendations for the future architecture

Do not mix current behavior with proposed behavior.
