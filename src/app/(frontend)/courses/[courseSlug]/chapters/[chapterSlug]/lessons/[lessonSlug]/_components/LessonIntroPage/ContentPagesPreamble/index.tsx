'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { ResolvedLessonBlock } from '@/server/repos/queries/lesson-blocks'
import { Button } from '@/ui/web/components/button'
import { useTranslations } from '@/ui/web/providers/I18n'

interface ContentPagesPreambleProps {
  blocks: ResolvedLessonBlock[]
  contentPageBodies?: Record<string, React.ReactNode>
  onFinish: (initialExerciseIndex: number) => void
}

export function ContentPagesPreamble({
  blocks,
  contentPageBodies = {},
  onFinish,
}: ContentPagesPreambleProps) {
  const t = useTranslations('courses')
  const [currentIndex, setCurrentIndex] = useState(0)

  const contentPageBlocks = blocks.filter(
    (block): block is Extract<ResolvedLessonBlock, { type: 'contentPage' }> =>
      block.type === 'contentPage',
  )

  const totalPages = contentPageBlocks.length
  const isLastPage = currentIndex === totalPages - 1
  const currentBlock = contentPageBlocks[currentIndex]
  const currentBody = currentBlock ? contentPageBodies[currentBlock.data.id] : null

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(totalPages - 1, prev + 1))
  }

  const handleStart = () => {
    onFinish(0)
  }

  if (totalPages === 0) {
    return null
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-body-sm text-muted-foreground">
          {t('contentPageLabel')} {currentIndex + 1} {t('of')} {totalPages}
        </span>
      </div>

      <div className="flex-1 rounded-lg border border-border bg-card p-6 shadow-elevation-1">
        {currentBody ? (
          <div className="prose dark:prose-invert max-w-none">{currentBody}</div>
        ) : (
          <p className="text-body-sm text-muted-foreground">{t('contentPageNoBody')}</p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="transition-all duration-normal"
        >
          <ChevronLeft className="me-2 h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
          {t('exercisesPagerPrev')}
        </Button>

        {isLastPage ? (
          <Button onClick={handleStart} size="lg" className="transition-all duration-normal">
            {t('lessonIntroStart')}
            <ChevronLeft className="ms-2 h-5 w-5 rtl:rotate-0 ltr:rotate-180" />
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentIndex === totalPages - 1}
            className="transition-all duration-normal"
          >
            {t('exercisesPagerNext')}
            <ChevronRight className="ms-2 h-4 w-4 rtl:rotate-180 ltr:rotate-0" />
          </Button>
        )}
      </div>
    </div>
  )
}
