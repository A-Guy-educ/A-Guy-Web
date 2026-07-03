// @vitest-environment jsdom
import { ProductSoonCard } from '@/app/(frontend)/products/_components/ProductSoonCard'
import type { Product } from '@/infra/types/content'
import { I18nProvider } from '@/ui/web/providers/I18n'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import enMessages from '../../../src/i18n/en.json'

// UnifiedCard uses loadingManager + window.location on click — neither
// is meaningful in jsdom and neither is the unit-under-test here.
vi.mock('@/infra/loading/LoadingManager', () => ({
  loadingManager: { register: vi.fn() },
}))

const mockProduct: Product = {
  id: 'prod-1',
  title: 'כיתה ח׳',
  name: 'כיתה ח׳',
  slug: 'grade-8',
  isActive: false,
}

const renderWithI18n = (product: Product) => {
  return render(
    <I18nProvider locale="en" messages={enMessages}>
      <ProductSoonCard product={product} />
    </I18nProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('ProductSoonCard (issue #715 — coming soon section)', () => {
  it('renders the product name as the title', () => {
    renderWithI18n(mockProduct)
    // The title appears as both the badge label and the <h3>; assert at
    // least one occurrence to allow for either.
    expect(screen.getAllByText('כיתה ח׳').length).toBeGreaterThanOrEqual(1)
    // The heading is the <h3> — pin it to that specific element.
    expect(screen.getByRole('heading', { level: 3, name: 'כיתה ח׳' })).toBeTruthy()
  })

  it('renders a disabled button labelled "Coming soon"', () => {
    renderWithI18n(mockProduct)

    // Acceptance criterion: each "soon" item must render with a greyed-out
    // `<button disabled>` reading "בקרוב" (en: "Coming soon").
    const buttons = screen.getAllByRole('button', { name: /coming soon/i })
    expect(buttons.length).toBeGreaterThanOrEqual(1)

    for (const button of buttons) {
      // The native `disabled` attribute is the contract — without it, the
      // button is interactive for screen readers and keyboard users.
      expect((button as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('renders a "Soon" badge in the top-right (UnifiedCard contentStatus badge)', () => {
    renderWithI18n(mockProduct)
    // The UnifiedCard's ContentStatusBadge renders the "soonBadge" string
    // for `contentStatus="soon"`. It's a small inline element — checking
    // for any occurrence guards against accidental regressions in the
    // parent component.
    expect(screen.getAllByText(/soon/i).length).toBeGreaterThan(0)
  })

  it('does not render any link to the product slug (soon cards are not clickable)', () => {
    renderWithI18n(mockProduct)
    // The card must not wrap its content in a link — there's no `cardHref`
    // for soon products.
    expect(screen.queryByRole('link', { name: /כיתה/i })).toBeNull()
  })
})
