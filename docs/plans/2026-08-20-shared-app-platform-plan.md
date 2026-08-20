# A-Guy Shared App Platform Plan

**Status:** approved and in progress
**Date:** 2026-08-20
**Complexity:** high, delivered in independently reversible phases

## Decision

Create one shared package repository for reusable frontend infrastructure and the typed API client. Keep A-Guy-Web as the only backend, authentication, session, database, and secret owner for now. Add `api.aguy.co.il` as the durable API hostname without moving the backend implementation yet.

Recommended repository layout:

```text
A-Guy-Shared/
  packages/
    ui/          -> @a-guy/ui
    api-client/  -> @a-guy/api-client
```

Applications remain independently deployable:

```text
www.aguy.co.il      -> A-Guy-Web
dash.aguy.co.il     -> A-Guy-Dash
teacher.aguy.co.il  -> A-Guy-Teacher
api.aguy.co.il      -> A-Guy-Web API routes initially
```

## Requirements

- Dash and Teacher use the same header, navigation, theme, locale, direction, design tokens, and brand behavior as Web.
- Each application owns only its product pages and app-specific authorization.
- Login and logout remain single sign-on across `*.aguy.co.il`.
- Only A-Guy-Web creates and verifies sessions or accesses the users database.
- Dash and Teacher never receive `PAYLOAD_SECRET`, a MongoDB URL, or backend provider secrets.
- Consumers call one typed API client instead of duplicating fetch, cookie forwarding, 401 handling, or response types.
- `api.aguy.co.il` becomes the preferred API origin while existing `www.aguy.co.il/api/*` URLs continue working during migration.
- The dashboard route is not restored to A-Guy-Web.

## Non-goals

- Do not create an A-Guy-API repository in this migration.
- Do not move Payload, collections, jobs, hooks, services, sessions, or database access.
- Do not add a second login page or a second authentication implementation.
- Do not make UI packages depend on application routes, server secrets, or Payload.
- Do not keep Teacher as a permanent full clone of Web.

## Ownership

| Concern | Owner |
|---|---|
| Login, logout, users, sessions, JWT signing and revocation | A-Guy-Web |
| Database, Payload, jobs and server services | A-Guy-Web |
| Public API implementation | A-Guy-Web initially |
| API request and response contract | A-Guy-Web, published through `@a-guy/api-client` |
| Header, navigation primitives, theme, locale, direction and design tokens | `@a-guy/ui` |
| Dashboard pages and dashboard authorization | A-Guy-Dash |
| Teacher pages and teacher authorization | A-Guy-Teacher |
| Marketing and student web pages | A-Guy-Web |

## Phase 0: Baseline and safety gates

1. Record the exact versions, production deployment IDs, environment variables, and working URLs for all three applications.
2. Capture desktop and mobile screenshots of Web's header, locale selector, theme selector, login state, and logout behavior.
3. Add or confirm browser tests for login on Web followed by authenticated refresh on Dash and Teacher.
4. Add or confirm the reverse logout test: logout from a sibling app, then refresh Web and verify the session is gone.
5. Inventory the Web components before extraction and classify each as pure shared UI, shared adapter, or app-specific code.

**Gate:** no extraction begins until current SSO behavior and all three rollback targets are recorded.

## Phase 1: Create the shared packages

1. Create `A-Guy-Shared` with pnpm workspaces, TypeScript, React 19, Next 15 compatibility, Vitest, ESLint, and Prettier.
2. Create `@a-guy/ui` as a framework-safe package with explicit exports.
3. Move only reusable design tokens, theme initialization, locale/direction primitives, brand primitives, navigation building blocks, and shell components.
4. Keep application links and navigation entries supplied as data by each consumer; the shared package must not decide which app pages exist.
5. Keep server-only and client-only entry points explicit so browser bundles cannot import environment or secret-reading code.
6. Add unit tests for theme persistence, locale switching, RTL/LTR direction, navigation rendering, and authenticated/anonymous header states.
7. Publish an initial immutable package version and document the update process.

**Gate:** a small fixture application renders the shell in English and Hebrew, light and dark themes, without importing A-Guy-Web internals.

## Phase 2: Define the API contract and client

1. Inventory the API operations actually needed by Dash and Teacher; do not expose all Web endpoints automatically.
2. Define stable request, success, and error schemas for those operations using shared TypeScript and runtime validation.
3. Create `@a-guy/api-client` with:
   - configurable base URL, defaulting to `https://api.aguy.co.il` in production;
   - server-side cookie forwarding;
   - browser-side `credentials: 'include'`;
   - consistent JSON parsing and typed errors;
   - one 401 result contract without automatic retry;
   - no token reading, token storage, JWT verification, or secret access.
4. Keep login and logout helpers aligned with the existing shared-login contract:
   - login redirects to `https://www.aguy.co.il/login?returnTo=...`;
   - logout calls the platform logout endpoint and ends the session for every app.
5. Add contract tests against Web API route handlers and mock transport tests in the package.
6. Version API changes explicitly; breaking changes require a new major contract version or a compatible transition period.

**Gate:** Dash and Teacher can resolve the current user through the client without receiving backend secrets.

## Phase 3: Add `api.aguy.co.il`

1. Add `api.aguy.co.il` to the existing A-Guy-Web Vercel project, not a new deployment.
2. Configure DNS and wait for authoritative DNS and TLS verification.
3. On the API hostname, serve `/api/*`; return a small health response or 404 for ordinary web routes so it cannot become another copy of the website.
4. Confirm sibling-origin CORS, cookies, trusted return URLs, rate limits, security headers, and observability use the real host safely.
5. Keep `https://www.aguy.co.il/api/*` working as a compatibility endpoint.
6. Prove anonymous 401, authenticated current-user access, dashboard data access, teacher data access, and logout against the production hostname.

**Gate:** production API smoke tests pass from Web, Dash, and Teacher before any consumer changes its default base URL.

## Phase 4: Upgrade A-Guy-Dash

1. Install pinned versions of both shared packages.
2. Replace the minimal local shell, hardcoded light theme, and incomplete locale behavior with `@a-guy/ui`.
3. Replace direct or duplicated API calls with `@a-guy/api-client`.
4. Keep dashboard metrics components and admin authorization inside A-Guy-Dash.
5. Verify responsive header, mobile navigation, English/Hebrew, RTL/LTR, light/dark theme, login redirect, authenticated reload, 401 handling, and global logout.
6. Deploy Dash independently and perform production browser verification.

**Gate:** Dash has Web-quality shared infrastructure without regaining a `/dashboard` route in Web.

## Phase 5: Slim A-Guy-Teacher

1. Start from the verified Teacher production behavior, then remove Web-only pages, Payload administration, jobs, backend services, secrets, and unrelated dependencies in small commits.
2. Install the shared UI and API client packages.
3. Keep teacher-specific lessons, exercises, grading, progress, and analytics in A-Guy-Teacher.
4. Make all server data access go through the API client unless a future service is explicitly teacher-owned.
5. Verify the same theme, locale, mobile, SSO, authorization, and logout matrix used for Dash.
6. Deploy after each reversible removal group rather than deleting the clone in one step.

**Gate:** Teacher builds and runs without MongoDB, `PAYLOAD_SECRET`, or copied Web backend code.

## Phase 6: Remove duplication and enforce boundaries

1. Delete local copies only after both consumers use the released packages in production.
2. Add checks preventing shared source files from being copied back into consumer repositories.
3. Add dependency checks preventing `@a-guy/ui` from importing Web, Dash, Teacher, database, auth-secret, or Payload modules.
4. Add API contract compatibility checks to Web CI and consumer update checks to Dash and Teacher CI.
5. Document package ownership, release policy, upgrade policy, and emergency rollback.

## Test matrix

Every release must cover:

| Scenario | Web | Dash | Teacher |
|---|---:|---:|---:|
| Anonymous page behavior | yes | yes | yes |
| Login once, refresh all apps authenticated | source | yes | yes |
| Logout once, refresh all apps anonymous | yes | yes | yes |
| Expired or revoked session returns 401 | yes | yes | yes |
| English and Hebrew | yes | yes | yes |
| LTR and RTL | yes | yes | yes |
| Light and dark theme | yes | yes | yes |
| Desktop and mobile navigation | yes | yes | yes |
| App-specific authorization | yes | admin | teacher |
| API contract compatibility | provider | consumer | consumer |

Production proof must use `www.aguy.co.il`, `dash.aguy.co.il`, `teacher.aguy.co.il`, and `api.aguy.co.il`; localhost or mocked tests are not production proof.

## Risks and controls

- **High: shared-cookie compromise.** Any XSS on a sibling subdomain can threaten the shared session. Keep all apps controlled, enforce CSP/security headers, and never host untrusted executable content on an A-Guy subdomain.
- **High: accidental second backend.** Prevent Dash and Teacher from receiving database or auth secrets; CI should fail on forbidden variables/imports.
- **High: contract drift.** Runtime schemas, provider contract tests, pinned package versions, and compatibility windows are required.
- **Medium: shared package becomes app-specific.** Consumers provide routes, labels, capabilities, and user state through typed inputs; packages provide reusable behavior only.
- **Medium: coordinated release failures.** Publish immutable versions, upgrade one consumer at a time, and retain the previous production deployment.
- **Medium: hostname migration breaks clients.** Keep the `www` API origin working until production traffic and logs show all intended consumers have moved.

## Rollback

- Shared package problem: pin the previous package version and redeploy only the affected consumer.
- API hostname problem: switch the API client base URL back to `https://www.aguy.co.il` without changing authentication or data ownership.
- Consumer migration problem: restore that application's previous production deployment; do not roll back the other applications automatically.
- SSO regression: stop the rollout and restore the last verified Web deployment because Web owns the session contract.

## When a separate A-Guy-API repository becomes justified

Reconsider extraction only when all of these are true:

- the public API contract has been stable through real Dash and Teacher use;
- route handlers depend on explicit service interfaces rather than Web application internals;
- API deployment or scaling needs differ materially from Web;
- database, jobs, session verification, secret ownership, observability, migrations, and rollback have an explicit new owner;
- moving the API reduces operational coupling rather than merely adding another repository.

Until then, `api.aguy.co.il` is a stable public boundary backed by A-Guy-Web.

## Completion criteria

- Dash and Teacher use released `@a-guy/ui` and `@a-guy/api-client` versions.
- Web, Dash, and Teacher share visual infrastructure without copied source.
- SSO and global logout pass on desktop and mobile in production.
- Dash and Teacher contain no Web database, session-signing, or backend secrets.
- `api.aguy.co.il` is live, monitored, TLS-secured, and used by both consumer apps.
- `www.aguy.co.il/dashboard` is absent and does not proxy or redirect to a duplicate dashboard page.
- Teacher no longer contains the full A-Guy-Web application.
- Each repository builds, tests, deploys, and rolls back independently.

## Approval checkpoint

No implementation should begin until the repository name, package publication location, and phased order above are approved.
