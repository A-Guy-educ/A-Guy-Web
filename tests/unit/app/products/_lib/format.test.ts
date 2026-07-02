/**
 * Unit tests for the storefront helpers in `_lib/format.ts`.
 *
 * Covers the grade-derivation rules (Hebrew + English title patterns) and
 * the price formatter used by both BigProductCard and InactiveProductCard.
 *
 * @fileType unit-test
 * @domain billing
 */

import { describe, expect, it } from 'vitest'

import { deriveProductGradeLabel, formatProductPrice } from '@/app/(frontend)/products/_lib/format'

describe('deriveProductGradeLabel — Hebrew titles', () => {
  it.each([
    ['הכנה מקיפה לכיתה ז׳', "ז'"],
    ['כיתה ז', "ז'"],
    ['כיתה ח׳', "ח'"],
    ['כיתה ח', "ח'"],
    ['כיתה ט׳', "ט'"],
    ['כיתה י׳', "י'"],
    ['בגרות במתמטיקה', '%'],
    ['מקצוע הבגרות', '%'],
  ])('maps %s → %s', (title, expected) => {
    expect(deriveProductGradeLabel(title, 'he')).toBe(expected)
  })
})

describe('deriveProductGradeLabel — English titles', () => {
  it.each([
    ['Grade 7 Prep', '7'],
    ['Grade 8', '8'],
    ['Grade 9', '9'],
    ['Grade 10', '10'],
    ['Bagrut Mathematics', '%'],
    ['Matriculation Prep', '%'],
  ])('maps %s → %s', (title, expected) => {
    expect(deriveProductGradeLabel(title, 'en')).toBe(expected)
  })
})

describe('deriveProductGradeLabel — fallback', () => {
  it('returns null for an empty title', () => {
    expect(deriveProductGradeLabel('', 'he')).toBeNull()
    expect(deriveProductGradeLabel(null, 'he')).toBeNull()
    expect(deriveProductGradeLabel(undefined, 'he')).toBeNull()
  })

  it('returns null when no rule matches the title', () => {
    expect(deriveProductGradeLabel('מוצר כללי', 'he')).toBeNull()
    expect(deriveProductGradeLabel('Generic Product', 'en')).toBeNull()
  })
})

describe('formatProductPrice', () => {
  it('formats ILS in Hebrew locale with the ₪ symbol', () => {
    // he-IL puts the symbol after the number for ILS — accept either order
    // since Intl behavior differs across runtimes; the test guards against
    // returning raw numbers or NaN.
    const formatted = formatProductPrice(299, 'ILS')
    expect(formatted).toContain('299')
    expect(formatted).toMatch(/₪|ILS/)
  })

  it('formats USD in English locale with the $ symbol', () => {
    const formatted = formatProductPrice(149, 'USD')
    expect(formatted).toContain('149')
    expect(formatted).toMatch(/\$|USD/)
  })

  it('formats whole numbers without any decimal separator', () => {
    const formatted = formatProductPrice(150, 'ILS')
    expect(formatted).toContain('150')
    expect(formatted).not.toMatch(/\./)
  })

  it('returns a non-empty string for zero price', () => {
    const formatted = formatProductPrice(0, 'ILS')
    expect(formatted.length).toBeGreaterThan(0)
  })
})
