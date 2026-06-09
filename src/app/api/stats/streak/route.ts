import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ streak: 0 })
}
