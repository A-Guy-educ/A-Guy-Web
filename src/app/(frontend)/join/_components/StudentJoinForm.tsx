'use client'

/**
 * Student join form: school → class, then "קדימה". Signed-out students go
 * through Google sign-in and come back here to finish; the class is then added
 * to their account and they land on the class's course.
 *
 * @fileType component
 * @domain classroom
 */

import { ArrowRight, Loader2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/ui/web/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/web/components/select'
import { useTranslations } from '@/ui/web/providers/I18n'
import type { JoinableSchool } from '@/server/services/classroom/class-enrollment'

import {
  GOOGLE_SIGN_IN_HREF,
  RESUME_PARAM,
  requestEnroll,
  savePendingClass,
  takePendingClass,
} from '../_lib/join-enrollment'
import { JoinField, fieldClass, fieldId } from './JoinField'

type Problem = 'classNotFound' | 'failed'

export function StudentJoinForm({ schools }: { schools: JoinableSchool[] }) {
  const t = useTranslations('studentJoin')

  const [schoolId, setSchoolId] = useState('')
  const [classId, setClassId] = useState('')
  const [missing, setMissing] = useState<'school' | 'class' | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [problem, setProblem] = useState<Problem | null>(null)

  const school = schools.find((s) => s.id === schoolId)

  const join = async (id: string, afterSignIn: boolean) => {
    setIsBusy(true)
    setProblem(null)
    try {
      const outcome = await requestEnroll(id)
      // Leaving the page: keep the spinner up until the navigation lands.
      if (outcome.kind === 'enrolled') {
        window.location.assign(outcome.courseHref)
        return
      }
      if (outcome.kind === 'signInRequired' && !afterSignIn) {
        savePendingClass(id)
        window.location.assign(GOOGLE_SIGN_IN_HREF)
        return
      }
      setProblem(outcome.kind === 'classNotFound' ? 'classNotFound' : 'failed')
    } catch {
      setProblem('failed')
    }
    setIsBusy(false)
  }

  // Back from Google sign-in: finish the join the student started.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has(RESUME_PARAM)) return
    window.history.replaceState(null, '', window.location.pathname)
    const pending = takePendingClass()
    const owner = pending && schools.find((s) => s.classes.some((c) => c.id === pending))
    if (!pending || !owner) return
    setSchoolId(owner.id)
    setClassId(pending)
    void join(pending, true)
    // Runs once on mount; `join` and `schools` are stable for this purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const firstMissing = !schoolId ? 'school' : !classId ? 'class' : null
    setMissing(firstMissing)
    if (firstMissing) {
      document.getElementById(fieldId(firstMissing))?.focus()
      return
    }
    void join(classId, false)
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-content-gap rounded-2xl bg-card p-card-padding shadow-elevation-1"
    >
      <JoinField
        fieldKey="school"
        label={t('fields.school')}
        error={missing === 'school' && t('errors.school')}
      >
        <Select
          value={schoolId}
          onValueChange={(v) => {
            setSchoolId(v)
            setClassId('')
            setMissing(null)
          }}
        >
          <SelectTrigger id={fieldId('school')} className={fieldClass(missing === 'school')}>
            <SelectValue placeholder={t('placeholders.school')} />
          </SelectTrigger>
          <SelectContent>
            {schools.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </JoinField>

      <JoinField
        fieldKey="class"
        label={t('fields.class')}
        error={missing === 'class' && t('errors.class')}
      >
        <Select
          value={classId}
          disabled={!school}
          onValueChange={(v) => {
            setClassId(v)
            setMissing(null)
          }}
        >
          <SelectTrigger id={fieldId('class')} className={fieldClass(missing === 'class')}>
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
      </JoinField>

      <Button
        type="submit"
        disabled={isBusy}
        className="mt-1 h-14 w-full gap-content-gap-xs rounded-xl text-heading-md font-bold"
      >
        {isBusy ? (
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

      {problem ? (
        <p role="status" className="text-center text-body-sm text-destructive">
          {t(`result.${problem}`)}
        </p>
      ) : null}
    </form>
  )
}
