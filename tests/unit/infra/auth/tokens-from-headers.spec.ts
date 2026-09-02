import { describe, expect, it } from 'vitest'

import { tokensFromHeaders } from '@/infra/auth/web-auth'

describe('tokensFromHeaders', () => {
  it('returns an empty array when no auth is present', () => {
    expect(tokensFromHeaders(new Headers())).toEqual([])
  })

  it('extracts a single payload-token cookie', () => {
    const headers = new Headers({ cookie: 'payload-token=abc.def.ghi' })
    expect(tokensFromHeaders(headers)).toEqual(['abc.def.ghi'])
  })

  // Regression: a browser can carry more than one cookie with the same name
  // when scopes differ (host-only vs Domain=, or Partitioned toggled on/off).
  // Iterating is what lets us survive redeploys where the stale variant leads
  // the header and the fresh one is right behind it — the login-modal loop
  // mobile users could not escape by clearing cookies by hand.
  it('extracts every payload-token cookie the header carries', () => {
    const headers = new Headers({
      cookie: 'payload-token=stale.old.token; other=x; payload-token=fresh.valid.token',
    })
    expect(tokensFromHeaders(headers)).toEqual(['stale.old.token', 'fresh.valid.token'])
  })

  it('prefers the Authorization bearer token over cookies', () => {
    const headers = new Headers({
      authorization: 'Bearer bearer.token.value',
      cookie: 'payload-token=cookie.token.value',
    })
    expect(tokensFromHeaders(headers)).toEqual(['bearer.token.value', 'cookie.token.value'])
  })

  it('ignores cookies with different names', () => {
    const headers = new Headers({
      cookie: 'session=nope; payload-token-other=nope; payload-token=yes',
    })
    expect(tokensFromHeaders(headers)).toEqual(['yes'])
  })
})
