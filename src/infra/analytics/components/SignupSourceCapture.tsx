'use client'

import { useEffect } from 'react'

import { SIGNUP_SOURCE_COOKIE, SIGNUP_SOURCE_MAX_AGE_SECONDS } from '../signup-source-cookie'

/**
 * Writes the aguy_signup_source cookie on first landing so the OAuth callback
 * can attribute a NEW signup to what brought the visitor here.
 *
 * First-touch attribution: if the cookie already exists we do nothing. Preserving
 * the original referrer / UTMs matters more than the most recent hit — a visitor
 * who lands from guykoren.co.il and later reloads via a Google search should
 * still be counted as guykoren.
 */
export function SignupSourceCapture() {
  useEffect(() => {
    try {
      if (document.cookie.split('; ').some((c) => c.startsWith(`${SIGNUP_SOURCE_COOKIE}=`))) return

      const params = new URLSearchParams(window.location.search)
      const payload = {
        referrer: document.referrer || '',
        utmSource: params.get('utm_source') ?? null,
        utmMedium: params.get('utm_medium') ?? null,
        utmCampaign: params.get('utm_campaign') ?? null,
        capturedAt: new Date().toISOString(),
      }

      const value = encodeURIComponent(JSON.stringify(payload))
      const isSecure = window.location.protocol === 'https:'
      document.cookie = [
        `${SIGNUP_SOURCE_COOKIE}=${value}`,
        'Path=/',
        `Max-Age=${SIGNUP_SOURCE_MAX_AGE_SECONDS}`,
        'SameSite=Lax',
        isSecure ? 'Secure' : '',
      ]
        .filter(Boolean)
        .join('; ')
    } catch {
      // Cookies disabled / storage error — losing attribution is preferable
      // to breaking the page.
    }
  }, [])

  return null
}
