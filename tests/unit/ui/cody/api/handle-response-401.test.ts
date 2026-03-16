/**
 * @fileType test
 * @domain cody | ui
 * @pattern bug-fix
 * @ai-summary Tests that handleResponse distinguishes server token 401 from session auth 401
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { handleResponse, NoTokenError, ApiError } from '@/ui/cody/api'

/** Helper to build a mock Response with JSON body */
function mockResponse(status: number, body: Record<string, unknown>): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response
}

describe('handleResponse — 401 handling', () => {
  afterEach(() => {
    // Restore window after each test
    vi.restoreAllMocks()
  })

  it('throws NoTokenError when server returns error=no_token', async () => {
    const res = mockResponse(401, {
      error: 'no_token',
      message: 'GitHub token is not configured. Set CODY_BOT_TOKEN or GITHUB_TOKEN.',
    })

    await expect(handleResponse(res)).rejects.toThrow(NoTokenError)
    await expect(
      handleResponse(
        mockResponse(401, {
          error: 'no_token',
          message: 'GitHub token is not configured. Set CODY_BOT_TOKEN or GITHUB_TOKEN.',
        }),
      ),
    ).rejects.toMatchObject({
      name: 'NoTokenError',
      message: 'GitHub token is not configured. Set CODY_BOT_TOKEN or GITHUB_TOKEN.',
    })
  })

  it('throws ApiError (not NoTokenError) for session auth 401', async () => {
    // Simulate server-side (no window) to avoid redirect
    const savedWindow = globalThis.window
    // @ts-expect-error — intentionally removing window for SSR simulation
    delete globalThis.window

    try {
      const res = mockResponse(401, {
        message: 'Not authenticated. Please log in to access the dashboard.',
      })

      await expect(handleResponse(res)).rejects.toThrow(ApiError)
      await expect(
        handleResponse(
          mockResponse(401, {
            message: 'Not authenticated. Please log in to access the dashboard.',
          }),
        ),
      ).rejects.not.toThrow(NoTokenError)
    } finally {
      globalThis.window = savedWindow
    }
  })

  it('redirects to OAuth on session 401 when window exists', async () => {
    // Mock window.location
    const mockLocation = { pathname: '/cody/839/preview/comments', href: '' }
    vi.stubGlobal('window', { location: mockLocation })

    const res = mockResponse(401, {
      message: 'Not authenticated. Please log in to access the dashboard.',
    })

    await expect(handleResponse(res)).rejects.toThrow(ApiError)

    // Verify redirect was triggered
    expect(mockLocation.href).toBe('/api/oauth/github?returnTo=%2Fcody%2F839%2Fpreview%2Fcomments')
  })

  it('preserves returnTo path when redirecting on session expiry', async () => {
    const mockLocation = { pathname: '/cody/123', href: '' }
    vi.stubGlobal('window', { location: mockLocation })

    const res = mockResponse(401, { message: 'Session expired' })

    await expect(handleResponse(res)).rejects.toThrow(ApiError)
    expect(mockLocation.href).toContain('returnTo=%2Fcody%2F123')
  })

  it('does NOT redirect for no_token 401 (server config issue, not session)', async () => {
    const mockLocation = { pathname: '/cody', href: '' }
    vi.stubGlobal('window', { location: mockLocation })

    const res = mockResponse(401, {
      error: 'no_token',
      message: 'GitHub token is not configured.',
    })

    await expect(handleResponse(res)).rejects.toThrow(NoTokenError)
    // Should NOT have redirected
    expect(mockLocation.href).toBe('')
  })

  it('passes through the server message on session auth ApiError', async () => {
    const savedWindow = globalThis.window
    // @ts-expect-error — intentionally removing window for SSR simulation
    delete globalThis.window

    try {
      const res = mockResponse(401, {
        message: 'Not authenticated. Please log in to access the dashboard.',
      })

      try {
        await handleResponse(res)
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError)
        expect((e as ApiError).message).toBe(
          'Not authenticated. Please log in to access the dashboard.',
        )
        expect((e as ApiError).status).toBe(401)
      }
    } finally {
      globalThis.window = savedWindow
    }
  })

  it('uses fallback message when server returns empty message on session 401', async () => {
    const savedWindow = globalThis.window
    // @ts-expect-error — intentionally removing window for SSR simulation
    delete globalThis.window

    try {
      const res = mockResponse(401, {})

      try {
        await handleResponse(res)
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError)
        expect((e as ApiError).message).toBe('Not authenticated')
      }
    } finally {
      globalThis.window = savedWindow
    }
  })
})
