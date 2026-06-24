'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import type { ResolvedLessonBlock } from '@/server/repos/queries/lesson-blocks'
import { Button } from '@/ui/web/components/button'
import { useTranslations } from '@/ui/web/providers/I18n'
import { cn } from '@/infra/utils/ui'

const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.2 },
}

interface ContentPagesPreambleProps {
  /** Ordered lesson blocks containing only contentPage blocks */
  contentPageBlocks: ResolvedLessonBlock[]
  /** Pre-rendered content page bodies, keyed by content page ID */
  contentPageBodies: Record<string, React.ReactNode>
  lessonTitle: string
  onFinish: (initialExerciseIndex: number) => void
}

export function ContentPagesPreamble({
  contentPageBlocks,
  contentPageBodies,
  lessonTitle,
  onFinish,
}: ContentPagesPreambleProps) {
  const t = useTranslations('courses')
  const [currentIndex, setCurrentIndex] = useState(0)

  const totalPages = contentPageBlocks.length
  const isFirstPage = currentIndex === 0
  const isLastPage = currentIndex === totalPages - 1

  const currentBlock = contentPageBlocks[currentIndex]
  const contentPage = currentBlock?.data as { id: string; title?: string | null } | undefined
  const bodyRendered = contentPage ? contentPageBodies[contentPage.id] : undefined

  const handlePrev = () => {
    if (!isFirstPage) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleNext = () => {
    if (!isLastPage) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handleFinish = () => {
    onFinish(0)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 sm:px-6 py-section-md md:py-section-lg max-w-5xl">
          <AnimatePresence mode="wait">
            <motion.div key={currentIndex} {...pageTransition} className="space-y-8">
              {/* Breadcrumb step indicator */}
              <div className="flex items-center gap-content-gap-xs text-body-sm text-muted-foreground">
                <span className="truncate max-w-[200px]">{lessonTitle}</span>
                <ChevronRight className="w-3 h-3 shrink-0 rtl:rotate-180" />
                <span className="text-foreground font-medium">
                  {t('contentPageLabel')} {currentIndex + 1} {t('of')} {totalPages}
                </span>
              </div>

              <header className="text-center">
                <span className="inline-block px-4 py-1.5 bg-muted text-muted-foreground rounded-full text-label tracking-[0.2em] uppercase mb-5 border border-border/40">
                  <FileText className="w-3 h-3 inline-block me-1" />
                  {t('contentPageLabel')} {currentIndex + 1} {t('of')} {totalPages}
                </span>
                <h1 className="text-display-md md:text-display-lg font-medium leading-tight text-foreground mb-3">
                  {contentPage?.title ?? t('contentPageNoBody')}
                </h1>
                <div className="w-20 h-1 bg-primary mx-auto rounded-full" />
              </header>

              <div className="bg-card rounded-3xl p-card-padding-lg md:p-10 border border-border/60 shadow-card-hover shadow-muted/50">
                {bodyRendered ? (
                  <div className="prose prose-lg max-w-none dark:prose-invert leading-relaxed">
                    {bodyRendered}
                  </div>
                ) : (
                  <div className="text-center py-section-md">
                    <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-body-sm font-medium text-muted-foreground">
                      {t('contentPageNoBody')}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <div className="sticky bottom-0 z-30 bg-card/80 backdrop-blur-xl border-t border-border/50 px-6 py-content-gap pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto flex items-center justify-center gap-content-gap-lg">
          <button
            onClick={handlePrev}
            disabled={isFirstPage}
            aria-label="Previous page"
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-normal cursor-pointer',
              isFirstPage
                ? 'text-muted-foreground/40'
                : 'bg-muted text-foreground hover:bg-muted/80',
            )}
          >
            <span className="text-heading-lg font-light">‹</span>
          </button>

          {isLastPage ? (
            <Button onClick={handleFinish} size="lg" className="min-h-[48px] px-8">
              {t('lessonIntroStart')}
              <ChevronLeft className="ms-2 h-5 w-5 rtl:rotate-0 ltr:rotate-180" />
            </Button>
          ) : (
            <button
              onClick={handleNext}
              aria-label="Next page"
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-normal cursor-pointer bg-muted text-foreground hover:bg-muted/80"
            >
              <span className="text-heading-lg font-light">›</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
