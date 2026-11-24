import { afterEach, describe, expect, it, vi } from 'vitest'

import type { LessonSuggestInputLesson } from '@/server/services/lesson-suggest/generateLessonSuggestion'
import { matchExamTopics, parseModelReply } from '@/server/services/exam-topics/matchExamTopics'

const lessons: LessonSuggestInputLesson[] = [
  { id: 'eq-learn', title: 'משוואות בנעלם אחד', chapter: 'אלגברה', type: 'learning' },
  { id: 'eq-practice', title: 'תרגול משוואות', chapter: 'אלגברה', type: 'practice' },
  { id: 'line-learn', title: 'ייצוג של קו ישר', chapter: 'פונקציה קווית', type: 'learning' },
  { id: 'exam', title: 'בחינה — אלגברה', chapter: 'אלגברה', type: 'exam' },
]

function geminiReply(body: unknown) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] }),
    { status: 200 },
  )
}

describe('parseModelReply', () => {
  it("maps each topic's learning and practice numbers to lesson ids", () => {
    const reply = JSON.stringify({
      topics: [
        { label: 'משוואות', learning: 1, practice: 2 },
        { label: 'פונקציה קווית', learning: 3, practice: 0 },
      ],
    })
    expect(parseModelReply(reply, lessons)).toEqual([
      { label: 'משוואות', learningLessonId: 'eq-learn', practiceLessonId: 'eq-practice' },
      { label: 'פונקציה קווית', learningLessonId: 'line-learn', practiceLessonId: null },
    ])
  })

  it('drops numbers off the list or of the wrong type, and repeated topics', () => {
    const reply = JSON.stringify({
      topics: [
        { label: ' משוואות ', learning: 2, practice: 4 },
        { label: 'משוואות', learning: 1, practice: 2 },
        { label: 'הסתברות', learning: 9, practice: -1 },
        { label: '  ', learning: 1, practice: 2 },
      ],
    })
    expect(parseModelReply(reply, lessons)).toEqual([
      { label: 'משוואות', learningLessonId: null, practiceLessonId: null },
      { label: 'הסתברות', learningLessonId: null, practiceLessonId: null },
    ])
  })

  it('returns null for a reply that is not the schema', () => {
    expect(parseModelReply('not json', lessons)).toBeNull()
    expect(parseModelReply(JSON.stringify({ topics: [{ label: 'x' }] }), lessons)).toBeNull()
  })
})

describe('matchExamTopics', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sends the PDF inline with the numbered lessons and returns the matched topics', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    const fetchMock = vi
      .fn()
      .mockResolvedValue(geminiReply({ topics: [{ label: 'משוואות', learning: 1, practice: 2 }] }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await matchExamTopics({
      locale: 'he',
      courseTitle: 'כיתה ח׳',
      lessons,
      file: { mimeType: 'application/pdf', data: 'BASE64' },
    })

    expect(result).toEqual({
      success: true,
      topics: [{ label: 'משוואות', learningLessonId: 'eq-learn', practiceLessonId: 'eq-practice' }],
    })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.contents[0].parts[0].text).toContain('2. תרגול משוואות (אלגברה) [practice]')
    expect(body.contents[0].parts[1]).toEqual({
      inline_data: { mime_type: 'application/pdf', data: 'BASE64' },
    })
  })

  it('fails without an API key', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    const result = await matchExamTopics({
      locale: 'he',
      courseTitle: 'כיתה ח׳',
      lessons,
      text: 'משוואות',
    })
    expect(result.success).toBe(false)
  })
})
