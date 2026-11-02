/**
 * Profile details a student types on /join (first name, last name, mobile),
 * saved onto their user once they've signed in with Google, along with
 * `onboardingType: 'b2b'` — they came in through their school, not through
 * regular (B2C) onboarding. Users without the field are B2C.
 *
 * The fields are declared on the Admin-owned Users collection; Web writes
 * them directly, like the other signup fields.
 *
 * @fileType service
 * @domain classroom
 * @pattern service
 * @ai-summary Validates and saves the /join profile (name, phone, B2B onboarding) onto a user
 */

import type { Document } from 'mongodb'
import { z } from 'zod'

import { getContentDb, objectIdFromString } from '@/infra/db/content-db'

const USERS_COLLECTION = 'users'

/** Israeli mobile, digits only: 05XXXXXXXX. */
const MOBILE = /^05\d{8}$/

export const ONBOARDING_TYPE_B2B = 'b2b'

const personName = z.string().trim().min(1).max(50)

export const studentJoinProfileSchema = z.object({
  firstName: personName,
  lastName: personName,
  phone: z
    .string()
    .transform((raw) => raw.replace(/\D/g, ''))
    .pipe(z.string().regex(MOBILE)),
})

export type StudentJoinProfile = z.infer<typeof studentJoinProfileSchema>

export async function saveStudentJoinProfile(
  userId: string,
  profile: StudentJoinProfile,
): Promise<void> {
  const db = await getContentDb()
  await db.collection(USERS_COLLECTION).updateOne({ _id: objectIdFromString(userId) } as Document, {
    $set: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      // `name` is what teachers and the dashboards show; Google's own name
      // stays in `googleProfile.name`.
      name: `${profile.firstName} ${profile.lastName}`,
      phone: profile.phone,
      onboardingType: ONBOARDING_TYPE_B2B,
      updatedAt: new Date(),
    },
  })
}
