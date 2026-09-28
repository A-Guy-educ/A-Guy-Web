'use client'

import { useMemo, useState } from 'react'
import { GeometryRenderer } from '@/ui/web/exerciserenderer/blocks/GeometryRenderer'
import { computeDerivedGeometryFacts } from '@/lib/geometry-engine/derive-facts'
import { specToFacts } from '@/lib/geometry-engine/spec-to-facts'
import { canonicalize } from '@/lib/geometry-engine/canonical'
import { initState, validateEasy, type ProofState } from '@/lib/geometry-engine/validator'
import type { Fact } from '@/lib/geometry-engine/types'
import type { GeometryProofProblem } from '@/lib/geometry-engine/problems'
import { FactList } from './FactList'
import { StepInput } from './StepInput'
import { formatFactHe } from './format-he'

interface HistoryEntry {
  claim: Fact
  lemmaId: string
  lemmaNameHe: string
}

interface FeedbackState {
  status: 'ok' | 'error'
  message: string
}

interface GeometryProofPlayerProps {
  problem: GeometryProofProblem
}

export function GeometryProofPlayer({ problem }: GeometryProofPlayerProps) {
  const { initialState, initialFacts, pointNames } = useMemo(() => {
    const parsed = specToFacts(problem.spec)
    const derived = computeDerivedGeometryFacts(parsed.placedPoints)
    const facts: Fact[] = [...parsed.facts, ...problem.extraGivens, ...derived]
    return {
      initialState: initState(facts),
      initialFacts: facts,
      pointNames: parsed.pointNames,
    }
  }, [problem])

  const [state, setState] = useState<ProofState>(initialState)
  const [history, setHistory] = useState<readonly HistoryEntry[]>([])
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)

  const goalKey = useMemo(() => JSON.stringify(canonicalize(problem.goal)), [problem.goal])
  const solved = state.keys.has(goalKey)

  const handleSubmit = (claim: Fact) => {
    const result = validateEasy(claim, state)
    if (!result.ok) {
      setFeedback({ status: 'error', message: result.reason })
      return
    }
    setState(result.state)
    setHistory((prev) => [
      ...prev,
      {
        claim,
        lemmaId: result.lemma.id,
        lemmaNameHe: result.lemma.nameHe,
      },
    ])
    setFeedback({ status: 'ok', message: `${formatFactHe(claim)} — ${result.lemma.nameHe}` })
  }

  return (
    <div dir="rtl" className="mx-auto max-w-6xl space-y-6 p-card-padding-sm">
      <header className="space-y-2">
        <h1 className="text-heading-xl font-semibold text-foreground">{problem.titleHe}</h1>
        <p className="text-muted-foreground">{problem.statementHe}</p>
      </header>

      <div className="grid gap-content-gap-lg lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-border bg-card p-card-padding-sm">
          <GeometryRenderer blockId={`geometry-proof-${problem.id}`} spec={problem.spec} />
        </div>

        <aside className="space-y-4">
          <section>
            <h2 className="mb-2 text-body-sm font-semibold text-foreground">נתונים</h2>
            <FactList facts={initialFacts} />
          </section>
          <section>
            <h2 className="mb-2 text-body-sm font-semibold text-foreground">להוכיח</h2>
            <p
              className="rounded-md bg-primary/10 px-3 py-1.5 font-mono text-body-sm text-primary"
              dir="ltr"
            >
              {formatFactHe(problem.goal)}
            </p>
          </section>
        </aside>
      </div>

      {solved ? (
        <div className="rounded-lg border border-success bg-success/10 p-card-padding-sm text-success">
          <p className="font-semibold">כל הכבוד! ההוכחה הושלמה.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <StepInput points={pointNames} onSubmit={handleSubmit} />
          {feedback && (
            <div
              className={
                feedback.status === 'ok'
                  ? 'rounded-md border border-success bg-success/10 px-3 py-2 text-body-sm text-success'
                  : 'rounded-md border border-error bg-error/10 px-3 py-2 text-body-sm text-error'
              }
              dir={feedback.status === 'ok' ? 'ltr' : 'rtl'}
            >
              {feedback.message}
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="mb-2 text-body-sm font-semibold text-foreground">מהלך ההוכחה</h2>
          <ol className="space-y-1">
            {history.map((entry, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-md bg-muted/50 px-3 py-1.5 text-body-sm"
              >
                <span className="text-muted-foreground">{i + 1}.</span>
                <span className="font-mono" dir="ltr">
                  {formatFactHe(entry.claim)}
                </span>
                <span className="ms-auto text-body-xs text-muted-foreground">
                  {entry.lemmaNameHe}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
