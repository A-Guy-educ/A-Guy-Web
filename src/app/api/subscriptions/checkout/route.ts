/**
 * Subscription Checkout — POST /api/subscriptions/checkout
 *
 * Starts a one-time PayPal order against a hardcoded tier (basic / advanced /
 * premium) and inserts a pending `transactions` row carrying the top-level
 * `tierSlug` field. On capture, the Admin PayPal webhook (sole webhook
 * consumer) flips the row to succeeded and raw-Mongo-writes
 * `user.currentTier` + `user.llmTokensLimit` based on that tierSlug — see
 * `A-Guy-Admin/src/lib/payment/apply-tier-purchase.ts`.
 *
 * One-time orders (not PayPal subscriptions) for the POC — buyer re-visits
 * /subscriptions next month to renew.
 *
 * @fileType route
 * @domain billing
 */

import { ObjectId } from 'mongodb'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import { logger } from '@/infra/utils/logger/logger'
import { MissingPaymentEnvError } from '@/lib/payment/env'
import { cancelPayPalOrder, createPayPalOrder } from '@/lib/payment/paypal'
import {
  TIER_INTRO_OFFER,
  TIER_LABEL_EN,
  TIER_PRICE_ILS,
  type TierSlug,
} from '@/lib/tiers/constants'
import { createTransaction } from '@/server/services/checkout'
import { countSucceededTierPurchases } from '@/server/services/tier-pricing'

const BodySchema = z.object({
  tier: z.enum(['basic', 'advanced', 'premium']),
})

export async function POST(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'authentication_required' }, { status: 401 })
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'invalid_tier' }, { status: 400 })
  }

  const tier: TierSlug = parsed.data.tier
  const regularPriceIls = TIER_PRICE_ILS[tier]
  if (!(regularPriceIls > 0)) {
    return NextResponse.json({ success: false, error: 'invalid_tier' }, { status: 400 })
  }

  // Intro-offer eligibility: if the tier has an active promo and the buyer
  // has fewer than `introMonths` prior succeeded `tier_subscription`
  // transactions for this tier, charge the intro price. Keyed on buyer+tier
  // so a basic→advanced step-up starts a fresh intro budget per tier.
  const intro = TIER_INTRO_OFFER[tier]
  const { priceIls, isIntro } = intro
    ? await resolveIntroPricing({ userId: user.id, tier, regularPriceIls, intro })
    : { priceIls: regularPriceIls, isIntro: false }

  const amount = Math.round(priceIls * 100)
  const currency = 'ILS'
  const productName = `${TIER_LABEL_EN[tier]} plan`

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    new URL(request.url).origin
  const successUrl = `${baseUrl}/checkout/success`
  const cancelUrl = `${baseUrl}/subscriptions`

  let checkoutUrl: string
  let providerSessionId: string
  try {
    const result = await createPayPalOrder({
      // There's no DB product row, but createPayPalOrder uses productId only
      // for the PayPal reference_id + idempotency key — a stable per-user-per-
      // tier identifier is fine.
      productId: `tier-${tier}`,
      productName,
      amount,
      currency,
      userId: user.id,
      successUrl,
      cancelUrl,
    })
    checkoutUrl = result.checkoutUrl
    providerSessionId = result.providerSessionId
  } catch (err) {
    if (err instanceof MissingPaymentEnvError) {
      return NextResponse.json(
        { success: false, error: 'payment_provider_not_configured' },
        { status: 503 },
      )
    }
    logger.error(
      {
        err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        tier,
        userId: user.id,
      },
      'Subscription checkout: PayPal order creation failed',
    )
    return NextResponse.json({ success: false, error: 'checkout_failed' }, { status: 500 })
  }

  // Persist a pending transaction so the webhook has a row to flip and so
  // `metadata.tierSlug` is available for applyUserTier. On insert failure,
  // cancel the remote order so we don't orphan it.
  let transaction: { insertedId: ObjectId }
  try {
    transaction = await createTransaction({
      tenant: null,
      user: ObjectId.isValid(user.id) ? new ObjectId(user.id) : user.id,
      // No product row — tiers are a hardcoded enum per TIERS.md. Admin's
      // webhook sees `tierSlug` at the top level and uses that to apply the
      // tier to the user doc on capture; a null product tells the existing
      // entitlements/receipt helpers to no-op.
      product: null,
      tierSlug: tier,
      provider: 'paypal',
      providerTransactionId: providerSessionId,
      status: 'pending',
      amount,
      currency,
      ...(isIntro ? { metadata: { introApplied: true, regularPriceIls } } : {}),
      successUrl,
      cancelUrl,
    })
  } catch (insertErr) {
    logger.error(
      {
        err:
          insertErr instanceof Error
            ? { message: insertErr.message, stack: insertErr.stack }
            : insertErr,
        tier,
        providerSessionId,
        userId: user.id,
      },
      'Subscription checkout: transaction insert failed — cancelling remote order',
    )
    try {
      await cancelPayPalOrder(providerSessionId)
    } catch (cancelErr) {
      logger.error(
        {
          err:
            cancelErr instanceof Error
              ? { message: cancelErr.message, stack: cancelErr.stack }
              : cancelErr,
          providerSessionId,
        },
        'Subscription checkout: failed to cancel remote order after insert error',
      )
    }
    return NextResponse.json({ success: false, error: 'checkout_failed' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    checkoutUrl,
    transactionId: transaction.insertedId.toString(),
  })
}

interface ResolveIntroArgs {
  userId: string
  tier: TierSlug
  regularPriceIls: number
  intro: { introPriceIls: number; introMonths: number }
}

/**
 * Decides whether this checkout is still inside the intro window. Counts the
 * buyer's succeeded `tier_subscription` transactions for this tier — strictly
 * fewer than `introMonths` → intro price applies.
 */
async function resolveIntroPricing({
  userId,
  tier,
  regularPriceIls,
  intro,
}: ResolveIntroArgs): Promise<{ priceIls: number; isIntro: boolean }> {
  const used = await countSucceededTierPurchases(userId, tier)
  const isIntro = used < intro.introMonths
  return {
    priceIls: isIntro ? intro.introPriceIls : regularPriceIls,
    isIntro,
  }
}
