import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  generateLessonSuggestion,
  parseModelReply,
  type LessonSuggestInputLesson,
} from '@/server/services/lesson-suggest/generateLessonSuggestion'

const lessons: LessonSuggestInputLesson[] = [
  { id: 'a', title: 'חקירת פונקציה מעריכית - אסימפטוטות', type: 'learning' },
  { id: 'b', title: 'חקירת פונקציה לוגריתמית - אסימפטוטות', type: 'learning' },
  { id: 'c', title: 'בגרות קיץ 2025', type: 'exam' },
  { id: 'd', title: 'נקודה ייצוגית', type: 'learning' },
]

function geminiReply(body: unknown) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] }),
    { status: 200 },
  )
}

describe('parseModelReply', () => {
  it('maps 1-based lesson numbers to ids', () => {
    const reply = JSON.stringify({ intent: 'lessons', message: 'בטח!', lessons: [1, 2] })
    expect(parseModelReply(reply, lessons)).toEqual({
      intent: 'lessons',
      message: 'בטח!',
      lessonIds: ['a', 'b'],
    })
  })

  it('drops numbers outside the list, dedupes, and caps at three', () => {
    const reply = JSON.stringify({
      intent: 'lessons',
      message: 'x',
      lessons: [0, 9, 2, 2, 1, 3, 4],
    })
    expect(parseModelReply(reply, lessons)?.lessonIds).toEqual(['b', 'a', 'c'])
  })

  it('returns null for malformed JSON or an unknown intent', () => {
    expect(parseModelReply('not json', lessons)).toBeNull()
    expect(
      parseModelReply(JSON.stringify({ intent: 'chat', message: 'x', lessons: [] }), lessons),
    ).toBeNull()
  })
})

describe('generateLessonSuggestion', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sends the photo inline and returns the structured suggestion', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    const fetchMock = vi
      .fn()
      .mockResolvedValue(geminiReply({ intent: 'homework', message: 'נפתור יחד', lessons: [4] }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateLessonSuggestion({
      query: '',
      locale: 'he',
      courseTitle: 'מתמטיקה',
      lessons,
      image: { mimeType: 'image/jpeg', data: 'BASE64' },
    })

    expect(result).toEqual({
      success: true,
      suggestion: { intent: 'homework', message: 'נפתור יחד', lessonIds: ['d'] },
    })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.contents[0].parts[1]).toEqual({
      inline_data: { mime_type: 'image/jpeg', data: 'BASE64' },
    })
    expect(body.generationConfig.responseMimeType).toBe('application/json')
  })

  it('fails without an API key', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    const result = await generateLessonSuggestion({
      query: 'אסימפטוטה',
      locale: 'he',
      courseTitle: 'מתמטיקה',
      lessons,
    })
    expect(result.success).toBe(false)
  })
})
