/**
 * Proof Cell Select
 * Dropdown for one blank proof cell. Options render through MathMarkdown so
 * `$...$` math in a claim or reason displays the same as filled cells.
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { cn } from '@/infra/utils/ui'
import { MathMarkdown } from '@/ui/web/shared/MathMarkdown'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/web/components/select'

interface ProofCellSelectProps {
  cellKey: string
  options: string[]
  value: string
  placeholder: string
  ariaLabel: string
  onChange: (key: string, value: string) => void
  /** `undefined` until the table has been checked. */
  result: boolean | undefined
  disabled: boolean
}

export function ProofCellSelect({
  cellKey,
  options,
  value,
  placeholder,
  ariaLabel,
  onChange,
  result,
  disabled,
}: ProofCellSelectProps) {
  return (
    <div className="relative">
      <Select
        // Radix treats '' as "no value", which shows the placeholder.
        value={value || undefined}
        onValueChange={(next) => onChange(cellKey, next)}
        disabled={disabled}
      >
        <SelectTrigger
          aria-label={ariaLabel}
          className={cn(
            'h-11 rounded-lg border-2 text-start transition-all duration-normal',
            result === true && 'border-success bg-success/10 text-success pe-9',
            result === false && 'border-destructive bg-destructive/10 text-destructive pe-9',
            result === undefined &&
              'border-[hsl(var(--tab-learn)/0.4)] bg-[hsl(var(--tab-learn)/0.04)] focus:border-[hsl(var(--tab-learn))] focus:shadow-[0_0_0_3px_hsl(var(--tab-learn)/0.15)]',
            disabled && 'disabled:opacity-100',
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              <MathMarkdown content={option} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {result !== undefined && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className={cn(
            'pointer-events-none absolute end-8 top-1/2 -translate-y-1/2',
            result ? 'text-success' : 'text-destructive',
          )}
        >
          {result ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </motion.span>
      )}
    </div>
  )
}
