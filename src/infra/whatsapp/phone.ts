/**
 * WhatsApp phone number normalization
 *
 * @fileType utility
 * @domain auth
 * @pattern whatsapp-login
 * @ai-summary Turns what a student types ("050-123-4567", "+972 50…") into the digits-only E.164 form the WhatsApp Cloud API expects, accepting Israeli mobile numbers only.
 */

/**
 * Israeli mobiles only. Every code we send is billed per message, and OTP
 * endpoints that accept any country are the classic target for SMS-pumping
 * fraud (bots requesting codes to premium-rate numbers abroad). Widen this
 * deliberately, with its own rate limits, if we ever sell outside Israel.
 */
const ISRAEL_COUNTRY_CODE = '972'
const ISRAELI_MOBILE = /^9725\d{8}$/

/**
 * Normalize user input to digits-only E.164 (`972501234567`), or `null` when
 * it is not an Israeli mobile number.
 *
 * Accepts the local form (`0501234567`), the international form with `+` or
 * `00`, and any spaces, dashes, dots or parentheses in between.
 */
export function normalizeWhatsAppPhone(input: string): string | null {
  const trimmed = input.trim()
  if (!/^[+\d\s\-().]+$/.test(trimmed)) return null

  let digits = trimmed.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = ISRAEL_COUNTRY_CODE + digits.slice(1)

  // "+972 050…" — people often keep the trunk 0 after the country code.
  if (digits.startsWith(`${ISRAEL_COUNTRY_CODE}0`)) {
    digits = ISRAEL_COUNTRY_CODE + digits.slice(ISRAEL_COUNTRY_CODE.length + 1)
  }

  return ISRAELI_MOBILE.test(digits) ? digits : null
}

/**
 * Accounts are keyed by email throughout Payload, so a WhatsApp-only student
 * gets a placeholder on the reserved `.invalid` TLD (RFC 2606): it satisfies
 * the email field yet can never receive mail if something tries to send some.
 */
const PLACEHOLDER_EMAIL_DOMAIN = 'whatsapp.invalid'

export function whatsAppPlaceholderEmail(e164: string): string {
  return `${e164}@${PLACEHOLDER_EMAIL_DOMAIN}`
}

/** True for the stand-in email of a WhatsApp-only account — never show or send to it. */
export function isWhatsAppPlaceholderEmail(email: string | null | undefined): boolean {
  return Boolean(email?.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`))
}

/** `972501234567` → `050-123-4567`, for showing a number back to its owner. */
export function formatIsraeliPhone(e164: string): string {
  const local = `0${e164.slice(ISRAEL_COUNTRY_CODE.length)}`
  return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`
}
