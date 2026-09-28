'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/web/components/select'
import { Label } from '@/ui/web/components/label'
import { GeometryProofPlayer } from '@/ui/web/geometry-proof/GeometryProofPlayer'
import type { GeometryProofProblem } from '@/lib/geometry-engine/problems'

interface GeometryProofPageProps {
  problems: readonly GeometryProofProblem[]
}

export function GeometryProofPage({ problems }: GeometryProofPageProps) {
  const [selectedId, setSelectedId] = useState<string>(problems[0]?.id ?? '')
  const problem = problems.find((p) => p.id === selectedId) ?? problems[0]

  if (!problem) {
    return (
      <div className="p-card-padding-lg text-center text-muted-foreground" dir="rtl">
        אין בעיות זמינות.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 pt-6" dir="rtl">
        <div className="mb-4 flex items-end gap-3">
          <div className="flex-1 max-w-sm space-y-1">
            <Label className="text-body-xs text-muted-foreground">בחר בעיה</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {problems.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.titleHe}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <GeometryProofPlayer key={problem.id} problem={problem} />
    </div>
  )
}
