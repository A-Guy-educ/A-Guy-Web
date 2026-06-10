import { nanoid } from 'nanoid'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { formatYmd, startOfDay } from '@/lib/dates'
import { getWebUser } from '@/infra/web-api/mongo-payload'
import {
  generateStudyPlan,
  type StudyPlanDay,
  type StudyPlanSnapshot,
  type TopicInput,
} from '@/server/services/study-plan'
import { findUserProgress, upsertUserProgress } from '@/server/web-api/progress'

const LessonRefSchema = z.object({
  lessonId: z.string().min(1),
  lessonSlug: z.string(),
  chapterSlug: z.string(),
  courseSlug: z.string(),
  lessonTitle: z.string(),
  lessonUrl: z.string(),
})

const TopicInputSchema = z.object({
  topicId: z.string().min(1),
  topicLabel: z.string().min(1),
  mastery: z.enum(['weak', 'medium', 'strong']),
  lessonRef: LessonRefSchema.optional(),
})

const GenerateSchema = z.object({
  action: z.literal('generate'),
  courseId: z.string().min(1),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  topics: z.array(TopicInputSchema).min(1),
  gradeLevel: z.string().min(1),
})

const ToggleSchema = z.object({
  action: z.literal('toggleStatus'),
  dayId: z.string().min(1),
  courseId: z.string().min(1),
  gradeLevel: z.string().min(1),
})

const EditSchema = z.object({
  action: z.literal('editDay'),
  dayId: z.string().min(1),
  courseId: z.string().min(1),
  gradeLevel: z.string().min(1),
  userTopicIds: z.array(z.string()).optional(),
  userDurationMinutes: z.number().min(0).optional(),
  userStartTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
})

const RequestSchema = z.discriminatedUnion('action', [GenerateSchema, ToggleSchema, EditSchema])
type StudyPlanUpdateRequest = z.infer<typeof ToggleSchema> | z.infer<typeof EditSchema>

function replacePlan(
  plans: StudyPlanSnapshot[] | undefined,
  courseId: string,
  nextPlan: StudyPlanSnapshot,
) {
  const next = [...(plans ?? [])]
  const index = next.findIndex((plan) => plan.courseId === courseId)
  if (index >= 0) next[index] = nextPlan
  else next.push(nextPlan)
  return next
}

export async function GET(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gradeLevel = request.nextUrl.searchParams.get('gradeLevel')
  const courseId = request.nextUrl.searchParams.get('courseId')
  if (!gradeLevel || !courseId) {
    return NextResponse.json({ error: 'gradeLevel and courseId are required' }, { status: 400 })
  }

  const progress = await findUserProgress(user.id, gradeLevel)
  const plans = (progress?.studyPlans ?? []) as StudyPlanSnapshot[]
  return NextResponse.json({
    success: true,
    data: plans.find((plan) => plan.courseId === courseId) ?? null,
  })
}

export async function PUT(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const progress = await findUserProgress(user.id, parsed.data.gradeLevel)
  const currentPlans = (progress?.studyPlans ?? []) as StudyPlanSnapshot[]

  if (parsed.data.action === 'generate') {
    const days = generateStudyPlan({
      today: formatYmd(startOfDay(new Date())),
      examDate: parsed.data.examDate,
      topics: parsed.data.topics as TopicInput[],
      idGenerator: () => nanoid(),
    }).map((day: StudyPlanDay) => ({
      ...day,
      topicIds: z.array(z.string()).parse(day.topicIds),
    }))

    const plan: StudyPlanSnapshot = {
      courseId: parsed.data.courseId,
      examDate: parsed.data.examDate,
      generatedAt: formatYmd(startOfDay(new Date())),
      topics: parsed.data.topics as TopicInput[],
      days,
    }
    const studyPlans = replacePlan(currentPlans, parsed.data.courseId, plan)
    await upsertUserProgress(user.id, parsed.data.gradeLevel, { studyPlans })
    return NextResponse.json({ success: true, data: plan })
  }

  const data = parsed.data as StudyPlanUpdateRequest
  const planIndex = currentPlans.findIndex((plan) => plan.courseId === data.courseId)
  if (planIndex < 0) return NextResponse.json({ error: 'Study plan not found' }, { status: 404 })

  const plan = currentPlans[planIndex]
  const days = plan.days.map((day) => {
    if (day.dayId !== data.dayId) return day
    if (data.action === 'toggleStatus') {
      return {
        ...day,
        status: day.status === 'completed' ? 'planned' : 'completed',
      } as StudyPlanDay
    }
    return {
      ...day,
      ...(data.userTopicIds !== undefined ? { userTopicIds: data.userTopicIds } : {}),
      ...(data.userDurationMinutes !== undefined
        ? { userDurationMinutes: data.userDurationMinutes }
        : {}),
      ...(data.userStartTime !== undefined ? { userStartTime: data.userStartTime } : {}),
    }
  })

  const updatedPlan: StudyPlanSnapshot = { ...plan, days }
  const studyPlans = [...currentPlans]
  studyPlans[planIndex] = updatedPlan
  await upsertUserProgress(user.id, data.gradeLevel, { studyPlans })
  return NextResponse.json({ success: true, data: updatedPlan })
}
