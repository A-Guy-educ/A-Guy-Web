'use client'

import type { FormulaSheet } from '@/infra/types/content'
import { splitExplanationBullets } from '@/lib/lessons/splitExplanationBullets'
import { FormulaSheetContent } from '@/ui/web/shared/FormulaSheetViewer/FormulaSheetContent'
import { MathBulletList } from '@/ui/web/shared/MathBulletList'

interface FormulasPanelProps {
  sheet?: FormulaSheet | null
  /** The lesson's own formulas text, shown when there is no sheet. */
  formulas?: string | null
}

/** The attached formula sheet, or else the lesson's formulas listed as on the lesson intro page. */
export function FormulasPanel({ sheet, formulas }: FormulasPanelProps) {
  if (sheet) {
    return (
      <div className="p-card-padding-sm">
        <p className="mb-3 text-body-sm font-semibold text-foreground">{sheet.title}</p>
        <FormulaSheetContent sheet={sheet} />
      </div>
    )
  }
  return (
    <div className="p-card-padding-sm">
      <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-card-padding-sm">
        <MathBulletList bullets={splitExplanationBullets(formulas)} />
      </div>
    </div>
  )
}
