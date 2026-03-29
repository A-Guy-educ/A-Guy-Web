/**
 * Backfill parentCourse on existing Lessons and Exercises
 *
 * Populates the denormalized parentCourse field by traversing:
 *   Lesson  -> chapter -> course
 *   Exercise -> lesson -> chapter -> course
 *
 * Idempotent — safe to run multiple times.
 *
 * Usage: npx tsx scripts/backfill-parent-course.ts
 */
import { getPayload } from 'payload'
import config from '@payload-config'

async function backfillLessons(payload: Awaited<ReturnType<typeof getPayload>>) {
  const lessons = await payload.find({
    collection: 'lessons',
    limit: 10000,
    depth: 0,
    overrideAccess: true,
    select: { chapter: true, parentCourse: true },
  })

  let updated = 0
  let skipped = 0

  for (const lesson of lessons.docs) {
    const chapterId = typeof lesson.chapter === 'string' ? lesson.chapter : lesson.chapter?.id
    if (!chapterId) {
      skipped++
      continue
    }

    try {
      const chapter = await payload.findByID({
        collection: 'chapters',
        id: chapterId,
        depth: 0,
        overrideAccess: true,
        select: { course: true },
      })

      const courseId = typeof chapter.course === 'string' ? chapter.course : chapter.course?.id
      if (!courseId) {
        skipped++
        continue
      }

      // Skip if already set correctly
      const existingCourseId =
        typeof lesson.parentCourse === 'string' ? lesson.parentCourse : lesson.parentCourse?.id
      if (existingCourseId === courseId) {
        skipped++
        continue
      }

      await payload.update({
        collection: 'lessons',
        id: lesson.id,
        data: { parentCourse: courseId } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        overrideAccess: true,
      })
      updated++
    } catch {
      console.error(`  Failed to backfill lesson ${lesson.id}`)
      skipped++
    }
  }

  console.log(`Lessons: ${updated} updated, ${skipped} skipped (of ${lessons.docs.length} total)`)
}

async function backfillExercises(payload: Awaited<ReturnType<typeof getPayload>>) {
  const exercises = await payload.find({
    collection: 'exercises',
    limit: 10000,
    depth: 0,
    overrideAccess: true,
    select: { lesson: true, parentCourse: true },
  })

  // Build a cache of lesson -> course mappings to avoid repeated queries
  const lessonCourseCache = new Map<string, string | null>()

  async function getCourseForLesson(lessonId: string): Promise<string | null> {
    if (lessonCourseCache.has(lessonId)) {
      return lessonCourseCache.get(lessonId)!
    }

    try {
      const lesson = await payload.findByID({
        collection: 'lessons',
        id: lessonId,
        depth: 0,
        overrideAccess: true,
        select: { chapter: true },
      })

      const chapterId = typeof lesson.chapter === 'string' ? lesson.chapter : lesson.chapter?.id
      if (!chapterId) {
        lessonCourseCache.set(lessonId, null)
        return null
      }

      const chapter = await payload.findByID({
        collection: 'chapters',
        id: chapterId,
        depth: 0,
        overrideAccess: true,
        select: { course: true },
      })

      const courseId = typeof chapter.course === 'string' ? chapter.course : chapter.course?.id
      lessonCourseCache.set(lessonId, courseId || null)
      return courseId || null
    } catch {
      lessonCourseCache.set(lessonId, null)
      return null
    }
  }

  let updated = 0
  let skipped = 0

  for (const exercise of exercises.docs) {
    const lessonId = typeof exercise.lesson === 'string' ? exercise.lesson : exercise.lesson?.id
    if (!lessonId) {
      skipped++
      continue
    }

    const courseId = await getCourseForLesson(lessonId)
    if (!courseId) {
      skipped++
      continue
    }

    // Skip if already set correctly
    const existingCourseId =
      typeof exercise.parentCourse === 'string' ? exercise.parentCourse : exercise.parentCourse?.id
    if (existingCourseId === courseId) {
      skipped++
      continue
    }

    try {
      await payload.update({
        collection: 'exercises',
        id: exercise.id,
        data: { parentCourse: courseId } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        overrideAccess: true,
      })
      updated++
    } catch {
      console.error(`  Failed to backfill exercise ${exercise.id}`)
      skipped++
    }
  }

  console.log(
    `Exercises: ${updated} updated, ${skipped} skipped (of ${exercises.docs.length} total)`,
  )
}

async function main() {
  console.log('Backfilling parentCourse fields...\n')

  const payload = await getPayload({ config })

  console.log('--- Lessons ---')
  await backfillLessons(payload)

  console.log('\n--- Exercises ---')
  await backfillExercises(payload)

  console.log('\nDone!')
  process.exit(0)
}

main().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
