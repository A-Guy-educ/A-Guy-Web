# Issue #70: Redesign /start Page

## What was done
Redesigned the LandingPage component at `src/ui/web/homepage/LandingPage/index.tsx` with the following new sections:
1. **Hero** - Enhanced with stats preview (20+ lessons, 50K+ exercises, 100K+ students, AI 24/7)
2. **Comparison** - Side-by-side comparison: Private tutoring vs Traditional tutoring benefits/drawbacks
3. **Statistics** - 4-column grid showing key metrics (20+ lessons, 50K+ exercises, 100K+ students, AI 24/7)
4. **Features** - Expanded from 4 to 6 feature cards (added AI Tutor, Progress Tracking, Exam Prep, 24/7 Support)
5. **Simulation Tabs** - 3 tabs (Dashboard, Chat, Notebook) with sample content demonstrating the UI
6. **CTA** - Final call-to-action with 2 buttons (primary: "Start Free Trial", secondary: "View Courses")
7. **Onboarding Overlay** - Fixed position bottom-left overlay with 3-step quick tour

## Files Changed
- `src/ui/web/homepage/LandingPage/index.tsx` - Main redesign
- `src/i18n/en.json` - Added new translation keys for all new sections
- `src/i18n/he.json` - Hebrew translations for all new sections
- `tests/e2e/start-page-redesign.e2e.spec.ts` - New E2E test (requires manual run)

## Translation Keys Added
- `landing.stats.*` - Statistics section
- `landing.comparison.*` - Comparison section with benefits/drawbacks
- `landing.features.aiTutor`, `landing.features.progress`, `landing.features.exams`, `landing.features.support` - New features
- `landing.simulation.*` - Tab content (Dashboard, Chat, Notebook)
- `landing.cta.primaryButton`, `landing.cta.secondaryButton` - Two CTA buttons
- `landing.onboarding.*` - Onboarding overlay steps

## Notes
- Removed unused imports (Trophy, Clock, Timer) that were part of deleted constant arrays
- The COMPARISON_ITEMS and ONBOARDING_STEPS constants were removed as the content was implemented inline
- The E2E test cannot run in CI without a dev server - needs manual verification
