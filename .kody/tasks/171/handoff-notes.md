## Applied PR #171 (159--start-html) Review Feedback — Session 3 (kody)

### Session 2 prior handoff (blocks already addressed)
- BLOCK: Wrong URL assertion in E2E test — FIXED
- BLOCK: Auth gateway regression — FIXED
- BLOCK: Nav "ניסיון חינם" no-op — FIXED
- BLOCK: "צפה בהדגמה" missing handler — FIXED
- BLOCK: Final CTA "מסלולים והרשמה" no-op — FIXED

### 4 items addressed this session

**Item 2 — LucideIcon type (WARN)**
`features-data.ts`: Replaced verbose custom `LucideIconComponent = ForwardRefExoticComponent<...>` type with the standard `LucideIcon` type imported directly from `lucide-react`. Verified correct by checking `src/ui/web/shared/Icon/Icon.tsx` which uses `type LucideIcon` from lucide-react.

**Item 3 — console.error (WARN)**
`index.tsx:58`: Replaced `console.error('Failed to add simulation message:', error)` with structured `logger.error({ err: error }, 'Failed to add simulation AI message')` using `@/infra/utils/logger`.

**Item 4 — setTimeout error UX (WARN/correctness)**
`handleSimulationSend`: Fixed the error case where the user message was added but the AI response failed — user would see a one-sided conversation. Now uses `pendingAiRef` (useRef) to track the in-flight AI message text. On error: logs with logger, clears pendingAiRef, and rolls back by filtering the user message out of state with `setSimulationMessages((prev) => prev.filter((m) => m.text !== text || m.role !== 'user'))`.

**Item 1 — File decomposition (WARN)**
`index.tsx`: Reduced from 1027 lines → ~120 lines by extracting 9 sub-components:
- `NavigationBar.tsx` (nav with logo + links + CTA)
- `HeroSection.tsx` (hero with chat visual)
- `ComparisonSection.tsx` (traditional vs A-Guy comparison)
- `StatsSection.tsx` (gradient stats bar)
- `FeaturesSection.tsx` (grid of feature cards using FEATURES data)
- `TabsSection.tsx` (3-tab dashboard/chat/notebook preview)
- `SimulationSection.tsx` (interactive chat simulation)
- `CtaSection.tsx` (final CTA with two buttons)
- `Footer.tsx` (footer)
`index.tsx` now composes these, holds all shared state, and manages the onboarding overlay.

### Remaining open items (low/medium priority)
- rgba() hardcoded values throughout sub-components (low)
- E2E test gaps for onboarding, tab switching, simulation (medium)
