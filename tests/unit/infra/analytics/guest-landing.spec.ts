import { describe, expect, it } from 'vitest'

import {
  buildGuestLanding,
  classifyLandingPath,
  parseGuestLanding,
  referrerHostOf,
} from '@/infra/analytics/guest-landing'

describe('classifyLandingPath', () => {
  it.each([
    ['/courses/math-5/chapters/algebra/lessons/intro', 'lesson'],
    ['/courses/math-5/chapters/algebra/lessons/intro/', 'lesson'],
    ['/courses/math-5/chapters/algebra/lessons/intro/content/page-2', 'lesson'],
    ['/courses/math-5/chapters/algebra/lessons/intro/exercises/ex-1', 'lesson'],
    ['/courses/math-5/chapters/algebra/lessons/intro/complete', 'lesson'],
  ])('%s → lesson', (path, expected) => {
    expect(classifyLandingPath(path)).toBe(expected)
  })

  it.each([
    ['/courses/math-5', 'course'],
    ['/courses/math-5/', 'course'],
    ['/courses/math-5/chapters/algebra', 'course'],
  ])('%s → course', (path, expected) => {
    expect(classifyLandingPath(path)).toBe(expected)
  })

  it('treats /start and the anon-redirected /courses catalog as start', () => {
    expect(classifyLandingPath('/start')).toBe('start')
    expect(classifyLandingPath('/courses')).toBe('start')
  })

  it('treats / and /home as home', () => {
    expect(classifyLandingPath('/')).toBe('home')
    expect(classifyLandingPath('/home')).toBe('home')
  })

  it.each([
    '/posts/some-post',
    '/products',
    '/login',
    '/study',
    '/courses/math-5/chapters',
    '/courses/math-5/chapters/algebra/lessons',
    '/startup',
  ])('%s → other', (path) => {
    expect(classifyLandingPath(path)).toBe('other')
  })
})

describe('referrerHostOf', () => {
  it('returns the lowercased external host', () => {
    expect(referrerHostOf('https://WWW.Google.com/search?q=x', 'www.aguy.co.il')).toBe(
      'www.google.com',
    )
  })

  it('drops same-host referrers (ignoring port)', () => {
    expect(referrerHostOf('http://localhost:3000/start', 'localhost:3000')).toBeNull()
  })

  it('returns null for missing or malformed referrers', () => {
    expect(referrerHostOf(null, 'aguy.co.il')).toBeNull()
    expect(referrerHostOf('not a url', 'aguy.co.il')).toBeNull()
  })
})

describe('buildGuestLanding', () => {
  it('keeps the path, drops the query string, and lifts only UTM params', () => {
    const url = new URL(
      'https://www.aguy.co.il/courses/m/chapters/c/lessons/l?utm_source=fb&utm_medium=cpc&utm_campaign=spring&email=a@b.c',
    )
    expect(buildGuestLanding(url, 'https://l.facebook.com/', 'www.aguy.co.il')).toEqual({
      landingPath: '/courses/m/chapters/c/lessons/l',
      landingType: 'lesson',
      referrerHost: 'l.facebook.com',
      utmSource: 'fb',
      utmMedium: 'cpc',
      utmCampaign: 'spring',
    })
  })

  it('nulls absent UTM params and truncates oversized values', () => {
    const url = new URL(`https://aguy.co.il/?utm_source=${'x'.repeat(500)}`)
    const landing = buildGuestLanding(url, null, 'aguy.co.il')
    expect(landing.utmSource).toHaveLength(100)
    expect(landing.utmMedium).toBeNull()
    expect(landing.referrerHost).toBeNull()
  })
})

describe('parseGuestLanding', () => {
  it('re-derives landingType from the path instead of trusting the payload', () => {
    expect(parseGuestLanding({ landingPath: '/start', landingType: 'lesson' })?.landingType).toBe(
      'start',
    )
  })

  it('rejects payloads without an absolute path', () => {
    expect(parseGuestLanding(null)).toBeNull()
    expect(parseGuestLanding({ landingPath: 'start' })).toBeNull()
    expect(parseGuestLanding({ landingPath: 42 })).toBeNull()
  })
})
