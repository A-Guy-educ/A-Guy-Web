/**
 * Profile details a student types on /join (first name, last name, mobile),
 * saved onto their user once they've signed in with Google, along with
 * `onboardingType: 'b2b'` — they came in through their school, not through
 * regular (B2C) onboarding. Users without the field are B2C. Free students
 * are also promoted to the basic tier (`tierGrantSource: 'b2b'`).
 *
 * The fields are declared on the Admin-owned Users collection; Web writes
 * them directly, like the other signup fields.
 *
 * @fileType service
 * @domain classroom
 * @pattern service
 * @ai-summary Validates and saves the /join profile (name, phone, B2B onboarding) and grants free students the basic tier
 */

import type { Document } from 'mongodb'
import { z } from 'zod'

import { getContentDb, objectIdFromString } from '@/infra/db/content-db'
import {
  DEFAULT_TIER,
  TIER_LLM_TOKEN_CAP_DAILY,
  TIER_LLM_TOKEN_CAP_MONTHLY,
  type TierSlug,
} from '@/lib/tiers/constants'

const USERS_COLLECTION = 'users'

const B2B_TIER: TierSlug = 'basic'
const TIER_GRANT_SOURCE_B2B = 'b2b'

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
  const users = db.collection(USERS_COLLECTION)
  const userFilter = { _id: objectIdFromString(userId) } as Document
  await users.updateOne(userFilter, {
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

  // School students get the basic tier, granted directly on the user — no
  // Subscription row, which would pull them into Tranzila renewal/cancel
  // flows. Only free (or tier-less) users are promoted, so a paying student
  // keeps their tier and grant source, and a repeat /join is a no-op.
  // currentTier and tierGrantSource land in one write: Admin's
  // backfillTierGrantSource tags any non-free user without a source as
  // 'legacy_one_time'. Mirrors Admin's applyTierPurchase.
  await users.updateOne(
    {
      ...userFilter,
      $or: [
        { currentTier: { $exists: false } },
        { currentTier: null },
        { currentTier: DEFAULT_TIER },
      ],
    },
    {
      $set: {
        currentTier: B2B_TIER,
        tierGrantSource: TIER_GRANT_SOURCE_B2B,
        llmTokensLimit: TIER_LLM_TOKEN_CAP_MONTHLY[B2B_TIER],
        llmTokensDailyLimit: TIER_LLM_TOKEN_CAP_DAILY[B2B_TIER],
        updatedAt: new Date(),
      },
    },
  )
}
