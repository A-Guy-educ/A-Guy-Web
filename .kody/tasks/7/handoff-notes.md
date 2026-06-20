Fix: Added bare `localStorage`/`sessionStorage` mock to `vitest.setup.ts`.

Root cause: Unit test config (`vitest.config.unit.mts`) defaults to `environment: 'node'`. Tests that declare `// @vitest-environment jsdom` get a virtual DOM window but bare `localStorage` (without `window.` prefix) remains undefined in Node's global scope. The failing tests (`useLessonViewMode`, `anonymous-id`, `PreferencesSection`, `LayoutClient`) all used bare `localStorage.clear()` / `localStorage.setItem()`.

Fix strategy: Added a storage mock to `vitest.setup.ts` that defines `globalThis.localStorage` and `globalThis.sessionStorage` if they're not already defined. This covers both bare and `window.`-prefixed access and works across both `node` and `jsdom` environments without requiring per-file environment switching or changes to the vitest config defaults.

Two alternatives considered and rejected:
1. Switch unit config default to `jsdom` — breaks `tests/unit/scripts/inspector/state.test.ts` which uses Node module mocks (`fs`, `child_process`) incompatible with jsdom.
2. Add `// @vitest-environment node` to jsdom-dependent test files — fragile, requires updating every affected test file, doesn't fix the underlying infrastructure gap.

No other changes made. Quality gates pass: typecheck ✓, lint ✓, tests ✓ (203 files, 2548 tests passed).
