/**
 * WhatsApp login
 *
 * @fileType service
 * @domain auth
 * @pattern whatsapp-login
 * @ai-summary Two-step phone login: send a one-time code over WhatsApp, then exchange the code for the account that owns the number (creating one on first login). Rate-limited per phone and per IP because every send is billed.
 */

import { createHash } from 'crypto'

import {
  createWhatsAppUser,
  findUserByVerifiedPhone,
  type createSession,
  type GoogleUserAttribution,
} from '@/infra/auth/web-auth'
import { rateLimit } from '@/infra/security/rate-limit'
import { logger } from '@/infra/utils/logger'
import { sendWhatsAppAuthCode } from '@/infra/whatsapp/cloud-api'
import { normalizeWhatsAppPhone } from '@/infra/whatsapp/phone'
import { checkLoginCode, issueLoginCode } from './login-codes'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

/** Sends per phone: enough for a couple of "didn't get it" retries. */
const SEND_PER_PHONE = { limit: 3, windowMs: 15 * MINUTE }
const SEND_PER_PHONE_DAILY = { limit: 10, windowMs: 24 * HOUR }
/** Sends per IP: a school shares one IP, so this is per-class, not per-student. */
const SEND_PER_IP = { limit: 30, windowMs: HOUR }
/** Guesses per IP across all numbers, on top of the 5-per-code limit. */
const VERIFY_PER_IP = { limit: 60, windowMs: 15 * MINUTE }

const CODE_FORMAT = /^\d{6}$/

export type SendCodeResult =
  { ok: true; phone: string } | { ok: false; error: 'invalidPhone' | 'rateLimited' | 'sendFailed' }

/** The raw user document `createSession` takes. */
type SessionUser = Parameters<typeof createSession>[0]

export type VerifyCodeResult =
  | { ok: true; user: SessionUser; isNewUser: boolean }
  | { ok: false; error: 'invalidPhone' | 'invalidCode' | 'expiredCode' | 'rateLimited' }

/** Rate-limit keys never hold the raw IP. */
function ipKey(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

async function allowed(key: string, window: { limit: number; windowMs: number }) {
  return (await rateLimit({ key, ...window })).allowed
}

export async function requestWhatsAppLoginCode(input: {
  phone: string
  ip: string
}): Promise<SendCodeResult> {
  const phone = normalizeWhatsAppPhone(input.phone)
  if (!phone) return { ok: false, error: 'invalidPhone' }

  // Checked in sequence so a blocked IP does not also burn the phone's quota.
  if (
    !(await allowed(`whatsapp-send:ip:${ipKey(input.ip)}`, SEND_PER_IP)) ||
    !(await allowed(`whatsapp-send:phone:${phone}`, SEND_PER_PHONE)) ||
    !(await allowed(`whatsapp-send:phone-daily:${phone}`, SEND_PER_PHONE_DAILY))
  ) {
    return { ok: false, error: 'rateLimited' }
  }

  const code = await issueLoginCode(phone)
  try {
    await sendWhatsAppAuthCode(phone, code)
  } catch (error) {
    logger.error({ err: error }, 'WhatsApp login code could not be sent')
    return { ok: false, error: 'sendFailed' }
  }
  return { ok: true, phone }
}

export async function verifyWhatsAppLoginCode(input: {
  phone: string
  code: string
  ip: string
  /** Stamped on the account only if this login creates it. */
  attribution?: GoogleUserAttribution
}): Promise<VerifyCodeResult> {
  const phone = normalizeWhatsAppPhone(input.phone)
  if (!phone) return { ok: false, error: 'invalidPhone' }

  const code = input.code.trim()
  if (!CODE_FORMAT.test(code)) return { ok: false, error: 'invalidCode' }

  if (!(await allowed(`whatsapp-verify:ip:${ipKey(input.ip)}`, VERIFY_PER_IP))) {
    return { ok: false, error: 'rateLimited' }
  }

  const check = await checkLoginCode(phone, code)
  if (check === 'invalid') return { ok: false, error: 'invalidCode' }
  if (check === 'expired') return { ok: false, error: 'expiredCode' }

  const existing = await findUserByVerifiedPhone(phone)
  if (existing) return { ok: true, user: existing, isNewUser: false }

  const { user, created } = await createWhatsAppUser(phone, input.attribution)
  return { ok: true, user, isNewUser: created }
}
