Added @ai-summary headers to all 23 source files in src/infra/analytics/ — zero test files or docs touched.

Key gotcha documented: refreshUserEntitlementsInMixpanel() in system-events-subscriber.ts runs in the browser bundle and MUST NOT call Payload directly (would drag grpc/fs/tls into client bundle). All user data reads go through /api/users/me.

All 20 source files now have @ai-summary headers capturing purpose and traps. README.md was not modified (it already documents the architecture correctly). Quality gate (typecheck + lint) passed on first attempt.
