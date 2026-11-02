/**
 * The name and phone a student types on /join. Client-side checks mirror the
 * server schema (student-join-profile.ts), which has the final say.
 *
 * @fileType utility
 * @domain classroom
 */

export interface JoinProfile {
  firstName: string
  lastName: string
  phone: string
}

export type ProfileField = keyof JoinProfile

export const EMPTY_PROFILE: JoinProfile = { firstName: '', lastName: '', phone: '' }

const PROFILE_FIELDS: readonly ProfileField[] = ['firstName', 'lastName', 'phone']

const isValidMobile = (raw: string) => /^05\d{8}$/.test(raw.replace(/\D/g, ''))

const isFieldValid = (field: ProfileField, value: string) =>
  field === 'phone' ? isValidMobile(value) : value.trim().length > 0

/** First field that still needs fixing, in form order. */
export function firstInvalidProfileField(profile: JoinProfile): ProfileField | null {
  return PROFILE_FIELDS.find((field) => !isFieldValid(field, profile[field])) ?? null
}

export function isJoinProfile(value: unknown): value is JoinProfile {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return PROFILE_FIELDS.every((field) => typeof record[field] === 'string')
}
