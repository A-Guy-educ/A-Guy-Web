'use client'

import { cn } from '@/infra/utils/ui'
import { MathMarkdown } from '@/ui/web/shared/MathMarkdown'

interface StudentBubbleProps {
  text: string
  isCorrect?: boolean
}

export function StudentBubble({ text, isCorrect }: StudentBubbleProps) {
  const tone =
    isCorrect === true
      ? 'bg-success text-success-foreground'
      : isCorrect === false
        ? 'bg-error text-error-foreground'
        : 'bg-primary text-primary-foreground'

  return (
    <div className="flex justify-end">
      <div
        className={cn('max-w-[85%] rounded-2xl rounded-tl-md px-4 py-2.5 shadow-elevation-1', tone)}
      >
        <div className="text-body-md font-medium leading-relaxed">
          <MathMarkdown content={text} />
        </div>
      </div>
    </div>
  )
}
