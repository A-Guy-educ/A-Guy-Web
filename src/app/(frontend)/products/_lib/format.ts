/**
 * Shared display helpers for the /products storefront.
 *
 * Kept in a dedicated `_lib` so both `BigProductCard` (active paid) and
 * `InactiveProductCard` (coming-soon) can share the same currency formatter
 * and grade-derivation rules without duplicating them in each component.
 */

const HEBREW_GRADE_MAP: Array<{ match: RegExp; label: string }> = [
  { match: /כיתה\s*ז['׳]?/, label: "ז'" },
  { match: /כיתה\s*ח['׳]?/, label: "ח'" },
  { match: /כיתה\s*ט['׳]?/, label: "ט'" },
  { match: /כיתה\s*י['׳]?/, label: "י'" },
  { match: /בגרות/, label: '%' },
]

const ENGLISH_GRADE_MAP: Array<{ match: RegExp; label: string }> = [
  { match: /\bgrade\s*7\b/i, label: '7' },
  { match: /\bgrade\s*8\b/i, label: '8' },
  { match: /\bgrade\s*9\b/i, label: '9' },
  { match: /\bgrade\s*10\b/i, label: '10' },
  { match: /bagrut|matriculation/i, label: '%' },
]

/**
 * Derives a short grade/level label (e.g. "ח'", "ט'", "%") from a product's
 * title. The Products collection has no dedicated `courseLabel` field per
 * the issue's "no schema changes" constraint, so we infer the badge text
 * from the product's title — which follows the convention "כיתה ח'",
 * "כיתה ט'", "בגרות במתמטיקה", etc. Returns `null` when no rule matches so
 * the caller can decide to hide the badge entirely.
 */
export function deriveProductGradeLabel(
  title: string | null | undefined,
  locale: string,
): string | null {
  if (!title) return null
  const rules = locale === 'he' ? HEBREW_GRADE_MAP : ENGLISH_GRADE_MAP
  for (const rule of rules) {
    if (rule.match.test(title)) return rule.label
  }
  return null
}

export function formatProductPrice(price: number, currency: string): string {
  const formatter = new Intl.NumberFormat(currency === 'ILS' ? 'he-IL' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return formatter.format(price)
}
