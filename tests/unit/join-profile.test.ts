import { describe, expect, it } from 'vitest'

import { firstInvalidProfileField, isJoinProfile } from '@/app/(frontend)/join/_lib/join-profile'

const PROFILE = { firstName: 'נועה', lastName: 'כהן', phone: '050-123-4567' }

describe('firstInvalidProfileField', () => {
  it('accepts a complete profile with a formatted mobile number', () => {
    expect(firstInvalidProfileField(PROFILE)).toBeNull()
  })

  it.each([
    [{ ...PROFILE, firstName: ' ' }, 'firstName'],
    [{ ...PROFILE, lastName: '' }, 'lastName'],
    [{ ...PROFILE, phone: '03-1234567' }, 'phone'],
    [{ ...PROFILE, phone: '050123' }, 'phone'],
    [{ firstName: '', lastName: '', phone: '' }, 'firstName'],
  ])('flags the first field to fix %#', (profile, field) => {
    expect(firstInvalidProfileField(profile)).toBe(field)
  })
})

describe('isJoinProfile', () => {
  it('accepts a stored profile and rejects anything else', () => {
    expect(isJoinProfile(PROFILE)).toBe(true)
    expect(isJoinProfile({ firstName: 'נועה', lastName: 'כהן' })).toBe(false)
    expect(isJoinProfile(null)).toBe(false)
    expect(isJoinProfile('profile')).toBe(false)
  })
})
