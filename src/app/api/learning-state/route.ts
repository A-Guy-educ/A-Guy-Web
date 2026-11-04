import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { logger } from '@/infra/utils/logger/logger'
import { getWebUser } from '@/infra/web-api/mongo-payload'
import { LEARNING_STATE_KINDS } from '@/infra/learning-state/refs'
import { saveLearningStates } from '@/server/services/learning-state'

/** A full exercise bundle with submission history stays well under this. */
const MAX_STATE_JSON_LENGTH = 100_000
const MAX_WRITES_PER_REQUEST = 50

const WriteSchema = z.object({
  kind: z.enum(LEARNING_STATE_KINDS),
  key: z.string().min(1).max(200),
  state: z
    .record(z.string(), z.unknown())
    .nullable()
    .refine((state) => state === null || JSON.stringify(state).length <= MAX_STATE_JSON_LENGTH, {
      message: 'state too large',
    }),
})

const BodySchema = z.object({
  /** Whose browser storage these states came from (the `a-guy:owner` cookie). */
  ownerId: z.string().min(1),
  writes: z.array(WriteSchema).min(1).max(MAX_WRITES_PER_REQUEST),
})

/**
 * Write-through from the browser's learning-state cache. POST (not PUT) so the
 * page-hide flush can use a keepalive request.
 */
export async function POST(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // Storage written by a previous student on this browser, flushed before the
  // switch wiped it — never save it onto the account now signed in.
  if (parsed.data.ownerId !== String(user.id)) {
    return NextResponse.json({ error: 'Storage owner mismatch' }, { status: 409 })
  }

  try {
    await saveLearningStates(String(user.id), parsed.data.writes)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ event: 'learning_state_save_failed', userId: String(user.id), error })
    return NextResponse.json({ error: 'Failed to save learning state' }, { status: 500 })
  }
}
