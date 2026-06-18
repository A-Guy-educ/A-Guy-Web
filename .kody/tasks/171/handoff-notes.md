Applied 5 review feedback fixes to PR #171 (branch `159--start-html`):

1. **Dark mode gradients (BLOCK)** — Added all 11 `--gradient-*` CSS variable definitions to `[data-theme='dark']` in `globals.css` (after line 219, before closing `}`). Same hex values as light mode — gradients are brand-defined and work across both themes.

2. **Social proof avatar hardcoded gradients (BLOCK)** — Replaced 3 hardcoded `linear-gradient(135deg, ...)` hex values at indices 1/2/3 of the avatar background array with `var(--gradient-indigo-purple)`, `var(--gradient-green)`, `var(--gradient-amber)` respectively.

3. **First FEATURES entry hardcoded gradient (BLOCK)** — Replaced `linear-gradient(135deg, #0ea5e9, #0284c7)` with `var(--gradient-sky-blue)`.

4. **Final CTA hardcoded gradient (BLOCK)** — Replaced `linear-gradient(135deg, #f9fafb, #f3f4f6)` with `var(--gradient-hero)`.

5. **`group` class on feature card parent (WARN)** — Added `group` to the className of the feature card `<div>` wrapping the hover/transform.

No WARN items from the review were addressed beyond the 5 targeted fixes. The `onboarding-bubble` animation class and `@keyframes` inline `<style>` tag remain in place as-is.
