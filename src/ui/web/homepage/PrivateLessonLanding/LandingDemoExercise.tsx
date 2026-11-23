'use client'

/**
 * A real exercise in the landing's "try it here" slot, in the lesson chat
 * view's look: the given-data card, the chat question bubble, and the hint /
 * explanation chips. The lesson chat answers through the AI teacher; here the
 * teacher's lines are the exercise's written ones — the hint (given right
 * after a first wrong pick on a 3+ option question, which stays open for a
 * second try) and the explanation, which follows a wrong answer. Nothing is saved or reported (no lesson /
 * exercise ids) — visitors aren't signed in.
 *
 * @fileType component
 * @domain frontend
 */
import { useState } from 'react'

import { ChatQuestionSelectBubble } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/bubbles/ChatQuestionSelectBubble'
import {
  QuickActionChips,
  type QuickAction,
} from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/bubbles/QuickActionChips'
import { TeacherBubble } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/bubbles/TeacherBubble'
import { pickCorrectReaction } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/correctResponses'
import type { ExerciseBlockGroup } from '@/infra/types/exercise'
import type { Media } from '@/infra/types/content'
import { formatAuthoredChatContent } from '@/infra/utils/formatAuthoredChatContent'
import { RichTextRenderer } from '@/ui/web/exerciserenderer/blocks/RichTextRenderer'
import { MediaMapProvider } from '@/ui/web/exerciserenderer/context/MediaMapContext'
import type { QuestionSelectBlock, RichTextBlock } from '@/ui/web/exerciserenderer/types'
import { useTranslations } from '@/ui/web/providers/I18n'

const NO_MEDIA: Record<string, Media> = {}

interface TeacherLine {
  key: string
  text: string
  variant: 'default' | 'correction'
}

type HelpField = 'hint' | 'fullSolution'

function writtenHelp(question: QuestionSelectBlock, field: HelpField): string {
  const value = (question as { [key in HelpField]?: { value?: string } })[field]?.value?.trim()
  return value ? formatAuthoredChatContent(value) : ''
}

export function LandingDemoExercise({ groups }: { groups: ExerciseBlockGroup[] }) {
  const t = useTranslations('courses')
  const blocks = groups.flatMap((group) => group.blocks)
  const question = blocks.find((b) => b.type === 'question_select') as
    QuestionSelectBlock | undefined
  const stem = blocks.filter((b) => b.type === 'rich_text') as RichTextBlock[]

  const [lines, setLines] = useState<TeacherLine[]>([])
  const [shown, setShown] = useState<Set<HelpField>>(new Set())
  const [answered, setAnswered] = useState(false)

  if (!question) return null
  const hint = writtenHelp(question, 'hint')
  const explanation = writtenHelp(question, 'fullSolution')

  const say = (key: string, text: string, variant: TeacherLine['variant'] = 'default') =>
    setLines((prev) => [...prev, { key: `${key}-${prev.length}`, text, variant }])

  const showHelp = (field: HelpField) => {
    const text = field === 'hint' ? hint : explanation
    if (!text || shown.has(field)) return
    setShown((prev) => new Set(prev).add(field))
    say(field, text)
  }

  const handleSubmit = (_blockId: string, _choice: string, isCorrect: boolean) => {
    setAnswered(true)
    if (isCorrect) {
      say('correct', pickCorrectReaction({ wantLong: true, lastPairKey: null }).text)
      return
    }
    const correction = explanation || hint
    if (correction) say('correction', correction, 'correction')
  }

  const handleChip = (action: QuickAction) => {
    if (action === 'hint') showHelp('hint')
    if (action === 'explain') showHelp('fullSolution')
  }

  return (
    <div className="system-example-live">
      <MediaMapProvider value={NO_MEDIA}>
        <div className="flex flex-col gap-content-gap-xl">
          {stem.map((block) => (
            <div
              key={block.id}
              className="rounded-2xl border border-warning/30 bg-warning/8 p-card-padding-sm text-body-md font-medium text-foreground leading-relaxed"
            >
              <RichTextRenderer block={block} />
            </div>
          ))}

          <div>
            <ChatQuestionSelectBubble
              block={question}
              onSubmit={handleSubmit}
              onHintRequest={hint ? () => showHelp('hint') : undefined}
              autoRetryHint
            />
            {!answered && (hint || explanation) ? (
              <QuickActionChips
                hintDisabled={!hint || shown.has('hint')}
                explainDisabled={!explanation || shown.has('fullSolution')}
                hintLabel={t('chatViewChipHint')}
                explainLabel={t('chatViewChipExplain')}
                onAction={handleChip}
              />
            ) : null}
          </div>

          {lines.map((line) => (
            <TeacherBubble key={line.key} text={line.text} variant={line.variant} />
          ))}
        </div>
      </MediaMapProvider>
    </div>
  )
}
