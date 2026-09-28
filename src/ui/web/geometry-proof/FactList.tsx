import { formatFactHe } from './format-he'
import type { Fact } from '@/lib/geometry-engine/types'

interface FactListProps {
  facts: readonly Fact[]
  emptyHe?: string
}

export function FactList({ facts, emptyHe = 'אין' }: FactListProps) {
  if (facts.length === 0) {
    return <p className="text-body-sm text-muted-foreground">{emptyHe}</p>
  }
  return (
    <ul className="space-y-1">
      {facts.map((f, i) => (
        <li
          key={i}
          className="rounded-md bg-muted/50 px-3 py-1.5 font-mono text-body-sm text-foreground"
          dir="ltr"
        >
          {formatFactHe(f)}
        </li>
      ))}
    </ul>
  )
}
