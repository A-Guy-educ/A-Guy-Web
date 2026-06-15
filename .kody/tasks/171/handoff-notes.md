Resolved merge conflict in `src/app/(frontend)/start/page.tsx` between PR #171 (`159--start-html`) and `origin/dev`.

The conflict was asymmetric: the PR branch introduces a complete redesign of `/start` via `<NewStartPage />`, while `origin/dev` had a different implementation (`StartPageClient` with async data fetching). Since PR #159 is explicitly a redesign of `/start` page with a full HTML mockup, the HEAD side (PR's `NewStartPage`) was preserved. TypeScript check passes.
