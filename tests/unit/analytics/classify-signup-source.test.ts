import { describe, expect, it } from 'vitest'

import { classifySignupSource } from '@/infra/analytics/classify-signup-source'
import { parseSignupSourceCookie } from '@/infra/analytics/signup-source-cookie'

describe('classifySignupSource', () => {
  const site = 'aguy.co.il'

  it('classifies google search referrers as google', () => {
    expect(classifySignupSource('https://www.google.com/search?q=foo', site)).toBe('google')
    expect(classifySignupSource('https://news.google.co.uk/', site)).toBe('google')
    expect(classifySignupSource('https://google.com', site)).toBe('google')
  })

  it('classifies guykoren.co.il with and without www', () => {
    expect(classifySignupSource('https://guykoren.co.il/', site)).toBe('guykoren')
    expect(classifySignupSource('https://www.guykoren.co.il/some/path', site)).toBe('guykoren')
  })

  it('classifies empty and same-site referrers as direct', () => {
    expect(classifySignupSource('', site)).toBe('direct')
    expect(classifySignupSource('not-a-url', site)).toBe('direct')
    expect(classifySignupSource('https://aguy.co.il/pricing', site)).toBe('direct')
    expect(classifySignupSource('https://AGUY.co.IL/foo', site)).toBe('direct')
  })

  it('classifies unknown external referrers as other', () => {
    expect(classifySignupSource('https://facebook.com/', site)).toBe('other')
    expect(classifySignupSource('https://reddit.com/r/x', site)).toBe('other')
  })

  it('rejects attacker-controlled hosts that spell "google" as a subdomain', () => {
    // Regression: the older `/(^|\.)google\.[a-z.]+$/i` regex let
    // `google.evil.com` through because `[a-z.]+` matched `evil.com`.
    expect(classifySignupSource('https://google.evil.com/', site)).toBe('other')
    expect(classifySignupSource('https://mygoogle.io/', site)).toBe('other')
    expect(classifySignupSource('https://google-lookalike.com/', site)).toBe('other')
  })
})

describe('parseSignupSourceCookie', () => {
  it('round-trips a JSON payload with URL-encoding', () => {
    const raw = encodeURIComponent(
      JSON.stringify({
        referrer: 'https://guykoren.co.il/',
        utmSource: 'guy',
        utmMedium: 'blog',
        utmCampaign: null,
        capturedAt: '2026-09-07T00:00:00.000Z',
      }),
    )
    expect(parseSignupSourceCookie(raw)).toEqual({
      referrer: 'https://guykoren.co.il/',
      utmSource: 'guy',
      utmMedium: 'blog',
      utmCampaign: null,
      capturedAt: '2026-09-07T00:00:00.000Z',
    })
  })

  it('returns null on malformed input', () => {
    expect(parseSignupSourceCookie(null)).toBeNull()
    expect(parseSignupSourceCookie('')).toBeNull()
    expect(parseSignupSourceCookie('not-json')).toBeNull()
    expect(parseSignupSourceCookie(encodeURIComponent('{"foo":1}'))).toBeNull()
  })
})
