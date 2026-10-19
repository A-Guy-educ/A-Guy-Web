// @vitest-environment jsdom
/**
 * @fileType test
 * @domain frontend
 * @pattern footer-static
 * @ai-summary Smoke tests for the static FooterClient — Terms + Privacy links
 *   land on the expected routes, version renders when showExtras is on, and
 *   the version row is hidden when showExtras is off.
 */
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FooterClient } from '@/ui/web/footer/FooterClient'
import { I18nProvider } from '@/ui/web/providers/I18n'

const FOOTER_MESSAGES = {
  legal: {
    termsOfService: 'FOOTER_TERMS_LINK',
    privacyPolicy: 'FOOTER_PRIVACY_LINK',
  },
  footer: { copyright: 'FOOTER_COPYRIGHT_TEXT' },
}

function renderWithI18n(ui: ReactElement) {
  return render(
    <I18nProvider locale="en" messages={FOOTER_MESSAGES}>
      {ui}
    </I18nProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('FooterClient', () => {
  it('renders the Terms of Service link pointing at /terms-of-service', () => {
    renderWithI18n(<FooterClient version="1.2.3" showExtras={false} />)
    const link = screen.getByTestId('footer-terms-of-service')
    expect(link.getAttribute('href')).toBe('/terms-of-service')
    expect(link.textContent).toBe('FOOTER_TERMS_LINK')
  })

  it('renders the Privacy Policy link pointing at /privacy-policy', () => {
    renderWithI18n(<FooterClient version="1.2.3" showExtras={false} />)
    const link = screen.getByTestId('footer-privacy-policy')
    expect(link.getAttribute('href')).toBe('/privacy-policy')
    expect(link.textContent).toBe('FOOTER_PRIVACY_LINK')
  })

  it('renders the copyright line', () => {
    renderWithI18n(<FooterClient version="1.2.3" showExtras={false} />)
    expect(screen.getByText('FOOTER_COPYRIGHT_TEXT')).toBeTruthy()
  })

  it('renders the version when showExtras is true', () => {
    renderWithI18n(<FooterClient version="1.2.3" />)
    expect(screen.getByText('v1.2.3')).toBeTruthy()
  })

  it('skips the version/separator block when showExtras is false', () => {
    renderWithI18n(<FooterClient version="1.2.3" showExtras={false} />)
    expect(screen.queryByText('v1.2.3')).toBeNull()
  })
})
