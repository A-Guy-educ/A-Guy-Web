'use client'

/**
 * Searchable school picker. There are thousands of schools in Israel, so a
 * plain <select> doesn't scale — this filters by name or city as you type.
 * The last option is always "my school isn't listed", which hands control
 * back to the form to show a free-text field.
 *
 * @fileType component
 * @domain schools
 */

import { Check, ChevronDown, School } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/infra/utils/ui'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/ui/web/components/command'
import { useTranslations } from '@/ui/web/providers/I18n'

import type { DemoSchool } from '../_lib/demo-data'

export const OTHER_SCHOOL = 'other'

interface SchoolComboboxProps {
  id: string
  schools: readonly DemoSchool[]
  /** A school id, `OTHER_SCHOOL`, or null when nothing is picked yet. */
  value: string | null
  onChange: (value: string) => void
  disabled?: boolean
  invalid?: boolean
}

export function SchoolCombobox({
  id,
  schools,
  value,
  onChange,
  disabled = false,
  invalid = false,
}: SchoolComboboxProps) {
  const t = useTranslations('schoolSignup')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  const selected = schools.find((s) => s.id === value)
  const label = selected
    ? `${selected.name} · ${selected.city}`
    : value === OTHER_SCHOOL
      ? t('schoolNotListed')
      : t('schoolPlaceholder')

  const pick = (next: string) => {
    onChange(next)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={invalid || undefined}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'flex h-12 w-full items-center gap-content-gap-xs rounded-md border border-form-border bg-form px-3 text-body-sm ring-offset-background transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-disabled',
          invalid && 'border-destructive',
        )}
      >
        <School className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className={cn('flex-1 truncate text-start', !value && 'text-form-placeholder')}>
          {label}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
      </button>

      {isOpen ? (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border shadow-elevation-3">
          <Command>
            <CommandInput autoFocus placeholder={t('schoolSearchPlaceholder')} />
            <CommandList>
              <CommandEmpty>{t('schoolNoResults')}</CommandEmpty>
              <CommandGroup>
                {schools.map((school) => (
                  <CommandItem
                    key={school.id}
                    value={`${school.name} ${school.city}`}
                    onSelect={() => pick(school.id)}
                    className="gap-content-gap-xs"
                  >
                    <Check
                      className={cn('h-4 w-4', value === school.id ? 'opacity-100' : 'opacity-0')}
                      aria-hidden
                    />
                    <span className="font-medium">{school.name}</span>
                    <span className="text-muted-foreground">· {school.city}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {/* forceMount keeps the escape hatch visible whatever the search. */}
              <CommandSeparator alwaysRender />
              <CommandGroup forceMount>
                <CommandItem
                  forceMount
                  value={OTHER_SCHOOL}
                  onSelect={() => pick(OTHER_SCHOOL)}
                  className="text-primary"
                >
                  {t('schoolNotListed')}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      ) : null}
    </div>
  )
}
