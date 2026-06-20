Applied 3 feedback items from PR #171 review to branch 159--start-html:

1. **Item 2 (rgba→CSS vars)**: Replaced 17 hardcoded rgba() values across HeroSection, ComparisonSection, CtaSection, SimulationSection, NavigationBar, TabsSection (Chat tab), and StatsSection with color-mix() using CSS variables. Pattern: `color-mix(in srgb, var(--accent-sky) 20%, transparent)`.

2. **Item 3 (keyframes)**: Moved float and fadeInUp keyframes from globals.css to tailwind.config.mjs under theme.extend. HeroSection animation changed from inline style to Tailwind class `animate-float`. The `.onboarding-bubble` CSS class in globals.css retains the raw keyframe reference since it doesn't go through Tailwind processing.

3. **Item 1 (raw Tailwind classes)**: Added `--surface-gray-*` CSS variables to globals.css light theme and `surface.gray` + `sky` + `purple` Tailwind color scales to tailwind.config.mjs. Replaced 63 raw gray/sky Tailwind classes across all 9 NewStartPage components with design token equivalents (surface-gray-*). Additional: fixed outer wrapper in index.tsx from `bg-gray-50 text-gray-900` to `bg-surface-gray-50 text-surface-gray-900`.

Verify passed (typecheck + lint + tests, ok=true).
