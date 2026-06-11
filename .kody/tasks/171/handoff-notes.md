## PR #171 — Apply review feedback for #159 (start page redesign)

### Changes made

Two button onClick handlers in `NewStartPage/index.tsx` were updated to navigate to `/start` via `router.push('/start')` instead of scrolling to the simulation section:

1. **Hero primary CTA button** (line ~215): changed `onClick={scrollToSimulation}` → `onClick={() => router.push('/start')}`
2. **Final CTA section primary button** (line ~997): changed `onClick={scrollToSimulation}` → `onClick={() => router.push('/start')}`

The nav bar "ניסיון חינם" button and the "מסלולים והרשמה" button already correctly used `router.push('/start')` — no change needed there.

### What was not needed

The export in `page.tsx` was already correct (`import { NewStartPage } from './_components/NewStartPage'`). The feedback referenced an older version that had a `homepage` subpath export — that issue was already resolved in the original PR.

### Verification

- `pnpm typecheck` passes
- `pnpm lint` passes
- `pnpm test:int` passes (integration tests)
- No E2E tests were run (dev server not available)
