/**
 * Labelled field shell for the /join form, with an inline error line.
 *
 * @fileType component
 * @domain classroom
 */

import type { ReactNode } from 'react'

import { cn } from '@/infra/utils/ui'
import { Label } from '@/ui/web/components/label'

export type FieldKey = 'school' | 'class'

export const fieldId = (key: FieldKey) => `join-${key}`

// 16px text keeps iOS Safari from zooming into the field on focus.
export function fieldClass(invalid: boolean) {
  return cn('h-12 rounded-xl text-body-md', invalid && 'border-destructive')
}

export function JoinField({
  fieldKey,
  label,
  error,
  children,
}: {
  fieldKey: FieldKey
  label: string
  error: string | false
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId(fieldKey)} className="text-body-md font-bold">
        {label}
      </Label>
      {children}
      {error ? <p className="text-body-xs text-destructive">{error}</p> : null}
    </div>
  )
}
