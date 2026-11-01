/**
 * Token Usage — GET /api/users/me/token-usage
 *
 * The signed-in user's daily and monthly LLM token usage against their caps.
 * Drives the 50% / 90% usage alerts (`TokenUsageAlert`), which re-fetch after
 * each AI turn.
 *
 * @fileType route
 * @domain llm
 */

import { NextRequest, NextResponse } from 'next/server'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import { logger } from '@/infra/utils/logger/logger'
import { getTokenUsageSnapshot } from '@/server/services/llm-usage'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'authentication_required' }, { status: 401 })
  }

  try {
    const usage = await getTokenUsageSnapshot(String(user.id))
    return NextResponse.json(
      { success: true, data: usage },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    logger.error({ err, userId: user.id }, 'token-usage: snapshot failed')
    return NextResponse.json({ success: false, error: 'usage_unavailable' }, { status: 500 })
  }
}
