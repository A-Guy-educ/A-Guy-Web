Resolving merge conflicts in 3 files under `src/infra/loading/`:

- **LoadingManager.ts**: HEAD (PR) had `@fileType utility @domain frontend`; origin/dev had richer JSDoc with `@pattern loading-state-manager` and a more descriptive `@ai-summary`. Took origin/dev's JSDoc — it's a superset and more useful for doc coverage.

- **README.md**: HEAD had verbose content (extra tables, "Common Tasks", "The Load-Bearing Gotcha"); origin/dev had a cleaner, more structured version with a proper "Gotchas" section. Took origin/dev's — cleaner and more accurate.

- **index.ts**: Same JSDoc conflict pattern as LoadingManager.ts. Took origin/dev's richer JSDoc.

All three conflicts were purely doc/metadata — the actual implementation code was identical on both sides. No implementation decisions required. Typecheck and lint pass clean (lint warnings are pre-existing, unrelated to these files).
