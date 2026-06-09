import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Preview is unavailable without a CMS.' }, { status: 410 })
}
