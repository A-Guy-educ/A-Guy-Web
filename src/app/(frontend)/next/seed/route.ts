import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Seed is unavailable without a CMS.' }, { status: 410 })
}
