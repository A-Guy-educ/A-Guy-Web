## Applied Specialist Review Feedback — Session (kody)

### BLOCK items fixed

**BLOCK 1 — Auth redirect bug (`page.tsx`)**
The `/start` page server component was calling `resolveHomeRedirect()` and redirecting unauthenticated users to `/login` before they could ever see the landing page. Fixed by removing the redirect logic entirely — `page.tsx` now just renders `<NewStartPage />` directly. Removed now-unused imports: `cookies`, `redirect`, `COURSE_ID_COOKIE_NAME`, `resolveHomeRedirect`, `getMeUser`.

**BLOCK 2 — Race condition in simulation (`index.tsx`)**
The `handleSimulationSend` function used a single shared `pendingAiRef` — if two messages were sent within the 800ms window, the second call's AI response would overwrite the first's ref, causing the first AI response to never appear. Fixed by replacing the single ref with a `Map<number, string>` keyed by a monotonically-incrementing `pendingAiIdRef`. Each send gets a unique ID, stores its pending AI text in the Map, and reads/deletes by that ID in the setTimeout. The Map is guaranteed O(1) for these operations.

### WARN items fixed

**WARN 3 — Catch filter removes ALL matching user messages (`index.tsx`)**
The error rollback filter `prev.filter((m) => m.text !== text || m.role !== 'user')` would remove every user message with that text, not just the one just-added message. Fixed by using the stable `id` captured at send time — the filter now correctly removes only the one user message with that exact text (there should only be one, but this is now correct regardless of duplicates).

**WARN 4 — Quick-question buttons only pre-fill input (`SimulationSection.tsx:121`)**
The quick-question buttons called `onInputChange(q)` but never called `onSend()`, so the user had to manually press Enter or click Send. Fixed by adding `onSend()` to the button's onClick handler alongside `onInputChange(q)`.

### Suggestion addressed

**CtaSection contrast** — Changed `text-gray-900` → `text-white` for the heading and `text-gray-600` → `text-gray-300` for the subheading to improve contrast on the `var(--gradient-hero)` dark background.

### Files changed
- `src/app/(frontend)/start/page.tsx` — removed auth redirect + unused imports
- `src/app/(frontend)/start/_components/NewStartPage/index.tsx` — race condition fix, catch filter fix
- `src/app/(frontend)/start/_components/NewStartPage/SimulationSection.tsx` — quick-question send fix, removed dead `RefObject` import/type
- `src/app/(frontend)/start/_components/NewStartPage/CtaSection.tsx` — contrast fix

### Open items
- WARN 5 (dead gradient tokens in tailwind.tokens.mjs) was not addressed — requires wider coordination to wire tokens into tailwind.config.mjs
- rgba() hardcoded values throughout sub-components (low priority)
- E2E test gaps for onboarding, tab switching, simulation (medium priority)
