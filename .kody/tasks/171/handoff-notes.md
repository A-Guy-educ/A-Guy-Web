## Applied UI/UX Review Feedback — Session (kody) — PR #171

Fixed Items 2 and 3 from the UI/UX review feedback on branch `159--start-html`.

### Changes made

**tailwind.config.mjs** — wired gradient tokens into `theme.extend.backgroundImage` via CSS variable references (single source of truth, eliminates duplicate hardcoded gradient strings):
- All 11 gradient tokens now map to their CSS var counterparts (e.g. `'gradient-sky-purple': 'var(--gradient-sky-purple)'`)

**src/app/(frontend)/globals.css** — added `--accent-amber: #f59e0b` to the landing page solid accent colors section (line ~127), enabling the Notebook tab's amber hardcoded value to be replaced with a design token

**TabsSection.tsx (Notebook tab)** — replaced hardcoded rgba() with CSS variable + color-mix():
- Note cards (sky/purple): `rgba(14,165,233,0.05)` → `color-mix(in srgb, var(--accent-sky) 5%, transparent)` and similar for border at 20%
- Amber note card: `rgba(245,158,11,0.05)` → `color-mix(in srgb, var(--accent-amber) 5%, transparent)` and border at 20%

### Item 1 (preview unreachable) — cannot verify
No live dev server available in this environment to browser-verify the rendering. Visual QA must be done manually before merge.

### Still open (from prior session + this session)
- Other rgba() values in SimulationSection, ComparisonSection, CtaSection, StatsSection, HeroSection, NavigationBar (TabsSection Chat tab also has one)
- E2E test gaps (medium priority)
- Note: the 11 gradient tokens are now wired (Item 3 fixed), but existing inline `style={{ background: 'var(--gradient-sky-purple)' }}` usages remain unchanged — they work fine; the wiring enables `bg-gradient-sky-purple` Tailwind class usage going forward
