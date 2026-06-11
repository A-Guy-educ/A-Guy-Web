## Issue #159: Redesign /start page

### What was done

Replaced the `/start` page content with a new landing page matching the provided HTML design exactly. The old page rendered `HomePage` (which conditionally showed `LandingPage` or `GreetingFlow`). The new page renders `NewStartPage` directly with no conditional routing.

### Files changed

- `src/app/(frontend)/start/page.tsx` — now renders `<NewStartPage>` instead of `<HomePage>`
- `src/app/(frontend)/start/_components/NewStartPage/index.tsx` — new component (~1000 lines) implementing the full HTML design
- `tests/e2e/start-redesign.e2e.spec.ts` — new E2E test suite (10 test cases)

### Key implementation notes

**RTL handling**: The page uses `dir="rtl"` on the root div. Hebrew text is embedded directly in the component.

**Header/footer hiding**: Uses the existing `body.landing-page` CSS class pattern — adds on mount, removes on unmount via `useEffect`.

**Animation keyframes**: Float and fadeInUp keyframes are injected via a `<style>` tag in the component (not globals.css) to keep the component self-contained.

**No routing on CTA**: Both Hero and Final CTA "התחל ניסיון חינם" buttons scroll to the Simulation section (`scrollIntoView`). The "מסלולים והרשמה" button navigates to `/start` (no-op since we're already there), matching the requirement that buttons should not go to `/study`.

**Tabs state**: The three tabs (Dashboard, צ'אט, מחברת) are client-side stateful with `useState<TabName>`. Default is `dashboard`.

**Onboarding overlay**: Client-side state with 3 steps, dismissible. Shows on page load.

### What needs verification

1. Run `pnpm test:e2e` with dev server to verify all 10 E2E tests pass
2. Check visually that the page renders correctly in both mobile and desktop viewports
3. Verify Hebrew text displays correctly (geresh characters like פיצ'רים)
