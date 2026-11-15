import React from 'react'
import type { LinearEquation } from '@/infra/types/exercise'
import {
  equationLatex,
  fromLinear,
  substitutionCheck,
  type Fraction,
} from '@/infra/types/linearEquation'
import { EquationLine } from './EquationLine'

interface EquationSolvedPanelProps {
  linear: LinearEquation
  solution: Fraction
  t: (key: string) => string
}

/** Solved message plus substituting x back into the original equation. */
export function EquationSolvedPanel({ linear, solution, t }: EquationSolvedPanelProps) {
  const start = equationLatex(fromLinear(linear))
  const check = substitutionCheck(linear, solution)
  return (
    <div className="flex flex-col gap-content-gap-xs">
      <p role="status" className="text-center text-body-md font-bold text-success">
        {t('equationSolved')}
      </p>
      <p className="text-body-sm font-semibold text-foreground">{t('equationCheckTitle')}</p>
      <div className="flex flex-col gap-1 rounded-xl border border-border/40 bg-background/60 dark:bg-card px-2 py-section-sm">
        <EquationLine left={start.left} right={start.right} />
        <EquationLine left={check.substituted.left} right={check.substituted.right} />
        <EquationLine left={check.evaluated.left} right={check.evaluated.right} tone="final" />
      </div>
      {check.holds && (
        <p className="text-center text-body-sm font-bold text-success">{t('equationCheckHolds')}</p>
      )}
    </div>
  )
}
