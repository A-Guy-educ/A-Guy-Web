/**
 * Classifies a document.referrer URL into one of the signup-source buckets
 * we report on the dashboard.
 *
 * Rules (in order):
 * - hostname matches *.google.*        → 'google'
 * - hostname matches guykoren.co.il    → 'guykoren' (with or without www.)
 * - empty referrer OR same host        → 'direct'
 * - anything else                      → 'other'
 *
 * `currentHost` is the site's own hostname; referrers from our own pages are
 * treated as first-touch = 'direct' rather than a distinct traffic source.
 */

export type SignupSource = 'google' | 'guykoren' | 'direct' | 'other'

export const SIGNUP_SOURCES: readonly SignupSource[] = ['google', 'guykoren', 'direct', 'other']

function hostnameOf(url: string): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

function isGoogleHost(host: string): boolean {
  // Anchor both ends so `google.evil.com` can't slip in via a permissive
  // trailing `[a-z.]+`. TLD grammar covers `.com`, `.co.uk`, `.co.il`, `.de`,
  // `.com.au`, etc. — the shapes Google actually uses across regions.
  return /^(?:[a-z0-9-]+\.)*google\.(?:[a-z]{2,}|co\.[a-z]{2}|com\.[a-z]{2})$/i.test(host)
}

function isGuyKorenHost(host: string): boolean {
  return host === 'guykoren.co.il' || host === 'www.guykoren.co.il'
}

export function classifySignupSource(referrer: string, currentHost?: string): SignupSource {
  const host = hostnameOf(referrer)
  if (!host) return 'direct'
  if (currentHost && host === currentHost.toLowerCase()) return 'direct'
  if (isGoogleHost(host)) return 'google'
  if (isGuyKorenHost(host)) return 'guykoren'
  return 'other'
}
