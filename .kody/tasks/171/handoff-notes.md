## Applied Specialist Review Feedback — Session (kody) — Color Token Fixes

Applied all BLOCK/CONCERN-level hardcoded color fixes from the specialist review.

### Changes made

**TabsSection.tsx** — replaced hardcoded colors with design system tokens:
- `style={{ backgroundColor: '#f3f4f6' }}` → `className="... bg-gray-100"`
- `style={{ backgroundColor: '#f9fafb' }}` → `className="... bg-gray-50"`
- `color: '#22c55e'` / `'#f59e0b'` → `color: 'var(--accent-sky)'`
- `style={{ backgroundColor: '#e5e7eb' }}` → `className="... bg-gray-200"`
- `color: '#0ea5e9'` → `var(--accent-sky)`, `color: '#a855f7'` → `var(--accent-purple)`
- `'--tw-ring-color': '#0ea5e9'` → `'--tw-ring-color': 'var(--accent-sky)'`
- `style={{ backgroundColor: '#f87171/fbbf24/34d399' }}` → `bg-red-400/amber-400/emerald-400`
- `color: '#0284c7'` / `'#9333ea'` → `var(--accent-sky-deep)` / `var(--accent-purple-deep)`
- `style={{ color: '#b45309' }}` → `className="text-amber-600"`

**ComparisonSection.tsx** — replaced:
- `style={{ backgroundColor: '#f9fafb' }}` → `className="... bg-gray-50"`

**SimulationSection.tsx** — replaced:
- `style={{ backgroundColor: '#111827' }}` → `className="... bg-gray-900"`

### Still open (low priority)
- rgba() hardcoded values throughout sub-components
- Dead gradient tokens in tailwind.tokens.mjs (not wired into tailwind.config)
- E2E test gaps (medium priority)
