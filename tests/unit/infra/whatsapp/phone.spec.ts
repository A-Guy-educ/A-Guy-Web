import { describe, expect, it } from 'vitest'

import {
  formatIsraeliPhone,
  isWhatsAppPlaceholderEmail,
  normalizeWhatsAppPhone,
  whatsAppPlaceholderEmail,
} from '@/infra/whatsapp/phone'

describe('normalizeWhatsAppPhone', () => {
  it.each([
    ['0501234567', '972501234567'],
    ['050-123-4567', '972501234567'],
    ['050 123 4567', '972501234567'],
    ['(050) 123-4567', '972501234567'],
    ['+972501234567', '972501234567'],
    ['+972 50-123-4567', '972501234567'],
    ['972501234567', '972501234567'],
    ['00972501234567', '972501234567'],
    ['+972 050 123 4567', '972501234567'],
    ['  0541234567  ', '972541234567'],
  ])('accepts %s', (input, expected) => {
    expect(normalizeWhatsAppPhone(input)).toBe(expected)
  })

  it.each([
    ['', 'empty'],
    ['abc', 'letters'],
    ['050123456', 'too short'],
    ['05012345678', 'too long'],
    ['021234567', 'landline'],
    ['+15551234567', 'non-Israeli'],
    ['+447911123456', 'non-Israeli'],
    ['050-123-4567x', 'trailing junk'],
  ])('rejects %s (%s)', (input) => {
    expect(normalizeWhatsAppPhone(input)).toBeNull()
  })
})

describe('formatIsraeliPhone', () => {
  it('shows the local form', () => {
    expect(formatIsraeliPhone('972501234567')).toBe('050-123-4567')
  })
})

describe('placeholder emails', () => {
  it('round-trips', () => {
    const email = whatsAppPlaceholderEmail('972501234567')
    expect(email).toBe('972501234567@whatsapp.invalid')
    expect(isWhatsAppPlaceholderEmail(email)).toBe(true)
  })

  it('does not flag real emails', () => {
    expect(isWhatsAppPlaceholderEmail('student@gmail.com')).toBe(false)
    expect(isWhatsAppPlaceholderEmail(null)).toBe(false)
    expect(isWhatsAppPlaceholderEmail(undefined)).toBe(false)
  })
})
