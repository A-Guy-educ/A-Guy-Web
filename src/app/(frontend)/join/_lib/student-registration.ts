/**
 * Data and submit stub for the /join student registration page.
 *
 * The school list is hardcoded until more schools join; swap it for a server
 * fetch then. `registerStudent` is a stand-in for `POST /api/students/register`,
 * which doesn't exist yet. Contract from the product demo:
 *   body  { school_id, class_id, full_name, phone }  (phone = digits only)
 *   409   phone number already registered → tell the student to log in
 *
 * @fileType data
 * @domain schools
 */

export interface SchoolClass {
  id: string
  name: string
}

export interface School {
  id: string
  name: string
  classes: readonly SchoolClass[]
}

export const SCHOOLS: readonly School[] = [
  {
    id: 'alon-ramat-gan',
    name: 'תיכון אלון, רמת גן',
    classes: [
      { id: '9-1', name: 'ט׳1' },
      { id: '9-2', name: 'ט׳2' },
      { id: '9-3', name: 'ט׳3' },
      { id: '9-4', name: 'ט׳4' },
      { id: '9-5', name: 'ט׳5' },
    ],
  },
]

export interface StudentRegistration {
  school_id: string
  class_id: string
  full_name: string
  phone: string
}

export type RegisterResult = 'ok' | 'alreadyRegistered' | 'failed'

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function isValidMobile(raw: string): boolean {
  return /^05\d{8}$/.test(normalizePhone(raw))
}

/** Stub: resolves 'ok' after a short delay. Replace with the real endpoint. */
export async function registerStudent(_payload: StudentRegistration): Promise<RegisterResult> {
  await new Promise((resolve) => setTimeout(resolve, 700))
  return 'ok'
}
