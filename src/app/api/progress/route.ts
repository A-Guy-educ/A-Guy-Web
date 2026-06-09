import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ progressMap: {} })
}

export async function POST() {
  return NextResponse.json({ success: false, error: 'progress_unavailable' }, { status: 410 })
}
