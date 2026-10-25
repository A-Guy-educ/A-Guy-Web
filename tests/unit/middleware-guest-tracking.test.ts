/**
 * Middleware → internal loopback wiring for the guest funnel:
 * - human first touch → signed guest-session insert carrying landing data
 * - UA-detected bot   → signed bot-hit increment, no guest cookie
 */

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const afterCallbacks = vi.hoisted(() => [] as Array<() => unknown>)

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return { ...actual, after: (cb: () => unknown) => void afterCallbacks.push(cb) }
})

import { signGuestPayload } from '@/infra/analytics/guest-session-signing'
import { middleware } from '@/middleware'

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const SECRET = 'test-secret'

function request(path: string, headers: Record<string, string>) {
  return new NextRequest(new URL(path, 'https://www.aguy.co.il'), {
    headers: { host: 'www.aguy.co.il', ...headers },
  })
}

async function flushLoopbacks(fetchMock: ReturnType<typeof vi.fn>) {
  await Promise.all(afterCallbacks.map((cb) => cb()))
  return fetchMock.mock.calls.map(([url, init]) => ({
    path: new URL(String(url)).pathname,
    body: String((init as RequestInit).body),
    signature: (init as { headers: Record<string, string> }).headers['x-signature'],
  }))
}

describe('middleware guest tracking', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    afterCallbacks.length = 0
    vi.stubEnv('PAYLOAD_SECRET', SECRET)
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sends landing attribution with the signed insert for a human first touch', async () => {
    const response = middleware(
      request('/courses/m/chapters/c/lessons/l?utm_source=fb&secret=1', {
        'user-agent': CHROME,
        referer: 'https://l.facebook.com/',
      }),
    )
    const cookie = response.cookies.get('guest_session_id')?.value
    expect(cookie).toBeTruthy()

    const [call] = await flushLoopbacks(fetchMock)
    expect(call?.path).toBe('/api/internal/guest-session/create')
    expect(JSON.parse(call!.body)).toEqual({
      sessionId: cookie,
      landing: {
        landingPath: '/courses/m/chapters/c/lessons/l',
        landingType: 'lesson',
        referrerHost: 'l.facebook.com',
        utmSource: 'fb',
        utmMedium: null,
        utmCampaign: null,
      },
    })
    expect(call?.signature).toBe(await signGuestPayload(call!.body, SECRET))
    expect(call!.body).not.toContain('secret=1')
  })

  it('counts a bot hit by category and mints no guest cookie', async () => {
    const response = middleware(request('/start', { 'user-agent': 'GPTBot/1.2' }))
    expect(response.cookies.get('guest_session_id')).toBeUndefined()

    const calls = await flushLoopbacks(fetchMock)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.path).toBe('/api/internal/bot-hits/record')
    expect(JSON.parse(calls[0]!.body)).toEqual({ category: 'ai-crawler' })
  })

  it('tracks nothing for signed-in visitors or returning guests', async () => {
    middleware(request('/', { 'user-agent': CHROME, cookie: 'payload-token=abc' }))
    middleware(
      request('/', {
        'user-agent': CHROME,
        cookie: 'guest_session_id=3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e',
      }),
    )
    expect(await flushLoopbacks(fetchMock)).toEqual([])
  })
})
