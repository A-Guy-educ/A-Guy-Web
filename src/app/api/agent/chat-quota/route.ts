import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ remaining: 0, limit: 0, resetAt: null })
}
