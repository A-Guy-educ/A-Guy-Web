'use client'

/**
 * School signup form (demo). Collects the student, their school and a
 * parent/guardian, lets them pick a plan, and applies the school code.
 *
 * Nothing is persisted — submit fakes a round-trip and shows the success
 * screen. `?code=` pre-applies a code (the link schools would hand out) and
 * `?school=` pre-selects a school.
 *
 * @fileType component
 * @domain schools
 */

import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Button } from '@/ui/web/components/button'
import { Checkbox } from '@/ui/web/components/checkbox'
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
import { PurchaseConsentCheckbox } from '@/ui/web/upsell/PurchaseConsentCheckbox'

import {
  DEMO_SCHOOLS,
  GRADES,
  MATH_UNITS,
  checkDemoCoupon,
  gradeNeedsMathUnits,
  isValidEmail,
  isValidIsraeliMobile,
  type Grade,
  type MathUnits,
  type PaidTier,
  type SchoolCoupon,
} from '../_lib/demo-data'
import { OrderSummary } from './OrderSummary'
import { PlanPicker } from './PlanPicker'
import { OTHER_SCHOOL, SchoolCombobox } from './SchoolCombobox'
import { SchoolCodeInput } from './SchoolCodeInput'
import { SchoolSignupSuccess } from './SchoolSignupSuccess'

type FieldKey =
  | 'fullName'
  | 'email'
  | 'phone'
  | 'grade'
  | 'mathUnits'
  | 'school'
  | 'otherSchool'
  | 'parentName'
  | 'parentPhone'
  | 'consent'

/** Value is the i18n key under `schoolSignup.errors`. */
type FieldErrors = Partial<Record<FieldKey, string>>

/** DOM order, so the first error we focus is the topmost one. */
const FIELD_ORDER: readonly FieldKey[] = [
  'fullName',
  'email',
  'phone',
  'grade',
  'mathUnits',
  'school',
  'otherSchool',
  'parentName',
  'parentPhone',
  'consent',
]

export function SchoolSignupForm() {
  const t = useTranslations('schoolSignup')
  const searchParams = useSearchParams()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [grade, setGrade] = useState<Grade | ''>('')
  const [mathUnits, setMathUnits] = useState<MathUnits | ''>('')
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [otherSchool, setOtherSchool] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [tier, setTier] = useState<PaidTier>('advanced')

  const [codeInput, setCodeInput] = useState('')
  const [coupon, setCoupon] = useState<SchoolCoupon | null>(null)
  const [couponError, setCouponError] = useState<'invalid' | 'wrongSchool' | null>(null)
  const [isCheckingCode, setIsCheckingCode] = useState(false)

  const [consent, setConsent] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const applyCode = async (rawCode: string, forSchoolId: string | null) => {
    if (!rawCode.trim()) return
    setIsCheckingCode(true)
    setCouponError(null)
    const result = await checkDemoCoupon(rawCode, forSchoolId)
    setIsCheckingCode(false)
    if (!result.ok) {
      setCouponError(result.reason)
      return
    }
    setCoupon(result.coupon)
    setCodeInput(result.coupon.code)
    // A school-bound code tells us where the student studies.
    if (result.coupon.schoolId) setSchoolId(result.coupon.schoolId)
  }

  // Prefill from the link a school hands out: /schools?code=RABIN50
  const didPrefill = useRef(false)
  useEffect(() => {
    if (didPrefill.current) return
    didPrefill.current = true
    const school = searchParams?.get('school')
    if (school && DEMO_SCHOOLS.some((s) => s.id === school)) setSchoolId(school)
    const code = searchParams?.get('code')
    if (code) {
      setCodeInput(code.toUpperCase())
      void applyCode(code, school)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  const handleSchoolChange = (next: string) => {
    setSchoolId(next)
    // Switching away from the school a code is bound to voids the code.
    if (coupon?.schoolId && coupon.schoolId !== next) {
      setCoupon(null)
      setCouponError('wrongSchool')
    }
  }

  const needsMathUnits = gradeNeedsMathUnits(grade)
  const errors = validate({
    fullName,
    email,
    phone,
    grade,
    mathUnits,
    needsMathUnits,
    schoolId,
    otherSchool,
    parentName,
    parentPhone,
    consent,
  })
  const shownError = (key: FieldKey) =>
    submitAttempted && errors[key] ? t(`errors.${errors[key]}`) : null

  const selectedSchool = DEMO_SCHOOLS.find((s) => s.id === schoolId)
  const schoolLabel = selectedSchool
    ? `${selectedSchool.name} · ${selectedSchool.city}`
    : schoolId === OTHER_SCHOOL && otherSchool.trim()
      ? otherSchool.trim()
      : null
  const percentOff = coupon?.percentOff ?? 0

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)
    const firstInvalid = FIELD_ORDER.find((key) => errors[key])
    if (firstInvalid) {
      toast.error(t('errors.fixFields'))
      document.getElementById(`school-signup-${firstInvalid}`)?.focus()
      return
    }
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 900))
    setIsSubmitting(false)
    setIsDone(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isDone) {
    return (
      <SchoolSignupSuccess
        fullName={fullName}
        email={email}
        schoolLabel={schoolLabel}
        tier={tier}
        percentOff={percentOff}
      />
    )
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="grid gap-section-sm lg:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="flex flex-col gap-section-sm">
        <Section title={t('sections.student')}>
          <Field id="fullName" label={t('fields.fullName')} error={shownError('fullName')}>
            <Input
              id="school-signup-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              className="h-12"
            />
          </Field>
          <div className="grid gap-content-gap sm:grid-cols-2">
            <Field id="email" label={t('fields.email')} error={shownError('email')}>
              <Input
                id="school-signup-email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="name@example.com"
                className="h-12"
              />
            </Field>
            <Field id="phone" label={t('fields.phone')} error={shownError('phone')}>
              <Input
                id="school-signup-phone"
                type="tel"
                dir="ltr"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="050-1234567"
                className="h-12"
              />
            </Field>
          </div>
          <div className="grid gap-content-gap sm:grid-cols-2">
            <Field id="grade" label={t('fields.grade')} error={shownError('grade')}>
              <Select
                value={grade}
                onValueChange={(v) => {
                  setGrade(v as Grade)
                  if (!gradeNeedsMathUnits(v as Grade)) setMathUnits('')
                }}
              >
                <SelectTrigger id="school-signup-grade" className="h-12">
                  <SelectValue placeholder={t('placeholders.grade')} />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {t(`grades.${g}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {needsMathUnits ? (
              <Field id="mathUnits" label={t('fields.mathUnits')} error={shownError('mathUnits')}>
                <Select value={mathUnits} onValueChange={(v) => setMathUnits(v as MathUnits)}>
                  <SelectTrigger id="school-signup-mathUnits" className="h-12">
                    <SelectValue placeholder={t('placeholders.mathUnits')} />
                  </SelectTrigger>
                  <SelectContent>
                    {MATH_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {t('mathUnitsOption').replace('{units}', u)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </div>
        </Section>

        <Section title={t('sections.school')}>
          <Field id="school" label={t('fields.school')} error={shownError('school')}>
            <SchoolCombobox
              id="school-signup-school"
              schools={DEMO_SCHOOLS}
              value={schoolId}
              onChange={handleSchoolChange}
              invalid={!!shownError('school')}
            />
          </Field>
          {schoolId === OTHER_SCHOOL ? (
            <Field
              id="otherSchool"
              label={t('fields.otherSchool')}
              error={shownError('otherSchool')}
            >
              <Input
                id="school-signup-otherSchool"
                value={otherSchool}
                onChange={(e) => setOtherSchool(e.target.value)}
                placeholder={t('placeholders.otherSchool')}
                className="h-12"
              />
            </Field>
          ) : null}
          <Field id="teacherName" label={t('fields.teacherName')} optional>
            <Input
              id="school-signup-teacherName"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="h-12"
            />
          </Field>
          <Field id="code" label={t('coupon.label')} hint={t('coupon.hint')}>
            <SchoolCodeInput
              id="school-signup-code"
              code={codeInput}
              onCodeChange={(next) => {
                setCodeInput(next)
                setCouponError(null)
              }}
              applied={coupon}
              isChecking={isCheckingCode}
              error={couponError}
              onApply={() => void applyCode(codeInput, schoolId)}
              onRemove={() => {
                setCoupon(null)
                setCodeInput('')
              }}
            />
          </Field>
        </Section>

        <Section title={t('sections.parent')} description={t('parentHint')}>
          <div className="grid gap-content-gap sm:grid-cols-2">
            <Field id="parentName" label={t('fields.parentName')} error={shownError('parentName')}>
              <Input
                id="school-signup-parentName"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="h-12"
              />
            </Field>
            <Field
              id="parentPhone"
              label={t('fields.parentPhone')}
              error={shownError('parentPhone')}
            >
              <Input
                id="school-signup-parentPhone"
                type="tel"
                dir="ltr"
                inputMode="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="050-1234567"
                className="h-12"
              />
            </Field>
          </div>
        </Section>

        <Section title={t('sections.plan')}>
          <PlanPicker value={tier} onChange={setTier} percentOff={percentOff} />
        </Section>
      </div>

      <div className="flex flex-col gap-content-gap lg:sticky lg:top-24 lg:self-start">
        <OrderSummary
          tier={tier}
          percentOff={percentOff}
          couponCode={coupon?.code ?? null}
          schoolLabel={schoolLabel}
        />
        <div className="flex flex-col gap-content-gap-xs">
          <PurchaseConsentCheckbox
            id="school-signup-consent"
            checked={consent}
            onCheckedChange={setConsent}
          />
          {shownError('consent') ? (
            <p className="text-body-xs text-destructive">{shownError('consent')}</p>
          ) : null}
          <label
            htmlFor="school-signup-marketing"
            className="flex cursor-pointer select-none items-start gap-content-gap-xs text-body-xs text-muted-foreground"
          >
            <Checkbox
              id="school-signup-marketing"
              checked={marketingOptIn}
              onCheckedChange={(next) => setMarketingOptIn(next === true)}
              className="mt-0.5"
            />
            <span className="leading-relaxed">{t('marketingConsent')}</span>
          </label>
        </div>
        <Button type="submit" disabled={isSubmitting} className="h-12 w-full font-bold">
          {isSubmitting ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              {t('submitting')}
            </>
          ) : percentOff === 100 ? (
            t('submitFree')
          ) : (
            t('submit')
          )}
        </Button>
      </div>
    </form>
  )
}

interface ValidateInput {
  fullName: string
  email: string
  phone: string
  grade: Grade | ''
  mathUnits: MathUnits | ''
  needsMathUnits: boolean
  schoolId: string | null
  otherSchool: string
  parentName: string
  parentPhone: string
  consent: boolean
}

function validate(input: ValidateInput): FieldErrors {
  const errors: FieldErrors = {}
  if (input.fullName.trim().split(/\s+/).length < 2) errors.fullName = 'fullName'
  if (!isValidEmail(input.email)) errors.email = 'email'
  if (!isValidIsraeliMobile(input.phone)) errors.phone = 'phone'
  if (!input.grade) errors.grade = 'required'
  if (input.needsMathUnits && !input.mathUnits) errors.mathUnits = 'required'
  if (!input.schoolId) errors.school = 'school'
  if (input.schoolId === OTHER_SCHOOL && !input.otherSchool.trim()) errors.otherSchool = 'required'
  if (!input.parentName.trim()) errors.parentName = 'required'
  if (!isValidIsraeliMobile(input.parentPhone)) errors.parentPhone = 'phone'
  if (!input.consent) errors.consent = 'consent'
  return errors
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-card-padding shadow-elevation-1">
      <h2 className="text-heading-sm font-black text-card-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4 flex flex-col gap-content-gap">{children}</div>
    </section>
  )
}

function Field({
  id,
  label,
  error,
  hint,
  optional = false,
  children,
}: {
  id: string
  label: string
  error?: string | null
  hint?: string
  optional?: boolean
  children: ReactNode
}) {
  const t = useTranslations('schoolSignup')
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`school-signup-${id}`}>
        {label}
        {optional ? (
          <span className="ms-1 font-normal text-muted-foreground">{t('optional')}</span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className="text-body-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-body-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
