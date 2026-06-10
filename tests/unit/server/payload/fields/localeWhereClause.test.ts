import { describe, expect, it } from 'vitest'
import { localeWhereClause } from '@/infra/types/content'

describe('localeWhereClause', () => {
  it('returns an OR clause matching the locale or missing field', () => {
    const result = localeWhereClause('he')

    expect(result).toEqual({
      or: [{ locale: { equals: 'he' } }, { locale: { exists: false } }],
    })
  })

  it('works with "en" locale', () => {
    const result = localeWhereClause('en')

    expect(result).toEqual({
      or: [{ locale: { equals: 'en' } }, { locale: { exists: false } }],
    })
  })
})
