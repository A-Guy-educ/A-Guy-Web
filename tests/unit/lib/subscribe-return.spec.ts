import { describe, expect, it } from 'vitest'

import {
  sanitizeSubscribeReturnTo,
  subscriptionsHref,
  withSubscribeReturnTo,
} from '@/lib/tiers/subscribe-return'

const LESSON = '/courses/math/chapters/ch1/lessons/l1'

describe('sanitizeSubscribeReturnTo', () => {
  it('keeps same-site paths with query strings', () => {
    expect(sanitizeSubscribeReturnTo(`${LESSON}?exerciseId=abc`)).toBe(`${LESSON}?exerciseId=abc`)
  })

  it.each([
    undefined,
    null,
    42,
    '',
    '   ',
    'courses/math',
    '//evil.com',
    '/\\evil.com',
    'https://evil.com/x',
    'javascript:alert(1)',
    '/a\nb',
    `/${'x'.repeat(600)}`,
  ])('rejects %j', (value) => {
    expect(sanitizeSubscribeReturnTo(value)).toBeNull()
  })

  it.each(['/subscriptions', '/subscriptions?returnTo=/x', '/checkout/success', '/login'])(
    'rejects purchase-funnel path %s',
    (value) => {
      expect(sanitizeSubscribeReturnTo(value)).toBeNull()
    },
  )

  it('does not treat lookalike prefixes as funnel paths', () => {
    expect(sanitizeSubscribeReturnTo('/subscriptions-faq')).toBe('/subscriptions-faq')
  })
})

describe('subscriptionsHref', () => {
  it('encodes the return path', () => {
    expect(subscriptionsHref(`${LESSON}?block=2`)).toBe(
      `/subscriptions?returnTo=${encodeURIComponent(`${LESSON}?block=2`)}`,
    )
  })

  it('falls back to the bare page for unsafe input', () => {
    expect(subscriptionsHref('https://evil.com')).toBe('/subscriptions')
    expect(subscriptionsHref(undefined)).toBe('/subscriptions')
  })
})

describe('withSubscribeReturnTo', () => {
  it('appends with the right separator', () => {
    expect(withSubscribeReturnTo('https://a.co/checkout/success', LESSON)).toBe(
      `https://a.co/checkout/success?returnTo=${encodeURIComponent(LESSON)}`,
    )
    expect(withSubscribeReturnTo('https://a.co/x?y=1', LESSON)).toBe(
      `https://a.co/x?y=1&returnTo=${encodeURIComponent(LESSON)}`,
    )
  })

  it('leaves the path alone without a safe returnTo', () => {
    expect(withSubscribeReturnTo('https://a.co/x', '//evil')).toBe('https://a.co/x')
  })
})
