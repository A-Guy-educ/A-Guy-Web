Added `@ai-summary` headers to 6 source files in `src/server/api/` and created a folder-level `README.md` documenting the module's purpose, entry point, file map, and three load-bearing gotchas.

Files touched:
- `auth.ts` — `@ai-summary` notes the throw-vs-return behavior of admin/auth guards
- `logger.ts` — `@ai-summary` calls out the OpenTelemetry trace context attachment
- `capture-and-respond.ts` — `@ai-summary` clarifies this is only for routes that skip `withApiHandler`
- `responses.ts` — `@ai-summary` notes that all routes should use these factories for consistency
- `schemas/job-schemas.ts` — `@ai-summary` flags the stricter ObjectId regex as a copy-paste trap
- `with-api-handler.ts` — `@ai-summary` explains the operational-vs-system error distinction and the 400/500 split
- `README.md` (new) — folder-level doc with entry point, file map, and gotchas

`index.ts` and `schemas/index.ts` are bare re-export barrels and were left unchanged per the issue's "0/6" count (those are not source modules).
