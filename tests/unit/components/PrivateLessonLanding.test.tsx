// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TIER_PRICE_ILS } from '@/lib/tiers'
import { PrivateLessonLanding } from '@/ui/web/homepage/PrivateLessonLanding'
import { fill, whatsappHref } from '@/ui/web/homepage/PrivateLessonLanding/landingShared'
import { I18nProvider } from '@/ui/web/providers/I18n'

import heMessages from '../../../src/i18n/he.json'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

function renderLanding(props: Parameters<typeof PrivateLessonLanding>[0] = {}) {
  return render(
    <I18nProvider locale="he" messages={heMessages}>
      <PrivateLessonLanding {...props} />
    </I18nProvider>,
  )
}

describe('PrivateLessonLanding', () => {
  afterEach(cleanup)

  it('shows the real basic-tier price, not the demo one', () => {
    renderLanding()
    expect(
      screen.getByRole('heading', { name: `חודש עם Aguy ב־${TIER_PRICE_ILS.basic} ₪` }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: `מתחילים חודש ב־${TIER_PRICE_ILS.basic} ₪` }),
    ).toHaveProperty('pathname', '/subscriptions')
    expect(
      screen.getByText(
        `אפשר להתחיל בחינם. מסלולים בתשלום: ${TIER_PRICE_ILS.basic}, ${TIER_PRICE_ILS.advanced} או ${TIER_PRICE_ILS.premium} ₪ בחודש.`,
      ),
    ).toBeTruthy()
  })

  it('shows the demo student photo', () => {
    renderLanding()
    const photo = screen.getByRole('img', { name: /תלמידה פותרת תרגיל/ })
    expect(photo.getAttribute('src')).toContain('independent-student.webp')
  })

  it('swaps the portrait and line when another teacher is picked', () => {
    renderLanding()
    const portrait = screen.getByRole('img', { name: 'החופר, המורה הפרטי' })
    expect(portrait.dataset.teacher).toBe('detailed')
    expect(screen.getByRole('link', { name: 'ממשיכים עם המורה שבחרתם' }).getAttribute('href')).toBe(
      '/start?teacher=teacher_patient',
    )

    fireEvent.click(screen.getByRole('button', { name: /הממוקדת/ }))

    expect(screen.getByRole('img', { name: 'הממוקדת, המורה הפרטי' }).dataset.teacher).toBe(
      'focused',
    )
    expect(screen.getByText('אין זמן לבזבז. נעשה בדיוק מה שצריך.')).toBeTruthy()
    expect(screen.getByRole('button', { name: /הממוקדת/ }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.getByRole('link', { name: 'ממשיכים עם המורה שבחרתם' }).getAttribute('href')).toBe(
      '/start?teacher=teacher_focused',
    )
  })

  it('sends the free and comparison CTAs to /start', () => {
    renderLanding()
    expect(screen.getByRole('link', { name: 'אפשר גם להתחיל בחינם' }).getAttribute('href')).toBe(
      '/start',
    )
    expect(screen.getByRole('link', { name: 'נכנסים לשיעור הפרטי שלי' }).getAttribute('href')).toBe(
      '/start',
    )
  })
})

describe('PrivateLessonLanding header', () => {
  afterEach(cleanup)

  it('offers a sign-in for returning students and no footer lesson link', () => {
    renderLanding()
    expect(screen.getByRole('link', { name: /כבר איתנו\? התחברות/ }).getAttribute('href')).toBe(
      '/login',
    )
    expect(screen.queryByRole('link', { name: 'כניסה לשיעור' })).toBeNull()
  })

  it('switches to English through the locale cookie', () => {
    renderLanding()
    const group = screen.getByRole('group', { name: 'שפה' })
    const he = within(group).getByRole('button', { name: 'עב' })
    const en = within(group).getByRole('button', { name: 'EN' })
    expect(he.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(en)
    expect(document.cookie).toContain('en')
    expect(refresh).toHaveBeenCalled()
  })
})

describe('PrivateLessonLanding exercise slot', () => {
  afterEach(cleanup)

  it("keeps the demo's placeholder when no exercise was found", () => {
    renderLanding()
    expect(screen.getByText('כאן מתנסים בתרגיל מתוך המערכת')).toBeTruthy()
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
