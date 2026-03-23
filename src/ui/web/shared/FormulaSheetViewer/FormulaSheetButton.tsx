/**
 * FormulaSheetButton
 *
 * @fileType component
 * @domain formula-sheets
 * @pattern action-button
 * @ai-summary Button component to open formula sheet viewer with pre-rendered content
 */

'use client'

import type React from 'react'
import { useState } from 'react'

import { BookOpen } from 'lucide-react'

import { useMediaQuery } from '@/server/payload/hooks/useMediaQuery'
import { Button } from '@/ui/web/components/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/ui/web/components/sheet'
import { useTranslations } from '@/ui/web/providers/I18n'

export interface FormulaSheetButtonProps {
  /** Title of the formula sheet */
  title: string | null

  /** Pre-rendered formula sheet content (rendered server-side to avoid client bundling server modules) */
  content: React.ReactNode | null

  /** Additional className for the button */
  className?: string
}

/**
 * FormulaSheetButton - Opens formula sheet viewer when clicked
 *
 * Only renders if content is provided. Shows a book icon button
 * that opens the sheet content in a sliding panel (desktop) or bottom drawer (mobile).
 *
 * Content must be pre-rendered server-side because RenderBlocks/RichText
 * transitively import payload.config.ts which includes Node.js-only modules.
 */
export function FormulaSheetButton({ title, content, className }: FormulaSheetButtonProps) {
  const [open, setOpen] = useState(false)
  const t = useTranslations('courses')
  const isDesktop = useMediaQuery('(min-width: 640px)')

  // Only render if we have content
  if (!title || !content) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
        aria-label={t('formulaSheetTitle')}
      >
        <BookOpen className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
        <span className="hidden sm:inline">{t('formulaSheetTitle')}</span>
      </Button>

      <SheetContent
        side={isDesktop ? 'left' : 'bottom'}
        className={
          isDesktop
            ? 'w-full sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] overflow-y-auto'
            : 'h-[85vh] overflow-y-auto rounded-t-2xl'
        }
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="text-heading-xl font-semibold">{title}</SheetTitle>
          <p className="text-body-sm text-muted-foreground">{t('formulaSheetTitle')}</p>
        </SheetHeader>

        <div className={isDesktop ? 'pr-8' : ''}>{content}</div>
      </SheetContent>
    </Sheet>
  )
}
