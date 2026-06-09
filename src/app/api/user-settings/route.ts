import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ settings: null })
}

export async function POST() {
  return NextResponse.json({ success: false, error: 'settings_unavailable' }, { status: 410 })
}
