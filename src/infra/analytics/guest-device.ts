/**
 * Coarse device of an anonymous visit, from its User-Agent: the platform and
 * the in-app browser it runs in, if any. Stored on the guest session so the
 * dashboard funnel can be split by device (e.g. where Google sign-in drops).
 *
 * Pure and edge-safe — middleware calls it on the first page load.
 *
 * In-app detection only sees apps that mark their UA. iOS in-app views of
 * WhatsApp/Telegram look like plain Safari, so they count as `null`.
 */

export const DEVICE_PLATFORMS = ['ios', 'android', 'computer', 'other'] as const
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number]

export const IN_APP_BROWSERS = ['instagram', 'facebook', 'tiktok', 'snapchat', 'other_app'] as const
export type InAppBrowser = (typeof IN_APP_BROWSERS)[number]

export interface GuestDevice {
  platform: DevicePlatform
  inApp: InAppBrowser | null
}

const IN_APP_PATTERNS: ReadonlyArray<readonly [InAppBrowser, RegExp]> = [
  ['instagram', /Instagram/i],
  ['facebook', /FBAN|FBAV|FB_IAB|FBIOS/],
  ['tiktok', /musical_ly|BytedanceWebview|TikTok/i],
  ['snapchat', /Snapchat/i],
  // Android WebView marker — some other app's built-in browser.
  ['other_app', /; wv\)/],
]

function platformOf(ua: string): DevicePlatform {
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  // Before the desktop check: Android UAs also say "Linux".
  if (/Android/.test(ua)) return 'android'
  if (/Windows|Macintosh|CrOS|X11|Linux/.test(ua)) return 'computer'
  return 'other'
}

export function classifyGuestDevice(userAgent: string | null): GuestDevice {
  const ua = userAgent ?? ''
  const inApp = IN_APP_PATTERNS.find(([, pattern]) => pattern.test(ua))?.[0] ?? null
  return { platform: platformOf(ua), inApp }
}

/** Validates a device received over the middleware loopback; null when malformed. */
export function parseGuestDevice(value: unknown): GuestDevice | null {
  if (!value || typeof value !== 'object') return null
  const { platform, inApp } = value as { platform?: unknown; inApp?: unknown }
  if (!DEVICE_PLATFORMS.includes(platform as DevicePlatform)) return null
  if (inApp !== null && !IN_APP_BROWSERS.includes(inApp as InAppBrowser)) return null
  return { platform: platform as DevicePlatform, inApp: inApp as InAppBrowser | null }
}
