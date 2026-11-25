import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface Doc {
  phone: string
  codeHash: string
  attempts: number
  expiresAt: Date
  createdAt: Date
}

/**
 * Just enough of a Mongo collection for the three queries login-codes runs:
 * upsert-replace by phone, claim-an-attempt, and conditional delete.
 */
function fakeCodesCollection() {
  const rows = new Map<string, Doc>()
  return {
    rows,
    createIndex: vi.fn().mockResolvedValue('ok'),
    replaceOne: vi.fn(async (filter: { phone: string }, doc: Doc) => {
      rows.set(filter.phone, { ...doc })
    }),
    findOneAndUpdate: vi.fn(
      async (filter: { phone: string; expiresAt: { $gt: Date }; attempts: { $lt: number } }) => {
        const row = rows.get(filter.phone)
        if (!row || row.expiresAt <= filter.expiresAt.$gt || row.attempts >= filter.attempts.$lt) {
          return null
        }
        const updated = { ...row, attempts: row.attempts + 1 }
        rows.set(filter.phone, updated)
        return updated
      },
    ),
    deleteOne: vi.fn(async (filter: { phone: string; codeHash: string }) => {
      const row = rows.get(filter.phone)
      if (!row || row.codeHash !== filter.codeHash) return { deletedCount: 0 }
      rows.delete(filter.phone)
      return { deletedCount: 1 }
    }),
  }
}

let collection: ReturnType<typeof fakeCodesCollection>

vi.mock('@/infra/db/content-db', () => ({
  getContentDb: async () => ({ collection: () => collection }),
}))

const PHONE = '972501234567'

describe('WhatsApp login codes', () => {
  beforeEach(() => {
    vi.stubEnv('PAYLOAD_SECRET', 'test-secret')
    collection = fakeCodesCollection()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('issues a 6-digit code and stores only its hash', async () => {
    const { issueLoginCode } = await import('@/server/services/whatsapp-login/login-codes')
    const code = await issueLoginCode(PHONE)
    expect(code).toMatch(/^\d{6}$/)
    const stored = collection.rows.get(PHONE)
    expect(stored?.codeHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(stored)).not.toContain(`"${code}"`)
  })

  it('accepts the right code once, then treats it as used', async () => {
    const { checkLoginCode, issueLoginCode } =
      await import('@/server/services/whatsapp-login/login-codes')
    const code = await issueLoginCode(PHONE)
    expect(await checkLoginCode(PHONE, code)).toBe('ok')
    expect(await checkLoginCode(PHONE, code)).toBe('expired')
  })

  it('rejects a wrong code and locks after the attempt limit', async () => {
    const { checkLoginCode, issueLoginCode, MAX_CODE_ATTEMPTS } =
      await import('@/server/services/whatsapp-login/login-codes')
    const code = await issueLoginCode(PHONE)
    const wrong = code === '000000' ? '111111' : '000000'
    for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
      expect(await checkLoginCode(PHONE, wrong)).toBe('invalid')
    }
    // Even the right code is refused once the guesses are used up.
    expect(await checkLoginCode(PHONE, code)).toBe('expired')
  })

  it('expires codes after 10 minutes', async () => {
    vi.useFakeTimers()
    const { checkLoginCode, issueLoginCode } =
      await import('@/server/services/whatsapp-login/login-codes')
    const code = await issueLoginCode(PHONE)
    vi.advanceTimersByTime(10 * 60 * 1000 + 1)
    expect(await checkLoginCode(PHONE, code)).toBe('expired')
  })

  it('invalidates the previous code when a new one is issued', async () => {
    const { checkLoginCode, issueLoginCode } =
      await import('@/server/services/whatsapp-login/login-codes')
    const first = await issueLoginCode(PHONE)
    let second = await issueLoginCode(PHONE)
    while (second === first) second = await issueLoginCode(PHONE)
    expect(await checkLoginCode(PHONE, first)).toBe('invalid')
    expect(await checkLoginCode(PHONE, second)).toBe('ok')
  })

  it('does not accept one phone’s code for another phone', async () => {
    const { checkLoginCode, issueLoginCode } =
      await import('@/server/services/whatsapp-login/login-codes')
    const code = await issueLoginCode(PHONE)
    expect(await checkLoginCode('972541234567', code)).toBe('expired')
  })
})
