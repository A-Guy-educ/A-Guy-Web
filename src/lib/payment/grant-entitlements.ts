import { ObjectId, type Document } from 'mongodb'

import { getContentDb, relationId } from '@/infra/db/content-db'
import { logger } from '@/infra/utils/logger/logger'

interface CourseBlock {
  blockType: 'courseBlock'
  course: unknown
}

interface FeatureBlock {
  blockType: 'featureBlock'
  feature: unknown
}

type ProductContentBlock =
  | CourseBlock
  | FeatureBlock
  | { blockType: string; [key: string]: unknown }

interface ProductDoc {
  _id: ObjectId
  tenant?: ObjectId | string | null
  contents?: ProductContentBlock[] | null
}

interface FeatureDoc {
  _id: ObjectId
  key?: string | null
}

function toObjectIdOrValue(id: string): ObjectId | string {
  return ObjectId.isValid(id) ? new ObjectId(id) : id
}

/**
 * Grants every entitlement bundled in `productId` to `userId`, tied to
 * `transactionId`. Idempotent: replays for the same (user, course) pair or
 * (key, transactionId) feature pair no-op rather than double-insert, so PayPal
 * webhook retries can't issue a duplicate purchase record.
 *
 * Walks `product.contents` and handles two block types:
 *   - `courseBlock` → dual-insert into `user-entitlements` and `enrollments`
 *     (the access-grant record + the active enrollment that drives the
 *     lesson/course progress UI).
 *   - `featureBlock` → push onto the user's `featureEntitlements[]` array
 *     (the legacy destination consumed by feature-gated code paths).
 *
 * @throws when the product document is missing — caller should treat this as
 *   a transient failure so PayPal retries (we don't want to "succeed" an
 *   enrollment tied to a phantom product).
 */
export async function grantProductEntitlements(
  userId: string,
  productId: string,
  transactionId: string,
): Promise<void> {
  if (!userId || !productId || !transactionId) {
    logger.warn(
      { userId: !!userId, productId: !!productId, transactionId: !!transactionId },
      'grantProductEntitlements: missing required identifier — skipping',
    )
    return
  }

  const db = await getContentDb()
  const productFilter = ObjectId.isValid(productId)
    ? { _id: new ObjectId(productId) }
    : { _id: productId as unknown as ObjectId }

  const product = (await db.collection('products').findOne(productFilter)) as ProductDoc | null
  if (!product) {
    // Surface to caller so the webhook returns 500 and PayPal retries — never
    // "succeed" silently, since that would leave the buyer without access AND
    // mark the payment as done.
    throw new Error(`grantProductEntitlements: product not found: ${productId}`)
  }

  const contents = product.contents
  if (!Array.isArray(contents) || contents.length === 0) {
    return
  }

  const userValue = toObjectIdOrValue(userId)
  const transactionValue = toObjectIdOrValue(transactionId)
  const tenantValue =
    product.tenant != null && ObjectId.isValid(String(product.tenant))
      ? new ObjectId(String(product.tenant))
      : (product.tenant ?? null)

  const now = new Date()

  for (const block of contents) {
    if (!block) continue
    if (block.blockType === 'courseBlock') {
      await grantCourseBlock({
        block: block as CourseBlock,
        db,
        userValue,
        userId,
        transactionValue,
        transactionId,
        tenantValue,
        productId,
        now,
      })
      continue
    }
    if (block.blockType === 'featureBlock') {
      await grantFeatureBlock({
        block: block as FeatureBlock,
        db,
        userValue,
        userId,
        transactionId,
        productId,
        now,
      })
      continue
    }
  }
}

interface GrantCourseBlockArgs {
  block: CourseBlock
  db: Awaited<ReturnType<typeof getContentDb>>
  userValue: ObjectId | string
  userId: string
  transactionValue: ObjectId | string
  transactionId: string
  tenantValue: ObjectId | string | null
  productId: string
  now: Date
}

async function grantCourseBlock({
  block,
  db,
  userValue,
  userId,
  transactionValue,
  transactionId,
  tenantValue,
  productId,
  now,
}: GrantCourseBlockArgs): Promise<void> {
  const courseId = relationId(block.course)
  if (!courseId) return

  const courseValue = toObjectIdOrValue(courseId)
  const userMatch = { $in: [userValue] }
  const courseMatch = { $in: [courseValue] }

  const existingEntitlement = await db
    .collection('user-entitlements')
    .findOne({ user: userMatch, course: courseMatch })
  const existingEnrollment = await db.collection('enrollments').findOne({
    user: userMatch,
    course: courseMatch,
    status: { $ne: 'cancelled' },
  })

  if (existingEntitlement || existingEnrollment) {
    logger.info(
      { userId, courseId, transactionId },
      'grantProductEntitlements: already entitled — skipping insert',
    )
    return
  }

  await db.collection('user-entitlements').insertOne({
    tenant: tenantValue,
    user: userValue,
    contentType: 'course',
    course: courseValue,
    grantMethod: 'purchase',
    transaction: transactionValue,
    createdAt: now,
    updatedAt: now,
  })

  await db.collection('enrollments').insertOne({
    tenant: tenantValue,
    user: userValue,
    course: courseValue,
    status: 'active',
    grantMethod: 'purchase',
    source: 'self',
    enrolledAt: now,
    metadata: { transactionId },
    createdAt: now,
    updatedAt: now,
  })

  logger.info(
    { userId, productId, courseId, transactionId },
    'grantProductEntitlements: course entitlement granted',
  )
}

interface GrantFeatureBlockArgs {
  block: FeatureBlock
  db: Awaited<ReturnType<typeof getContentDb>>
  userValue: ObjectId | string
  userId: string
  transactionId: string
  productId: string
  now: Date
}

/**
 * Push a feature key onto the user's `featureEntitlements[]` array. Idempotent
 * via a single atomic updateOne with a `$not $elemMatch` filter — replays for
 * the same (key, transactionId) pair no-op. Looks up the feature document
 * once per call to resolve the `key` (the block may store either a populated
 * `ProductFeatureRef` with a `key` or a bare id ref to a `features` doc).
 */
async function grantFeatureBlock({
  block,
  db,
  userValue,
  userId,
  transactionId,
  productId,
  now,
}: GrantFeatureBlockArgs): Promise<void> {
  const featureRef = block.feature
  let featureKey: string | null = null

  if (
    featureRef &&
    typeof featureRef === 'object' &&
    typeof (featureRef as { key?: unknown }).key === 'string'
  ) {
    featureKey = (featureRef as { key: string }).key
  } else {
    const featureId = relationId(featureRef)
    if (featureId && ObjectId.isValid(featureId)) {
      const featureDoc = (await db
        .collection('features')
        .findOne({ _id: new ObjectId(featureId) }, { projection: { key: 1 } })) as FeatureDoc | null
      if (typeof featureDoc?.key === 'string' && featureDoc.key.length > 0) {
        featureKey = featureDoc.key
      }
    }
  }

  if (!featureKey) {
    logger.warn(
      { userId, productId, transactionId },
      'grantProductEntitlements: featureBlock has no resolvable key — skipping',
    )
    return
  }

  const result = await db.collection('users').updateOne(
    {
      // The users collection's _id is always an ObjectId; userValue is a
      // `string | ObjectId` (some legacy code paths use string ids), so widen
      // to ObjectId via a cast — the same `toObjectIdOrValue` helper above
      // has already converted any valid hex string to ObjectId.
      _id: userValue as unknown as ObjectId,
      featureEntitlements: {
        $not: {
          $elemMatch: { key: featureKey, transactionId },
        },
      },
    },
    {
      // The $push payload shape doesn't survive the strict Document index
      // signature the MongoDB driver enforces on update operators — cast
      // through Document so the inner object type widens to `unknown`.
      $push: {
        featureEntitlements: {
          key: featureKey,
          transactionId,
          grantMethod: 'paypal',
          grantedAt: now.toISOString(),
        },
      },
    } as unknown as Document,
  )

  if (result.modifiedCount === 1) {
    logger.info(
      { userId, productId, featureKey, transactionId },
      'grantProductEntitlements: feature entitlement granted',
    )
  } else {
    logger.info(
      { userId, productId, featureKey, transactionId },
      'grantProductEntitlements: feature entitlement already present — skipping',
    )
  }
}
