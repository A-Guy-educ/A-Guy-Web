## Merge Conflict Resolution: PR #130

`git merge origin/dev` into `129-doc-coverage-srcclienthooks-client-side-react-hook` produced conflicts in 8 hook files under `src/client/hooks/`.

All conflicts were in JSDoc headers — HEAD (PR) added `@ai-summary` tags for doc coverage; `origin/dev` had richer metadata (`@domain`, `@pattern`, `Gotcha` sections).

**Resolution strategy:** Took PR's `@ai-summary` additions (the new content this PR introduces) merged with dev's structured domain/pattern/gotcha fields. This preserves the PR's doc-coverage intent while keeping the richer semantic metadata from dev.

Files resolved:
- **README.md** — took PR's comprehensive hooks table over dev's bare description
- **useAccessGate.ts** — merged dev's `@domain access-control`, `@pattern access-gate`, Gotcha alongside PR summary
- **useCourseSearch.ts** — merged dev's `@domain search`, `@pattern course-search`, Gotcha alongside PR summary
- **useCurrentUser.ts** — merged dev's `@domain auth`, `@pattern user-context`, Gotcha alongside PR summary
- **useDebounce.ts** — merged dev's `@domain utility`, `@pattern debounce` alongside PR summary
- **useExamCountdown.ts** — merged dev's `@domain exam`, `@pattern countdown`, Gotcha alongside PR summary
- **useMediaQuery.ts** — merged dev's `@domain utility`, `@pattern media-query`, Gotcha alongside PR summary
- **useProgressMap.ts** — merged dev's `@domain progress`, `@pattern progress-map`, Gotcha alongside PR summary

**Verification:** `pnpm typecheck` and `pnpm lint` pass cleanly. No code changes beyond JSDoc header fields.
