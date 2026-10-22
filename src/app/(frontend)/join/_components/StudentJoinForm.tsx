'use client'

/**
 * Four-field student registration: school → class → full name → phone.
 * Class options depend on the school, and changing school resets the class.
 * Errors show per field on submit and clear as soon as that field changes.
 *
 * @fileType component
 * @domain schools
 */

import { ArrowRight, Loader2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'

import { cn } from '@/infra/utils/ui'
import { Button } from '@/ui/web/components/button'
import { Input } from '@/ui/web/components/input'
import { Label } from '@/ui/web/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/web/components/select'
import { useTranslations } from '@/ui/web/providers/I18n'

import {
  SCHOOLS,
  isValidMobile,
  normalizePhone,
  registerStudent,
  type RegisterResult,
} from '../_lib/student-registration'

type FieldKey = 'school' | 'class' | 'name' | 'phone'

/** DOM order, so the first error we focus is the topmost one. */
const FIELD_ORDER: readonly FieldKey[] = ['school', 'class', 'name', 'phone']

const fieldId = (key: FieldKey) => `join-${key}`

export function StudentJoinForm() {
  const t = useTranslations('studentJoin')

  const [schoolId, setSchoolId] = useState('')
  const [classId, setClassId] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<ReadonlySet<FieldKey>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<RegisterResult | null>(null)

  const school = SCHOOLS.find((s) => s.id === schoolId)

  const clearError = (key: FieldKey) => {
    if (!errors.has(key)) return
    const next = new Set(errors)
    next.delete(key)
    setErrors(next)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setResult(null)

    const invalid = new Set<FieldKey>()
    if (!schoolId) invalid.add('school')
    if (!classId) invalid.add('class')
    if (fullName.trim().length < 2) invalid.add('name')
    if (!isValidMobile(phone)) invalid.add('phone')
    setErrors(invalid)

    const firstInvalid = FIELD_ORDER.find((key) => invalid.has(key))
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      setResult(
        await registerStudent({
          school_id: schoolId,
          class_id: classId,
          full_name: fullName.trim(),
          phone: normalizePhone(phone),
        }),
      )
    } catch {
      setResult('failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-content-gap rounded-2xl bg-card p-card-padding shadow-elevation-1"
    >
      <Field
        fieldKey="school"
        label={t('fields.school')}
        error={errors.has('school') && t('errors.school')}
      >
        <Select
          value={schoolId}
          onValueChange={(v) => {
            setSchoolId(v)
            setClassId('')
            clearError('school')
          }}
        >
          <SelectTrigger id={fieldId('school')} className={fieldClass(errors.has('school'))}>
            <SelectValue placeholder={t('placeholders.school')} />
          </SelectTrigger>
          <SelectContent>
            {SCHOOLS.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        fieldKey="class"
        label={t('fields.class')}
        error={errors.has('class') && t('errors.class')}
      >
        <Select
          value={classId}
          disabled={!school}
          onValueChange={(v) => {
            setClassId(v)
            clearError('class')
          }}
        >
          <SelectTrigger id={fieldId('class')} className={fieldClass(errors.has('class'))}>
            <SelectValue
              placeholder={school ? t('placeholders.class') : t('placeholders.classNeedsSchool')}
            />
          </SelectTrigger>
          <SelectContent>
            {school?.classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        fieldKey="name"
        label={t('fields.name')}
        error={errors.has('name') && t('errors.name')}
      >
        <Input
          id={fieldId('name')}
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value)
            clearError('name')
          }}
          placeholder={t('placeholders.name')}
          autoComplete="name"
          aria-invalid={errors.has('name') || undefined}
          className={fieldClass(errors.has('name'))}
        />
      </Field>

      <Field
        fieldKey="phone"
        label={t('fields.phone')}
        error={errors.has('phone') && t('errors.phone')}
      >
        <Input
          id={fieldId('phone')}
          type="tel"
          inputMode="numeric"
          dir="ltr"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            clearError('phone')
          }}
          placeholder="050-0000000"
          autoComplete="tel"
          aria-invalid={errors.has('phone') || undefined}
          className={cn(fieldClass(errors.has('phone')), 'text-end')}
        />
      </Field>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 h-14 w-full gap-content-gap-xs rounded-xl text-heading-md font-bold"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            {t('submitting')}
          </>
        ) : (
          <>
            {t('submit')}
            <ArrowRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
          </>
        )}
      </Button>

      {result ? (
        <p
          role="status"
          className={cn(
            'text-center text-body-sm',
            result === 'ok' ? 'text-success' : 'text-destructive',
          )}
        >
          {t(`result.${result}`)}
        </p>
      ) : null}
    </form>
  )
}

// 16px text keeps iOS Safari from zooming into the field on focus.
function fieldClass(invalid: boolean) {
  return cn('h-12 rounded-xl text-body-md', invalid && 'border-destructive')
}

function Field({
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
