'use client'

import { GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { PRIMARY_CTA_CLASS, SectionHeading, START_PAGE_HREF, type Translate } from './landingShared'

interface TeacherCard {
  slug: string
  label: string
  description: string
}

/**
 * Picking a teacher continues in /start with that teacher preselected, which
 * goes straight to choosing a course and only then asks the visitor to sign in.
 */
export function LandingTeachers({ t }: { t: Translate }) {
  const [teachers, setTeachers] = useState<TeacherCard[] | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/teacher-profiles', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { profiles: [] }))
      .then((data: { profiles?: TeacherCard[] }) => setTeachers(data.profiles ?? []))
      .catch(() => {
        if (!controller.signal.aborted) setTeachers([])
      })
    return () => controller.abort()
  }, [])

  return (
    <section id="teachers" className="scroll-mt-20 px-4 py-section-xl">
      <div className="mx-auto max-w-6xl">
        <SectionHeading title={t('teachers.title')} description={t('teachers.description')} />

        {teachers === null && (
          <div className="grid gap-content-gap-lg md:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        )}

        {teachers?.length === 0 && (
          <div className="text-center">
            <p className="mb-4 text-body-lg text-muted-foreground">{t('teachers.empty')}</p>
            <Link href={START_PAGE_HREF} className={PRIMARY_CTA_CLASS}>
              {t('teachers.startAnyway')}
            </Link>
          </div>
        )}

        {teachers && teachers.length > 0 && (
          <ul className="grid gap-content-gap-lg md:grid-cols-3">
            {teachers.map((teacher) => (
              <li key={teacher.slug}>
                <Link
                  href={`${START_PAGE_HREF}?teacher=${encodeURIComponent(teacher.slug)}`}
                  className="group flex h-full flex-col items-center rounded-3xl border border-border bg-card p-card-padding text-center shadow-elevation-1 transition-all duration-normal hover:-translate-y-1 hover:border-primary hover:shadow-elevation-3"
                >
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <GraduationCap className="h-10 w-10 text-primary" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-heading-xl font-bold text-foreground">
                    {teacher.label}
                  </h3>
                  {teacher.description && (
                    <p className="mt-2 flex-1 text-body-md text-muted-foreground">
                      {teacher.description}
                    </p>
                  )}
                  <span className="mt-5 rounded-full bg-primary px-5 py-2 text-body-sm font-bold text-primary-foreground transition-opacity group-hover:opacity-90">
                    {t('teachers.choose')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
