import { describe, expect, it } from 'vitest'

import { buildScrollExerciseContexts } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/BlocksDocumentLessonView/useScrollExerciseBroadcast'
import type { Exercise } from '@/infra/types/content'
import type { ContentBlock, ExerciseBlockGroup } from '@/infra/types/exercise'
import {
  SCROLL_EXERCISE_REFRESH_TURNS,
  buildPromptWithScrollExerciseContext,
  nextScrollExerciseSentState,
  shouldIncludeScrollExerciseContent,
  stripScrollExerciseContext,
  type ScrollExerciseContext,
} from '@/ui/web/chat/hooks/scroll-exercise-context'

const context: ScrollExerciseContext = {
  exerciseId: 'ex-3',
  title: 'תרגיל 3',
  position: 3,
  total: 10,
  content: '[EXERCISE CONTEXT]\nנתונה פירמידה ישרה SABCD\n[END EXERCISE CONTEXT]',
}

describe('scroll-exercise prompt block', () => {
  it('includes the exercise text when asked to', () => {
    const prompt = buildPromptWithScrollExerciseContext('מה התשובה לג?', context, true)

    expect(prompt).toContain('<scroll-exercise position="3" total="10" title="תרגיל 3">')
    expect(prompt).toContain('viewing exercise 3 of 10 ("תרגיל 3")')
    expect(prompt).toContain('נתונה פירמידה ישרה SABCD')
    expect(prompt.endsWith('\n\nמה התשובה לג?')).toBe(true)
  })

  it('sends only the short tag when the text was already shared', () => {
    const prompt = buildPromptWithScrollExerciseContext('ועכשיו?', context, false)

    expect(prompt).toContain('viewing exercise 3 of 10')
    expect(prompt).toContain('shared earlier in this conversation')
    expect(prompt).not.toContain('פירמידה')
  })

  it('leaves the message alone outside the scroll view', () => {
    expect(buildPromptWithScrollExerciseContext('hi', null, true)).toBe('hi')
  })

  it('escapes the title attribute', () => {
    const prompt = buildPromptWithScrollExerciseContext('hi', { ...context, title: 'a"<b>' }, false)
    expect(prompt).toContain('title="a&quot;&lt;b&gt;"')
  })

  it('strips the block for display', () => {
    const prompt = buildPromptWithScrollExerciseContext('מה התשובה לג?', context, true)
    expect(stripScrollExerciseContext(prompt)).toBe('מה התשובה לג?')
  })
})

describe('when to resend the exercise text', () => {
  it('sends it for a new exercise and holds it back on the next turn', () => {
    expect(shouldIncludeScrollExerciseContent(context, null)).toBe(true)

    const afterFirst = nextScrollExerciseSentState(context, true, null)
    expect(shouldIncludeScrollExerciseContent(context, afterFirst)).toBe(false)

    const otherExercise = { ...context, exerciseId: 'ex-4' }
    expect(shouldIncludeScrollExerciseContent(otherExercise, afterFirst)).toBe(true)
  })

  it('resends it after enough turns on the same exercise', () => {
    let sent = nextScrollExerciseSentState(context, true, null)
    for (let turn = 0; turn < SCROLL_EXERCISE_REFRESH_TURNS; turn += 1) {
      expect(shouldIncludeScrollExerciseContent(context, sent)).toBe(false)
      sent = nextScrollExerciseSentState(context, false, sent)
    }
    expect(shouldIncludeScrollExerciseContent(context, sent)).toBe(true)
  })
})

describe('buildScrollExerciseContexts', () => {
  function question(id: string, prompt: string): ContentBlock {
    return {
      id,
      type: 'question_free_response',
      prompt: { format: 'md-math-v1', value: prompt },
      answer: { acceptedAnswers: ['secret-answer'] },
    } as unknown as ContentBlock
  }

  const groups: ExerciseBlockGroup[] = [
    {
      sectionIndex: null,
      blocks: [
        {
          id: 'intro',
          type: 'rich_text',
          format: 'md-math-v1',
          value: 'נתונה פירמידה ישרה SABCD שבסיסה מלבן.',
          mediaIds: [],
        } as unknown as ContentBlock,
      ],
    },
    { sectionIndex: 0, blocks: [question('q1', 'הביעו את AO')] },
    { sectionIndex: 1, blocks: [question('q2', 'הביעו את AS')] },
    { sectionIndex: 2, blocks: [question('q3', 'מצאו את אורך AS')] },
  ]
  const exercise = { id: 'ex-3', title: 'תרגיל 3' } as Exercise

  it('numbers exercises and labels each section the way the worksheet does', () => {
    const [built] = buildScrollExerciseContexts([{ exercise, groups }], true)

    expect(built).toMatchObject({ exerciseId: 'ex-3', title: 'תרגיל 3', position: 1, total: 1 })
    expect(built.content).toContain('נתונה פירמידה ישרה SABCD')
    expect(built.content).toContain('סעיף א:')
    expect(built.content).toContain('סעיף ג:')
    expect(built.content.indexOf('סעיף ג:')).toBeLessThan(built.content.indexOf('מצאו את אורך AS'))
  })

  it('never includes accepted answers', () => {
    const [built] = buildScrollExerciseContexts([{ exercise, groups }], true)
    expect(built.content).not.toContain('secret-answer')
  })
})
