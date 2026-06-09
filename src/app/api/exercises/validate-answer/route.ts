import { NextResponse } from 'next/server'

const disabled = { error: 'This endpoint is unavailable without the removed CMS backend.' }

export async function GET() {
  return NextResponse.json(disabled, { status: 410 })
}

export async function POST() {
  return NextResponse.json(disabled, { status: 410 })
}

export async function PATCH() {
  return NextResponse.json(disabled, { status: 410 })
}

export async function DELETE() {
  return NextResponse.json(disabled, { status: 410 })
}
