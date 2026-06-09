import { ObjectId } from 'mongodb'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'

import { getContentDb, relationId } from '@/infra/db/content-db'
import { getWebUser } from '@/infra/web-api/mongo-payload'

const BodySchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'invalid_product_id'),
  provider: z.enum(['stripe', 'paypal']).default('stripe'),
  couponCode: z.string().max(50).optional(),
})

async function resolveProductItems(itemValues: unknown[]) {
  const ids = itemValues.map(relationId).filter((id): id is string => Boolean(id))
  if (!ids.length) return { itemIds: [], featureKeys: [] }

  const db = await getContentDb()
  const docs = await db
    .collection('product-items')
    .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } })
    .toArray()
  return {
    itemIds: docs.map((doc) => relationId(doc.lesson)).filter((id): id is string => Boolean(id)),
    featureKeys: docs
      .map((doc) => doc.featureKey)
      .filter((key): key is string => typeof key === 'string'),
  }
}

export async function POST(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'authentication_required' }, { status: 401 })
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'invalid_request' }, { status: 400 })
  }
  if (parsed.data.provider === 'paypal') {
    return NextResponse.json(
      { success: false, error: 'payment_provider_not_configured' },
      { status: 503 },
    )
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { success: false, error: 'payment_provider_not_configured' },
      { status: 503 },
    )
  }

  const db = await getContentDb()
  const product = await db
    .collection('products')
    .findOne({ _id: new ObjectId(parsed.data.productId) })
  if (!product)
    return NextResponse.json({ success: false, error: 'product_not_found' }, { status: 404 })
  if (product.isActive === false) {
    return NextResponse.json({ success: false, error: 'product_not_active' }, { status: 404 })
  }

  let amount = Math.round(Number(product.price || 0) * 100)
  let appliedCoupon: Record<string, unknown> | null = null
  if (parsed.data.couponCode) {
    const coupon = await db.collection('coupons').findOne({
      code: parsed.data.couponCode.trim().toUpperCase(),
      isActive: true,
    })
    if (!coupon)
      return NextResponse.json({ success: false, error: 'invalid_coupon' }, { status: 400 })
    const originalAmount = amount
    if (coupon.discountType === 'percentage') {
      amount = Math.round(amount * (1 - Number(coupon.discountValue || 0) / 100))
    } else {
      amount = Math.max(0, amount - Number(coupon.discountValue || 0))
    }
    amount = Math.max(1, amount)
    appliedCoupon = {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      originalAmount,
      discountedAmount: amount,
    }
  }

  const { itemIds, featureKeys } = await resolveProductItems(
    Array.isArray(product.items) ? product.items : [],
  )
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    new URL(request.url).origin
  const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${baseUrl}/checkout/cancel?product_id=${parsed.data.productId}`
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: String(product.currency || 'ILS').toLowerCase(),
          unit_amount: amount,
          product_data: { name: String(product.name || product.title || 'Product') },
        },
      },
    ],
    metadata: {
      productId: parsed.data.productId,
      userId: user.id,
    },
  })

  const now = new Date()
  const transaction = await db.collection('transactions').insertOne({
    tenant: product.tenant,
    user: ObjectId.isValid(user.id) ? new ObjectId(user.id) : user.id,
    product: product._id,
    provider: 'stripe',
    providerTransactionId: session.id,
    status: 'pending',
    amount,
    currency: String(product.currency || 'ILS').toUpperCase(),
    metadata: { itemIds, featureKeys, ...(appliedCoupon ? { appliedCoupon } : {}) },
    successUrl,
    cancelUrl,
    createdAt: now,
    updatedAt: now,
  })

  return NextResponse.json({
    success: true,
    checkoutUrl: session.url,
    transactionId: transaction.insertedId.toString(),
    ...(appliedCoupon ? { appliedCoupon } : {}),
  })
}
