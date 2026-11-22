// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TIER_PRICE_ILS } from '@/lib/tiers'
import { PrivateLessonLanding } from '@/ui/web/homepage/PrivateLessonLanding'
import { fill, whatsappHref } from '@/ui/web/homepage/PrivateLessonLanding/landingShared'
import { I18nProvider } from '@/ui/web/providers/I18n'

import heMessages from '../../../src/i18n/he.json'

function renderLanding(profiles: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ profiles }), { status: 200 })),
  )
  return render(
    <I18nProvider locale="he" messages={heMessages}>
      <PrivateLessonLanding />
    </I18nProvider>,
  )
}

describe('PrivateLessonLanding', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows the real basic-tier price, not a hardcoded one', () => {
    renderLanding([])
    expect(
      screen.getByRole('heading', { name: `חודש עם Aguy ב־${TIER_PRICE_ILS.basic} ₪` }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: `מתחילים חודש ב־${TIER_PRICE_ILS.basic} ₪` }),
    ).toHaveProperty('pathname', '/subscriptions')
  })

  it('sends a picked teacher on to /start with the teacher preselected', async () => {
    renderLanding([{ slug: 'digger', label: 'החופר', description: 'בקטע טוב' }])
    const card = await screen.findByRole('link', { name: /החופר/ })
    expect(card.getAttribute('href')).toBe('/start?teacher=digger')
  })

  it('falls back to a plain start link when no teachers load', async () => {
    renderLanding([])
    await screen.findByText('המורים יעלו בעוד רגע. אפשר גם להתחיל ישר:')
    const hrefs = screen
      .getAllByRole('link', { name: 'מתחילים בחינם' })
      .map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/start')
  })
})

describe('landing helpers', () => {
  it('fills tokens and leaves unknown ones visible', () => {
    expect(fill('{basic} / {premium} / {x}', { basic: 59, premium: 239 })).toBe('59 / 239 / {x}')
  })

  it('builds a prefilled WhatsApp link', () => {
    expect(whatsappHref('היי')).toBe('https://wa.me/972546608920?text=%D7%94%D7%99%D7%99')
  })
})
