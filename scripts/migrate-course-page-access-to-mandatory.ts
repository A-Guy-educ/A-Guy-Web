/**
 * Migration: course.pageAccessType → 'mandatory'
 *
 * The pageAccessType field is being removed from the Course schema. Before the
 * schema change ships, every existing course document must be normalized to
 * 'mandatory' so consumers reading the field during the rollout window always
 * see the post-removal value (the field is currently 'free' | 'mandatory' |
 * 'gated' | 'paid').
 *
 * Idempotent — safe to re-run. Skips docs already set to 'mandatory'.
 *
 * Usage: pnpm tsx scripts/migrate-course-page-access-to-mandatory.ts
 */
import { getPayload } from 'payload'

import config from '@payload-config'

const TARGET_VALUE = 'mandatory' as const

async function main() {
  const payload = await getPayload({ config })

  console.log('Migrating course.pageAccessType → "mandatory"')
  console.log('Idempotent — docs already set to "mandatory" will be skipped.')
  console.log('')

  const PAGE_SIZE = 500
  let page = 1
  let scanned = 0
  let updated = 0
  let alreadyMandatory = 0
  let errors = 0

  while (true) {
    const result = await payload.find({
      collection: 'courses',
      limit: PAGE_SIZE,
      page,
      depth: 0,
      overrideAccess: true,
      select: { pageAccessType: true },
    })

    for (const doc of result.docs) {
      scanned++

      const current = (doc as { pageAccessType?: string | null }).pageAccessType
      if (current === TARGET_VALUE) {
        alreadyMandatory++
        continue
      }

      try {
        await payload.update({
          collection: 'courses',
          id: doc.id,
          data: { pageAccessType: TARGET_VALUE } as never,
          overrideAccess: true,
        })
        updated++
      } catch (err) {
        console.error(`Failed to update course ${doc.id}:`, err)
        errors++
      }
    }

    if (!result.hasNextPage) break
    page++
  }

  console.log('')
  console.log('=== Migration Summary ===')
  console.log(
    JSON.stringify(
      {
        scanned,
        updated,
        alreadyMandatory,
        errors,
      },
      null,
      2,
    ),
  )

  if (errors > 0) {
    console.error(`Migration completed with ${errors} errors`)
    process.exit(1)
  }

  console.log('Migration completed successfully.')
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
