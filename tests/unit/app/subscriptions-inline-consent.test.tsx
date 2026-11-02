// @vitest-environment jsdom

/**
 * /subscriptions two-step CTA.
 *
 * Pinned behavior:
 *   - every purchasable card starts with "Choose" and no consent checkbox
 *   - choosing a tier opens the consent inside that card only, with a disabled "Pay"
 *   - ticking consent enables "Pay"
 *   - choosing another tier moves the consent there and clears the tick
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/ui/web/providers/I18n', () => ({
  useTranslations: () => (key: string) => key,
  useI18n: () => ({ messages: {} }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/client/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { id: 'u1', currentTier: 'free' }, isLoading: false }),
}))

vi.mock('@/infra/loading/components/SystemLink', () => ({
  SystemLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/app/(frontend)/subscriptions/_components/CurrentPlanCta', () => ({
  CurrentPlanCta: () => <div>current-plan</div>,
}))

import { SubscriptionsCatalog } from '@/app/(frontend)/subscriptions/_components/SubscriptionsCatalog'

function card(tierNameKey: string): HTMLElement {
  const article = screen.getByText(tierNameKey).closest('article')
  if (!article) throw new Error(`card ${tierNameKey} not found`)
  return article
}

describe('SubscriptionsCatalog inline consent', () => {
  afterEach(cleanup)

  it('starts every purchasable card on "Choose" with no consent checkbox', () => {
    render(<SubscriptionsCatalog tiers={['free', 'basic', 'advanced']} />)
    expect(screen.getAllByRole('button', { name: 'selectButton' })).toHaveLength(2)
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('opens consent inside the chosen card and enables Pay only after ticking it', () => {
    render(<SubscriptionsCatalog tiers={['free', 'basic', 'advanced']} />)
    const basic = card('tiers.basic.name')
    fireEvent.click(within(basic).getByRole('button', { name: 'selectButton' }))

    const pay = within(basic).getByRole('button', { name: 'payButton' })
    expect((pay as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
    expect(within(card('tiers.advanced.name')).queryByRole('checkbox')).toBeNull()

    fireEvent.click(within(basic).getByRole('checkbox'))
    expect(
      (within(basic).getByRole('button', { name: 'payButton' }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('moves consent to a newly chosen tier and clears the tick', () => {
    render(<SubscriptionsCatalog tiers={['free', 'basic', 'advanced']} />)
    const basic = card('tiers.basic.name')
    fireEvent.click(within(basic).getByRole('button', { name: 'selectButton' }))
    fireEvent.click(within(basic).getByRole('checkbox'))

    const advanced = card('tiers.advanced.name')
    fireEvent.click(within(advanced).getByRole('button', { name: 'selectButton' }))

    expect(within(basic).getByRole('button', { name: 'selectButton' })).toBeTruthy()
    expect(within(basic).queryByRole('checkbox')).toBeNull()
    expect(within(advanced).getByRole('checkbox').getAttribute('aria-checked')).toBe('false')
    expect(
      (within(advanced).getByRole('button', { name: 'payButton' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })
})
