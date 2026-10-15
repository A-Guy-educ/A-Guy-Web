/**
 * Subscription Test Checkout — POST /api/subscriptions/test-checkout
 *
 * Hardcoded 1 ILS Tranzilla checkout against the `basic` tier. Backs the
 * `/subtest` smoke-test page so we can walk the full web → Tranzilla →
 * admin-webhook → user-doc flow for pennies instead of the real tier price.
 *
 * This still uses the one-time flow (not Admin's new subscription-bootstrap
 * endpoint), so it exercises the same code path as `/api/subscriptions/checkout`
 * minus the price and minus a buyer-sent `tier` field. When Admin's
 * subscription-bootstrap endpoint is wired, this route either upgrades to it
 * or gets deleted alongside `/subtest`.
 *
 * @fileType route
 * @domain billing
 */

import { ObjectId } from 'mongodb'
import { NextRequest, NextResponse } from 'next/server'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import { logger } from '@/infra/utils/logger/logger'
import { MissingPaymentEnvError } from '@/lib/payment/env'
import { createTranzillaCheckout } from '@/lib/payment/tranzilla'
import { createTransaction, deleteTransactionRow } from '@/server/services/checkout'

const TEST_TIER = 'basic' as const
const TEST_AMOUNT_AGOROT = 100 // 1 ILS in minor units
const TEST_CURRENCY = 'ILS'
const TEST_PRODUCT_NAME = 'Subscription smoke test (1 ILS)'

export async function POST(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'authentication_required' }, { status: 401 })
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    new URL(request.url).origin
  const cancelUrl = `${baseUrl}/subtest`

  const transactionId = new ObjectId()
  const successUrl = `${baseUrl}/checkout/success?tranzilla_tx=${transactionId.toString()}`
  const placeholderProviderId = `tranzilla-pending-${transactionId.toString()}`

  try {
    await createTransaction({
      _id: transactionId,
      tenant: null,
      user: ObjectId.isValid(user.id) ? new ObjectId(user.id) : user.id,
      product: null,
      tierSlug: TEST_TIER,
      provider: 'tranzilla',
      providerTransactionId: placeholderProviderId,
      status: 'pending',
      amount: TEST_AMOUNT_AGOROT,
      currency: TEST_CURRENCY,
      metadata: { testCheckout: true },
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
        userId: user.id,
      },
      'Subscription test checkout: transaction insert failed',
    )
    return NextResponse.json({ success: false, error: 'checkout_failed' }, { status: 500 })
  }

  try {
    const { checkoutUrl } = createTranzillaCheckout({
      productId: `tier-${TEST_TIER}-test`,
      productName: TEST_PRODUCT_NAME,
      amount: TEST_AMOUNT_AGOROT,
      currency: TEST_CURRENCY,
      userId: user.id,
      successUrl,
      cancelUrl,
      transactionRowId: transactionId.toString(),
    })
    return NextResponse.json({
      success: true,
      checkoutUrl,
      transactionId: transactionId.toString(),
    })
  } catch (buildErr) {
    try {
      await deleteTransactionRow(transactionId)
    } catch (cleanupErr) {
      logger.error(
        {
          err:
            cleanupErr instanceof Error
              ? { message: cleanupErr.message, stack: cleanupErr.stack }
              : cleanupErr,
          transactionRowId: transactionId.toString(),
        },
        'Subscription test checkout: cleanup of partial transaction row failed',
      )
    }
    if (buildErr instanceof MissingPaymentEnvError) {
      return NextResponse.json(
        { success: false, error: 'payment_provider_not_configured' },
        { status: 503 },
      )
    }
    logger.error(
      {
        err:
          buildErr instanceof Error
            ? { message: buildErr.message, stack: buildErr.stack }
            : buildErr,
        userId: user.id,
      },
      'Subscription test checkout: URL build failed',
    )
    return NextResponse.json({ success: false, error: 'checkout_failed' }, { status: 500 })
  }
}
