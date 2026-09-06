/**
 * @fileType utility
 * @domain media
 * @ai-summary Resolve a media doc `url` to something both the browser and the server can fetch, forwarding proxy paths owned by the Admin app to that app.
 */

const MEDIA_PROXY_PREFIX = '/api/media/'

/**
 * Media docs owned by the Admin app are stored with a same-origin proxy `url`
 * (e.g. `/api/media/file/foo.pdf`) that only Admin's Payload static handler
 * knows how to serve. Web sees that URL over the shared Mongo collection but
 * cannot resolve it against its own Blob store.
 *
 * This turns those relative proxy paths into absolute URLs on the Admin app,
 * so a server-side `fetch` or a redirect from Web lands on the app that
 * actually holds the file. Absolute URLs (Blob CDN, external providers) are
 * passed through untouched — they already work from anywhere.
 *
 * Returns `null` when the input is not resolvable — either empty, or a relative
 * proxy path with no Admin URL configured. Callers can then keep their existing
 * fallback (e.g. 404) rather than fetching a URL that will silently misresolve.
 */
export function resolveMediaSourceUrl(url: string | null | undefined): string | null {
  if (!url) return null

  if (url.startsWith('http://') || url.startsWith('https://')) return url

  if (!url.startsWith(MEDIA_PROXY_PREFIX)) return null

  const adminBase = process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/+$/, '')
  if (!adminBase) return null

  return `${adminBase}${url}`
}
