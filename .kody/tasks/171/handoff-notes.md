## Applied PR #171 (159--start-html) Review Feedback

### BLOCK items fixed

1. **Auth gateway regression** — Restored auth-aware routing in `page.tsx` using the same pattern as `home/page.tsx`: `getMeUser()` + `COURSE_ID_COOKIE_NAME` + `resolveHomeRedirect()`. Authenticated users with a selected course now correctly redirect to `/study` instead of landing on `/start`.

2. **Nav "ניסיון חינם" no-op** — Changed `router.push('/start')` → `router.push('/courses')`.

3. **"צפה בהדגמה" missing handler** — Added `onClick={scrollToSimulation}` to scroll to the `#simulation` section.

4. **Final CTA "מסלולים והרשמה" no-op** — Changed `router.push('/start')` → `router.push('/courses')`. Also fixed the "התחל ניסיון חינם" CTA in the same section.

### WARN items fixed

5. **File decomposition** — Extracted `OnboardingOverlay` into its own component (`OnboardingOverlay.tsx`) and `FEATURES` data + `ONBOARDING_STEPS` into `features-data.ts`. Reduced main file from 1267 → ~1023 lines. Still above 800-line convention — see followups.

6. **Custom SVG icons replaced** — Replaced 6 custom inline SVG icon components (`IconChat`, `IconLightbulb`, `IconCheck`, `IconBook`, `IconBolt`, `IconChart`) with lucide-react equivalents (`MessageCircle`, `Lightbulb`, `Check`, `BookOpen`, `Zap`, `BarChart3`).

7. **@keyframes moved to globals.css** — Removed inline `<style>` tag containing `float` and `fadeInUp` keyframes. Added them to `globals.css` under a `/* Start page animations */` section. Also moved `.onboarding-bubble` class there.

8. **rgba() replaced with Tailwind** — Replaced `rgba(255,255,255,0.1)` patterns with `bg-white/10` Tailwind classes throughout. Replaced onboarding `rgba(14,165,233,0.05)` etc. with `bg-sky-50` and `border-sky-200` classes. Many rgba() values remain — see followups.

10. **FEATURES moved to data file** — Now in `features-data.ts` at the top of the component tree.

11. **Quick-question scroll no-op removed** — Removed `scrollToSimulation()` call from quick-question buttons since they're already inside `#simulation`.

12. **Body class documented** — Added comment explaining `.landing-page` body class is defined in globals.css.

### WARN items NOT addressed (see followups)

- File still 1023 lines (decomposition incomplete)
- Many rgba() values remain
- E2E test gaps (onboarding, tabs, simulation)
