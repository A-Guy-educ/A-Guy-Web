import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ remaining: 999, limit: 999, resetAt: null, allowed: true })
}
