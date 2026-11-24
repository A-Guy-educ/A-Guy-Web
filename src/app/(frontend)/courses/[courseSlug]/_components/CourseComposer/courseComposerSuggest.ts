/**
 * Client side of the composer's AI suggestion: when to ask the model, how to
 * call `/api/agent/lesson-suggest`, and how to turn its lesson ids back into
 * linkable search nodes.
 *
 * @fileType utility
 * @domain frontend
 */
import type {
  LessonSuggestImage,
  LessonSuggestInputLesson,
  SuggestIntent,
} from '@/server/services/lesson-suggest/generateLessonSuggestion'
import type { LessonSearchNode } from '../LessonListTab/lessonRoadmapTypes'

export interface ComposerSuggestion {
  intent: SuggestIntent
  message: string
  lessons: LessonSearchNode[]
}

interface SuggestResponse {
  intent?: SuggestIntent
  message?: string
  lessonIds?: string[]
}

/**
 * A bare topic ("אסימפטוטה") is served instantly by the local title match; a
 * request phrased as a sentence ("תוכל ללמד אותי אסימפטוטה?") never matches a
 * title, and is what the model is for.
 */
export function looksLikeSentence(query: string): boolean {
  const q = query.trim()
  return /[?؟]/.test(q) || q.split(/\s+/).length >= 3
}

// Matches the route's cap. Nodes are ordered learning → practice → exam, so a
// very large course loses the tail of its exam list, never its lessons.
const MAX_SUGGEST_LESSONS = 300

export function buildSuggestLessons(nodes: LessonSearchNode[]): LessonSuggestInputLesson[] {
  return nodes
    .filter((n) => n.lesson.title && n.chapterSlug)
    .slice(0, MAX_SUGGEST_LESSONS)
    .map((n) => ({
      id: n.lesson.id,
      title: n.lesson.title as string,
      chapter: n.chapterTitle,
      type: n.lessonType,
    }))
}

export async function fetchLessonSuggestion(params: {
  query: string
  locale: 'en' | 'he'
  courseTitle: string
  nodes: LessonSearchNode[]
  image?: LessonSuggestImage
  signal: AbortSignal
}): Promise<ComposerSuggestion> {
  const res = await fetch('/api/agent/lesson-suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    signal: params.signal,
    body: JSON.stringify({
      query: params.query,
      locale: params.locale,
      courseTitle: params.courseTitle,
      lessons: buildSuggestLessons(params.nodes),
      image: params.image,
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as SuggestResponse
  const byId = new Map(params.nodes.map((n) => [n.lesson.id, n]))
  return {
    intent: data.intent ?? 'other',
    message: data.message?.trim() ?? '',
    lessons: (data.lessonIds ?? [])
      .map((id) => byId.get(id))
      .filter((n): n is LessonSearchNode => Boolean(n)),
  }
}
