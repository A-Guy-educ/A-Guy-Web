import { ObjectId } from 'mongodb'
import { NextRequest, NextResponse } from 'next/server'

import { getContentDb, relationId, serializeDoc } from '@/infra/db/content-db'
import { getWebUser } from '@/infra/web-api/mongo-payload'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  const db = await getContentDb()
  const transaction = await db.collection('transactions').findOne({ _id: new ObjectId(id) })
  if (!transaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  if (relationId(transaction.user) !== user.id) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  return NextResponse.json({ transaction: serializeDoc(transaction) })
}
