/**
 * Thin server-side proxy to the Admin app's HTTP API.
 *
 * Browser → Web (/api/...) → Admin (admin.dev.aguy.co.il / admin.aguy.co.il).
 *
 * We go through a server-side proxy instead of letting the browser hit Admin
 * directly because Admin's CORS allowlist is pinned to specific prod hostnames
 * + Vercel preview wildcards. Web's dev alias (`dev.aguy.co.il`) isn't on that
 * list, and dash/teacher already proxy the same way for `/api/users/me` — so
 * one shared pattern. The user's `payload-token` cookie is scoped to
 * `.aguy.co.il` and is forwarded verbatim; Admin's session middleware does the
 * rest.
 *
 * @fileType service
 * @domain billing
 */

import { logger } from '@/infra/utils/logger/logger'

/**
 * Base URL of the Admin app. Must NOT include a trailing slash. Set per env:
 *   dev  → https://admin.dev.aguy.co.il
 *   prod → https://admin.aguy.co.il
 */
export function getAdminApiUrl(): string {
  const raw = process.env.ADMIN_API_URL
  if (!raw) {
    throw new Error('ADMIN_API_URL is not set — cannot proxy to Admin app')
  }
  return raw.replace(/\/$/, '')
}

export interface AdminFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  /** Headers from the incoming web request. Only `cookie` is forwarded. */
  requestHeaders: Headers
  body?: unknown
}

export interface AdminFetchResult {
  status: number
  /** Raw JSON body, or `null` on 204/empty responses. */
  json: unknown
}

/**
 * Issue a server-to-server fetch against Admin, forwarding the caller's
 * session cookie. Returns the raw status + JSON so routes can pass admin's
 * error codes through verbatim (401/403/404/409/etc.).
 */
export async function fetchAdminApi(
  path: string,
  options: AdminFetchOptions,
): Promise<AdminFetchResult> {
  const base = getAdminApiUrl()
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const cookie = options.requestHeaders.get('cookie') ?? ''

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (cookie) headers.cookie = cookie
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    })
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? { message: err.message, stack: err.stack } : err, url },
      'Admin API proxy: network error',
    )
    throw err
  }

  // 204 No Content and empty bodies — don't try to parse.
  const text = await response.text()
  const json = text.length > 0 ? safeJsonParse(text) : null

  return { status: response.status, json }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
