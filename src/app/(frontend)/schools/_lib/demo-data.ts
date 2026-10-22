/**
 * Demo data for the /schools signup page.
 *
 * Everything here is a stand-in until the real backend exists: the school
 * list should come from a Schools collection (seeded from the Ministry of
 * Education institutions dataset, keyed by סמל מוסד), and coupon validation
 * should be a server call against admin. Keep the shapes — the form is built
 * against them.
 *
 * @fileType data
 * @domain schools
 */

import type { TierSlug } from '@/lib/tiers'

export interface DemoSchool {
  id: string
  name: string
  city: string
}

export const DEMO_SCHOOLS: readonly DemoSchool[] = [
  { id: 'demo-ironi-a-tlv', name: 'תיכון עירוני א׳', city: 'תל אביב-יפו' },
  { id: 'demo-ironi-d-tlv', name: 'תיכון עירוני ד׳', city: 'תל אביב-יפו' },
  { id: 'demo-makif-a-rishon', name: 'מקיף א׳', city: 'ראשון לציון' },
  { id: 'demo-makif-b-ashdod', name: 'מקיף ב׳', city: 'אשדוד' },
  { id: 'demo-ironi-haifa', name: 'תיכון עירוני ה׳', city: 'חיפה' },
  { id: 'demo-rabin-kfar-saba', name: 'תיכון רבין', city: 'כפר סבא' },
  { id: 'demo-hadarim-hod', name: 'תיכון הדרים', city: 'הוד השרון' },
  { id: 'demo-boyer-jlm', name: 'תיכון בויאר', city: 'ירושלים' },
  { id: 'demo-amit-beer-sheva', name: 'אמית', city: 'באר שבע' },
  { id: 'demo-ort-karmiel', name: 'אורט', city: 'כרמיאל' },
]

export const PAID_TIERS = ['basic', 'advanced', 'premium'] as const satisfies readonly TierSlug[]
export type PaidTier = (typeof PAID_TIERS)[number]

export const GRADES = ['7', '8', '9', '10', '11', '12'] as const
export type Grade = (typeof GRADES)[number]

/** Bagrut math study units — only asked from grade 10 up. */
export const MATH_UNITS = ['3', '4', '5'] as const
export type MathUnits = (typeof MATH_UNITS)[number]

export function gradeNeedsMathUnits(grade: Grade | ''): boolean {
  return grade === '10' || grade === '11' || grade === '12'
}

export interface SchoolCoupon {
  code: string
  percentOff: number
  /** When set, the code only works for this school and pre-selects it. */
  schoolId?: string
}

const DEMO_COUPONS: readonly SchoolCoupon[] = [
  { code: 'AGUY-SCHOOL', percentOff: 30 },
  { code: 'RABIN50', percentOff: 50, schoolId: 'demo-rabin-kfar-saba' },
  { code: 'BOYER100', percentOff: 100, schoolId: 'demo-boyer-jlm' },
]

export const DEMO_COUPON_CODES = DEMO_COUPONS.map((c) => c.code)

export type CouponCheck =
  { ok: true; coupon: SchoolCoupon } | { ok: false; reason: 'invalid' | 'wrongSchool' }

/** Simulates the server round-trip so the loading state is visible. */
export async function checkDemoCoupon(
  rawCode: string,
  schoolId: string | null,
): Promise<CouponCheck> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  const code = rawCode.trim().toUpperCase()
  const coupon = DEMO_COUPONS.find((c) => c.code === code)
  if (!coupon) return { ok: false, reason: 'invalid' }
  if (coupon.schoolId && schoolId && coupon.schoolId !== schoolId) {
    return { ok: false, reason: 'wrongSchool' }
  }
  return { ok: true, coupon }
}

/** Israeli mobile: 05X-XXXXXXX, with optional +972 / dashes / spaces. */
export function isValidIsraeliMobile(raw: string): boolean {
  const digits = raw.replace(/[\s-]/g, '').replace(/^\+972/, '0')
  return /^05\d{8}$/.test(digits)
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())
}

export function discountedPrice(price: number, percentOff: number): number {
  return Math.max(0, Math.round(price * (1 - percentOff / 100)))
}
