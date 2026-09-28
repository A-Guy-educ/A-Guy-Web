'use client'

import { useMemo, useState, type KeyboardEvent } from 'react'
import { Button } from '@/ui/web/components/button'
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

interface FieldSpec {
  size: number
  placeholder: string
  prefix?: string
}

interface KindSpec {
  labelHe: string
  fields: readonly FieldSpec[]
  separator: string
  hasDegrees?: boolean
}

const KIND_SPECS: Record<ClaimableKind, KindSpec> = {
  segment_eq: {
    labelHe: 'קטעים שווים',
    fields: [
      { size: 2, placeholder: 'AB' },
      { size: 2, placeholder: 'CD' },
    ],
    separator: '=',
  },
  angle_eq: {
    labelHe: 'זוויות שוות',
    fields: [
      { size: 3, placeholder: 'ABC', prefix: '∠' },
      { size: 3, placeholder: 'DEF', prefix: '∠' },
    ],
    separator: '=',
  },
  angle_measure: {
    labelHe: 'מידת זווית',
    fields: [{ size: 3, placeholder: 'ABC', prefix: '∠' }],
    separator: '=',
    hasDegrees: true,
  },
  triangle_congruent: {
    labelHe: 'משולשים חופפים',
    fields: [
      { size: 3, placeholder: 'ABC', prefix: '△' },
      { size: 3, placeholder: 'DEF', prefix: '△' },
    ],
    separator: '≅',
  },
  perpendicular: {
    labelHe: 'ניצבים',
    fields: [
      { size: 2, placeholder: 'AB' },
      { size: 2, placeholder: 'CD' },
    ],
    separator: '⊥',
  },
  parallel: {
    labelHe: 'מקבילים',
    fields: [
      { size: 2, placeholder: 'AB' },
      { size: 2, placeholder: 'CD' },
    ],
    separator: '∥',
  },
  midpoint: {
    labelHe: 'אמצע קטע',
    fields: [
      { size: 1, placeholder: 'M' },
      { size: 2, placeholder: 'AB' },
    ],
    separator: 'אמצע',
  },
  isosceles: {
    labelHe: 'שווה־שוקיים',
    fields: [{ size: 3, placeholder: 'ABC', prefix: '△' }],
    separator: '',
  },
}

interface StepInputProps {
  points: readonly PointName[]
  onSubmit: (claim: Fact) => void
  disabled?: boolean
}

export function StepInput({ points, onSubmit, disabled }: StepInputProps) {
  const [kind, setKind] = useState<ClaimableKind>('angle_eq')
  const [values, setValues] = useState<readonly string[]>(['', ''])
  const [degrees, setDegrees] = useState<string>('90')

  const spec = KIND_SPECS[kind]

  const canSubmit = useMemo(() => {
    for (let i = 0; i < spec.fields.length; i++) {
      if ((values[i]?.length ?? 0) !== spec.fields[i]!.size) return false
    }
    if (spec.hasDegrees && !Number.isFinite(Number(degrees))) return false
    return true
  }, [spec, values, degrees])

  const handleKindChange = (next: ClaimableKind) => {
    setKind(next)
    setValues(new Array(KIND_SPECS[next].fields.length).fill(''))
  }

  const handleFieldChange = (i: number, v: string) => {
    setValues((prev) => {
      const next = [...prev]
      next[i] = v
      return next
    })
  }

  const buildClaim = (): Fact | null => {
    const v = values
    switch (kind) {
      case 'segment_eq':
        return { kind, a: [v[0]![0]!, v[0]![1]!] as Seg, b: [v[1]![0]!, v[1]![1]!] as Seg }
      case 'angle_eq':
        return {
          kind,
          a: [v[0]![0]!, v[0]![1]!, v[0]![2]!] as Angle,
          b: [v[1]![0]!, v[1]![1]!, v[1]![2]!] as Angle,
        }
      case 'angle_measure':
        return {
          kind,
          angle: [v[0]![0]!, v[0]![1]!, v[0]![2]!] as Angle,
          degrees: Number(degrees),
        }
      case 'triangle_congruent':
        return {
          kind,
          t1: [v[0]![0]!, v[0]![1]!, v[0]![2]!] as Triangle,
          t2: [v[1]![0]!, v[1]![1]!, v[1]![2]!] as Triangle,
        }
      case 'perpendicular':
        return { kind, a: [v[0]![0]!, v[0]![1]!] as Seg, b: [v[1]![0]!, v[1]![1]!] as Seg }
      case 'parallel':
        return { kind, a: [v[0]![0]!, v[0]![1]!] as Seg, b: [v[1]![0]!, v[1]![1]!] as Seg }
      case 'midpoint':
        return { kind, m: v[0]![0]!, a: v[1]![0]!, b: v[1]![1]! }
      case 'isosceles':
        return {
          kind,
          t: [v[0]![0]!, v[0]![1]!, v[0]![2]!] as Triangle,
        }
    }
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    const claim = buildClaim()
    if (!claim) return
    onSubmit(claim)
    setValues(new Array(spec.fields.length).fill(''))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && canSubmit) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-card-padding-sm">
      <div className="space-y-2">
        <Select value={kind} onValueChange={(v) => handleKindChange(v as ClaimableKind)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(KIND_SPECS) as ClaimableKind[]).map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_SPECS[k].labelHe}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className="flex items-center justify-center gap-content-gap-xs py-2"
        dir="ltr"
        onKeyDown={handleKeyDown}
      >
        {spec.fields.map((f, i) => (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && (
              <span className="mx-1 font-mono text-body-sm text-muted-foreground">
                {spec.separator}
              </span>
            )}
            {f.prefix && (
              <span className="font-mono text-body-base text-foreground">{f.prefix}</span>
            )}
            <PointsInput
              value={values[i] ?? ''}
              onChange={(next) => handleFieldChange(i, next)}
              size={f.size}
              placeholder={f.placeholder}
              autoFocus={i === 0}
            />
          </div>
        ))}
        {spec.hasDegrees && (
          <>
            <span className="mx-1 font-mono text-body-sm text-muted-foreground">
              {spec.separator}
            </span>
            <input
              type="number"
              value={degrees}
              onChange={(e) => setDegrees(e.target.value)}
              className="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-center text-body-sm"
            />
            <span className="font-mono text-body-sm text-muted-foreground">°</span>
          </>
        )}
      </div>

      {points.length > 0 && (
        <p className="text-center text-body-xs text-muted-foreground" dir="ltr">
          נקודות: {points.join(', ')}
        </p>
      )}

      <Button onClick={handleSubmit} disabled={disabled || !canSubmit} className="w-full">
        הוסף צעד (Enter)
      </Button>
    </div>
  )
}

function PointsInput({
  value,
  onChange,
  size,
  placeholder,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  size: number
  placeholder: string
  autoFocus?: boolean
}) {
  return (
    <input
      value={value}
      onChange={(e) => {
        const cleaned = e.target.value
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .slice(0, size)
        onChange(cleaned)
      }}
      placeholder={placeholder}
      maxLength={size}
      autoFocus={autoFocus}
      style={{ width: `${Math.max(size + 1, 3)}ch` }}
      dir="ltr"
      className="rounded-md border border-input bg-background px-2 py-1.5 text-center font-mono text-body-base uppercase focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
    />
  )
}
