import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Doc = Record<string, unknown>

const { users } = vi.hoisted(() => ({ users: new Map<string, Doc>() }))

/** Just enough of Mongo's matcher for the filters this service sends. */
function matches(doc: Doc, filter: Doc): boolean {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return (cond as Doc[]).some((f) => matches(doc, f))
    const value = doc[key]
    if (cond instanceof ObjectId) return value instanceof ObjectId && value.equals(cond)
    if (cond && typeof cond === 'object' && '$exists' in cond) {
      return (cond as { $exists: boolean }).$exists === key in doc
    }
    return cond === null ? value === null || value === undefined : value === cond
  })
}

vi.mock('@/infra/db/content-db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/infra/db/content-db')>()),
  getContentDb: async () => ({
    collection: () => ({
      updateOne: vi.fn(async (filter: Doc, update: { $set: Doc }) => {
        const entry = [...users.entries()].find(([, doc]) => matches(doc, filter))
        if (entry) users.set(entry[0], { ...entry[1], ...update.$set })
        return { matchedCount: entry ? 1 : 0 }
      }),
    }),
  }),
}))

import { saveStudentJoinProfile } from '@/server/services/classroom/student-join-profile'

const PROFILE = { firstName: 'נועה', lastName: 'כהן', phone: '0501234567' }
const BASIC_CAPS = { llmTokensLimit: 15_000_000, llmTokensDailyLimit: 1_000_000 }

function seedUser(fields: Doc = {}) {
  const id = new ObjectId()
  users.set(id.toString(), { _id: id, ...fields })
  return id.toString()
}

const userDoc = (id: string) => users.get(id) as Doc

describe('saveStudentJoinProfile', () => {
  beforeEach(() => users.clear())

  it('saves the profile and marks the user as B2B', async () => {
    const id = seedUser({ name: 'Google Name' })

    await saveStudentJoinProfile(id, PROFILE)

    expect(userDoc(id)).toMatchObject({
      ...PROFILE,
      name: 'נועה כהן',
      onboardingType: 'b2b',
    })
  })

  it('promotes a free user to basic with the b2b source and basic caps', async () => {
    const id = seedUser({ currentTier: 'free', llmTokensLimit: 1_500_000 })

    await saveStudentJoinProfile(id, PROFILE)

    expect(userDoc(id)).toMatchObject({
      currentTier: 'basic',
      tierGrantSource: 'b2b',
      ...BASIC_CAPS,
    })
  })

  it.each([{}, { currentTier: null }])('promotes a user with no tier %#', async (fields) => {
    const id = seedUser(fields)

    await saveStudentJoinProfile(id, PROFILE)

    expect(userDoc(id)).toMatchObject({ currentTier: 'basic', tierGrantSource: 'b2b' })
  })

  it('leaves a paying user on a higher tier untouched', async () => {
    const paid = {
      currentTier: 'advanced',
      tierGrantSource: 'subscription',
      tierGrantSubscriptionId: 'sub-1',
      llmTokensLimit: 30_000_000,
      llmTokensDailyLimit: 2_000_000,
    }
    const id = seedUser(paid)

    await saveStudentJoinProfile(id, PROFILE)

    expect(userDoc(id)).toMatchObject({ ...paid, onboardingType: 'b2b' })
  })

  it('is a no-op for the tier on a repeat join', async () => {
    const id = seedUser({ currentTier: 'free' })
    await saveStudentJoinProfile(id, PROFILE)
    const afterFirst = { ...userDoc(id) }
    users.set(id, { ...afterFirst, llmTokensLimit: 20_000_000 })

    await saveStudentJoinProfile(id, PROFILE)

    expect(userDoc(id)).toMatchObject({
      currentTier: 'basic',
      tierGrantSource: 'b2b',
      llmTokensLimit: 20_000_000,
    })
    expect(userDoc(id)).not.toHaveProperty('tierGrantSubscriptionId')
  })
})
