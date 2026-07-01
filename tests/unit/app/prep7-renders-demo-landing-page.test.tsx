// @vitest-environment jsdom

/**
 * Regression guard for issue #677 (/prep7 landing-page refactor).
 *
 * Invariant: this route must render the shared DemoLandingPage, not bespoke
 * inlined sections. The bespoke Hero / WhoIsAguy / CourseFeatures / Benefits /
 * Bonuses / Footer wrapper was reverted in favor of the shared landing
 * experience; any future contributor who tries to bring the bespoke sections
 * back will break the visual contract for the grade-7 funnel.
 *
 * The assertion is render-level, not text-level, so it does not depend on
 * which sub-sections DemoLandingPage happens to render today — only on the
 * fact that this route forwards straight through to it without wrapping or
 * injecting other content.
 *
 * @fileType unit-test
 * @domain routes/prep7
 * @ai-summary Asserts that mounting the /prep7 default export yields the
 *   same DOM as mounting the shared DemoLandingPage component directly.
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// DemoLandingPage pulls in browser/Next-runtime deps through LanguageSwitcher
// (uses next/navigation + document.cookie) and ThemeSelector (localStorage +
// the theme provider tree). Stub them so we can render without wiring up a
// full provider tree.
vi.mock('@/ui/web/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}))
vi.mock('@/ui/web/providers/Theme/ThemeSelector', () => ({
  ThemeSelector: () => null,
}))

// Mirror the real I18n contract: useTranslations(ns) prefixes every key with
// `${ns}.`, and on a miss returns the full prefixed key. DemoLandingPage
// reads from the `landingPage` namespace, so every resolved string renders as
// `landingPage.<key>` — deterministic and easy to reason about.
vi.mock('@/ui/web/providers/I18n', () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string): string =>
      namespace ? `${namespace}.${key}` : key,
  useLocale: () => 'en',
}))

import Prep7Page from '@/app/(frontend)/prep7/page'
import { DemoLandingPage } from '@/ui/web/homepage/DemoLandingPage'

describe('/prep7 page', () => {
  afterEach(() => cleanup())

  it('renders the same DOM as the shared DemoLandingPage component', () => {
    // Snapshot both containers before the shared afterEach runs cleanup().
    // Each render is wrapped in its own div, so the two containers are
    // independent and stay readable until afterEach tears them down.
    const routeHtml = render(<Prep7Page />).container.innerHTML
    const demoHtml = render(<DemoLandingPage />).container.innerHTML

    expect(routeHtml).toBe(demoHtml)
  })
})
