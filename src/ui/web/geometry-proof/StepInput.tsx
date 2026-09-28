'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/ui/web/components/button'
import { Label } from '@/ui/web/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/web/components/select'
import type { Angle, Fact, PointName, Seg, Triangle } from '@/lib/geometry-engine/types'

type ClaimableKind =
  | 'segment_eq'
  | 'angle_eq'
  | 'angle_measure'
  | 'triangle_congruent'
  | 'perpendicular'
  | 'parallel'
  | 'midpoint'
  | 'isosceles'

const KIND_LABELS_HE: Record<ClaimableKind, string> = {
  segment_eq: 'קטעים שווים (AB = CD)',
  angle_eq: 'זוויות שוות (∠ABC = ∠DEF)',
  angle_measure: 'מידת זווית (∠ABC = X°)',
  triangle_congruent: 'משולשים חופפים (△ABC ≅ △DEF)',
  perpendicular: 'ניצבים (AB ⊥ CD)',
  parallel: 'מקבילים (AB ∥ CD)',
  midpoint: 'אמצע קטע',
  isosceles: 'משולש שווה־שוקיים',
}

const KIND_POINT_COUNTS: Record<ClaimableKind, number> = {
  segment_eq: 4,
  angle_eq: 6,
  angle_measure: 3,
  triangle_congruent: 6,
  perpendicular: 4,
  parallel: 4,
  midpoint: 3,
  isosceles: 3,
}

const POINT_LABELS_HE: Record<ClaimableKind, readonly string[]> = {
  segment_eq: ['A', 'B', 'C', 'D'],
  angle_eq: ['A', 'B', 'C', 'D', 'E', 'F'],
  angle_measure: ['A (קרן)', 'B (קודקוד)', 'C (קרן)'],
  triangle_congruent: ['A', 'B', 'C', 'D', 'E', 'F'],
  perpendicular: ['A', 'B', 'C', 'D'],
  parallel: ['A', 'B', 'C', 'D'],
  midpoint: ['M (האמצע)', 'A', 'B'],
  isosceles: ['A (קודקוד)', 'B', 'C'],
}

interface StepInputProps {
  points: readonly PointName[]
  onSubmit: (claim: Fact) => void
  disabled?: boolean
}

export function StepInput({ points, onSubmit, disabled }: StepInputProps) {
  const [kind, setKind] = useState<ClaimableKind>('segment_eq')
  const [selected, setSelected] = useState<readonly (string | undefined)[]>([])
  const [degrees, setDegrees] = useState<string>('90')

  const pointCount = KIND_POINT_COUNTS[kind]
  const labels = POINT_LABELS_HE[kind]

  const canSubmit = useMemo(() => {
    for (let i = 0; i < pointCount; i++) {
      if (!selected[i]) return false
    }
    if (kind === 'angle_measure') {
      const n = Number(degrees)
      if (!Number.isFinite(n)) return false
    }
    return true
  }, [selected, pointCount, kind, degrees])

  const handleKindChange = (next: ClaimableKind) => {
    setKind(next)
    setSelected([])
  }

  const handlePointChange = (index: number, value: string) => {
    setSelected((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    const p = selected as readonly PointName[]
    let claim: Fact
    switch (kind) {
      case 'segment_eq':
        claim = { kind, a: [p[0]!, p[1]!] as Seg, b: [p[2]!, p[3]!] as Seg }
        break
      case 'angle_eq':
        claim = {
          kind,
          a: [p[0]!, p[1]!, p[2]!] as Angle,
          b: [p[3]!, p[4]!, p[5]!] as Angle,
        }
        break
      case 'angle_measure':
        claim = {
          kind,
          angle: [p[0]!, p[1]!, p[2]!] as Angle,
          degrees: Number(degrees),
        }
        break
      case 'triangle_congruent':
        claim = {
          kind,
          t1: [p[0]!, p[1]!, p[2]!] as Triangle,
          t2: [p[3]!, p[4]!, p[5]!] as Triangle,
        }
        break
      case 'perpendicular':
        claim = { kind, a: [p[0]!, p[1]!] as Seg, b: [p[2]!, p[3]!] as Seg }
        break
      case 'parallel':
        claim = { kind, a: [p[0]!, p[1]!] as Seg, b: [p[2]!, p[3]!] as Seg }
        break
      case 'midpoint':
        claim = { kind, m: p[0]!, a: p[1]!, b: p[2]! }
        break
      case 'isosceles':
        claim = { kind, t: [p[0]!, p[1]!, p[2]!] as Triangle }
        break
    }
    onSubmit(claim)
    setSelected([])
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-card-padding-sm">
      <div className="space-y-2">
        <Label>סוג הטענה</Label>
        <Select value={kind} onValueChange={(v) => handleKindChange(v as ClaimableKind)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(KIND_LABELS_HE) as ClaimableKind[]).map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_LABELS_HE[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {labels.map((label, i) => (
          <div key={i} className="space-y-1">
            <Label className="text-body-xs text-muted-foreground">{label}</Label>
            <Select value={selected[i] ?? ''} onValueChange={(v) => handlePointChange(i, v)}>
              <SelectTrigger>
                <SelectValue placeholder="בחר" />
              </SelectTrigger>
              <SelectContent>
                {points.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        {kind === 'angle_measure' && (
          <div className="space-y-1">
            <Label className="text-body-xs text-muted-foreground">מעלות</Label>
            <input
              type="number"
              value={degrees}
              onChange={(e) => setDegrees(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-body-sm"
            />
          </div>
        )}
      </div>

      <Button onClick={handleSubmit} disabled={disabled || !canSubmit} className="w-full">
        הוסף צעד
      </Button>
    </div>
  )
}
