## Merge Conflict Resolution: PR #130 → dev

**What:** `git merge origin/dev` into `129-doc-coverage-srcclienthooks-client-side-react-hook` produced conflicts in 8 hook files under `src/client/hooks/`.

**Resolution approach:** All conflicts were asymmetric — only the `@ai-summary` JSDoc field differed between HEAD and origin/dev (the actual TypeScript code was identical on both sides). Merged by taking the more informative description from each side:

- **useAccessGate** — merged: added "survives page refresh via localStorage" from dev to HEAD's framing.
- **useActiveTimeTracker** — dev's multi-line descriptive JSDoc block was richer; kept it as-is.
- **useCourseSearch** — merged both: HEAD's "debounced course-scoped search via `/api/course-search`" + dev's "requires `courseSlug` for scoped results" clause.
- **useCurrentUser** — merged: HEAD's endpoint emphasis + dev's "do not use in server components" note.
- **useDebounce** — merged: HEAD's "delays propagating a value" + dev's "until the input stops changing" phrasing.
- **useExamCountdown** — merged: HEAD's "auto-refreshes every 60s" + dev's "dates are local-only" caveat.
- **useMediaQuery** — merged: HEAD's `window.matchMedia` technical detail + dev's "SSR-safe" framing.
- **useProgressMap** — merged: HEAD's "batch-fetches completion percentages" + dev's gradeLevel distinction.

**Verification:** `pnpm typecheck` passes with zero errors. No code changes beyond JSDoc fields.
