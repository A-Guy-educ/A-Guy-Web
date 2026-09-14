'use client'

import {
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  ClipboardCheck,
  MessageCircle,
  Play,
  Sparkles,
  Star,
  Table2,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, type ReactNode } from 'react'

import telescopeSvg from '@/brands/aguy/assets/telescope.svg'
import { LanguageSwitcher } from '@/ui/web/LanguageSwitcher'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'
import { ThemeSelector } from '@/ui/web/providers/Theme/ThemeSelector'

type ComparisonKey = 'personal' | 'plan' | 'experience' | 'emotional' | 'cost' | 'availability'
type FeatureKey = 'lessons' | 'exercises' | 'exams' | 'teacher' | 'plan' | 'emotional'

const comparisonRows: ComparisonKey[] = [
  'personal',
  'plan',
  'experience',
  'emotional',
  'cost',
  'availability',
]

const featureKeys: FeatureKey[] = ['lessons', 'exercises', 'exams', 'teacher', 'plan', 'emotional']

const featureIcons: Record<FeatureKey, LucideIcon> = {
  lessons: BookOpen,
  exercises: Table2,
  exams: ClipboardCheck,
  teacher: MessageCircle,
  plan: CalendarDays,
  emotional: Star,
}

export function DemoLandingPage() {
  const locale = useLocale()
  const t = useTranslations('landingPage')
  const isRtl = locale === 'he'

  useEffect(() => {
    document.body.classList.add('landing-page')
    return () => document.body.classList.remove('landing-page')
  }, [])

  return (
    <main
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/20 selection:text-primary"
    >
      <div className="fixed left-4 top-4 z-50 flex items-center gap-content-gap-xs rounded-xl border border-border bg-card/90 p-1 shadow-elevation-1 backdrop-blur">
        <LanguageSwitcher />
        <ThemeSelector />
      </div>

      <Hero t={t} />
      <ValueProp t={t} />
      <Comparison t={t} />
      <Features t={t} />
      <BottomCta t={t} />
    </main>
  )
}

function Hero({ t }: { t: (key: string) => string }) {
  return (
    <section className="relative flex flex-col items-center overflow-hidden border-b border-border bg-background px-4 pb-16 pt-20 text-center md:pt-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[520px] max-w-5xl rounded-full bg-primary/10 blur-3xl" />
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center">
        <Image
          src={telescopeSvg}
          alt="Aguy"
          width={160}
          height={160}
          className="mb-8 h-28 w-auto drop-shadow-elevation-3 md:h-36"
          priority
        />

        <h1 className="mb-4 max-w-3xl text-display-md font-extrabold leading-tight text-foreground md:text-display-lg">
          {t('hero.headline')}
        </h1>
        <p className="mb-8 max-w-2xl text-heading-lg font-medium text-muted-foreground">
          {t('hero.subheadline')}
        </p>

        <p className="mb-2 text-heading-md font-bold text-primary">{t('hero.brand')}</p>
        <p className="mb-6 max-w-2xl text-body-lg font-bold text-foreground">{t('hero.role')}</p>
        <p className="mx-auto mb-10 max-w-2xl text-body-md leading-relaxed text-muted-foreground">
          {t('hero.pitch')}
        </p>

        <div className="flex flex-col items-center gap-content-gap">
          <Link
            href="/start"
            className="flex flex-col items-center rounded-full bg-primary px-10 py-3 text-primary-foreground shadow-elevation-2 transition-transform duration-normal hover:-translate-y-0.5 hover:bg-primary/90"
          >
            <span className="flex items-center gap-content-gap-xs text-heading-md font-bold">
              <Play className="h-4 w-4 fill-current" aria-hidden />
              {t('hero.trialCta')}
            </span>
            <span className="mt-1 text-body-xs font-normal opacity-80">
              {t('hero.trialCtaNote')}
            </span>
          </Link>
          <Link
            href="/login"
            className="text-body-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors duration-normal hover:text-primary"
          >
            {t('hero.loginCta')}
          </Link>
        </div>
      </div>
    </section>
  )
}

function ValueProp({ t }: { t: (key: string) => string }) {
  return (
    <section className="bg-background px-4 py-section-lg">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-card-padding shadow-elevation-2 text-center md:p-card-padding-lg">
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-primary/10" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-24 rounded-tr-full bg-primary/10" />
          <h2 className="mb-6 text-display-sm font-bold text-foreground md:text-display-md">
            {t('value.title')}
          </h2>
          <p className="mx-auto mb-6 max-w-3xl text-body-lg leading-relaxed text-muted-foreground">
            {t('value.paragraph1Prefix')}
            <strong className="text-foreground">{t('value.paragraph1Bold')}</strong>
          </p>
          <p className="mx-auto max-w-3xl text-body-lg leading-relaxed text-muted-foreground">
            {t('value.paragraph2')}
          </p>
        </div>
      </div>
    </section>
  )
}

function Comparison({ t }: { t: (key: string) => string }) {
  return (
    <section className="bg-muted/30 px-4 py-section-xl">
      <div className="mx-auto max-w-6xl">
        <SectionHeader title={t('comparison.title')} description={t('comparison.description')} />

        <div className="grid grid-cols-1 items-stretch gap-content-gap-xl md:grid-cols-2">
          <ComparisonCard
            title={t('comparison.aguy')}
            icon={<Bot className="h-6 w-6" />}
            highlighted
          >
            {comparisonRows.map((row) => (
              <ComparisonItem
                key={row}
                positive
                label={t(`comparison.rows.${row}.label`)}
                value={t(`comparison.rows.${row}.aguy`)}
              />
            ))}
          </ComparisonCard>

          <ComparisonCard title={t('comparison.tutor')} icon={<UserRound className="h-6 w-6" />}>
            {comparisonRows.map((row) => (
              <ComparisonItem
                key={row}
                positive={row === 'emotional'}
                warning={row === 'experience'}
                label={t(`comparison.rows.${row}.label`)}
                value={t(`comparison.rows.${row}.tutor`)}
              />
            ))}
          </ComparisonCard>
        </div>
      </div>
    </section>
  )
}

function Features({ t }: { t: (key: string) => string }) {
  return (
    <section className="bg-background px-4 py-section-xl">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="text-display-sm font-extrabold text-foreground md:text-display-md">
            {t('features.title')}
          </h2>
        </div>

        <div className="grid gap-content-gap-lg md:grid-cols-2 lg:grid-cols-3">
          {featureKeys.map((key) => {
            const Icon = featureIcons[key]

            return (
              <div
                key={key}
                className="rounded-2xl border border-border bg-muted/40 p-card-padding transition-all duration-normal hover:-translate-y-0.5 hover:shadow-elevation-2"
              >
                <div className="mb-4 text-heading-xl text-primary">
                  <Icon className="h-7 w-7" aria-hidden />
                </div>
                <h3 className="mb-2 text-heading-xl font-bold text-foreground">
                  {t(`features.items.${key}.title`)}
                </h3>
                <p className="text-body-sm text-muted-foreground">
                  {t(`features.items.${key}.description`)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function BottomCta({ t }: { t: (key: string) => string }) {
  return (
    <section className="bg-primary px-4 py-section-xl text-center text-primary-foreground">
      <h2 className="mb-4 text-display-sm font-extrabold md:text-display-lg">{t('cta.title')}</h2>
      <p className="mx-auto mb-8 max-w-2xl text-heading-lg text-primary-foreground/80">
        {t('cta.description')}
      </p>
      <div className="flex flex-col items-center gap-content-gap">
        <Link
          href="/start"
          className="flex flex-col items-center rounded-full bg-primary-foreground px-10 py-3 text-primary shadow-elevation-2 transition-transform duration-normal hover:-translate-y-0.5"
        >
          <span className="text-heading-md font-bold">{t('cta.trial')}</span>
          <span className="mt-1 text-body-xs font-normal opacity-80">{t('cta.trialNote')}</span>
        </Link>
        <Link
          href="/login"
          className="text-body-sm font-medium text-primary-foreground/80 underline underline-offset-4 transition-colors duration-normal hover:text-primary-foreground"
        >
          {t('cta.loginCta')}
        </Link>
      </div>
    </section>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto mb-14 max-w-3xl text-center">
      <h2 className="mb-4 text-display-sm font-extrabold md:text-display-md">{title}</h2>
      <p className="text-heading-lg text-muted-foreground">{description}</p>
    </div>
  )
}

function ComparisonCard({
  title,
  icon,
  children,
  highlighted = false,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
  highlighted?: boolean
}) {
  return (
    <div
      className={
        highlighted
          ? 'relative overflow-hidden rounded-3xl border-2 border-primary bg-card p-card-padding shadow-elevation-3'
          : 'rounded-3xl border border-border bg-card p-card-padding shadow-elevation-1'
      }
    >
      <div
        className={
          highlighted
            ? 'mb-6 flex items-center gap-content-gap-sm text-primary'
            : 'mb-6 flex items-center gap-content-gap-sm text-muted-foreground'
        }
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">{icon}</div>
        <h3 className="text-heading-xl font-bold text-foreground">{title}</h3>
      </div>
      <ul className="space-y-5">{children}</ul>
    </div>
  )
}

function ComparisonItem({
  positive,
  warning = false,
  label,
  value,
}: {
  positive: boolean
  warning?: boolean
  label: string
  value: string
}) {
  const Icon = positive ? Check : warning ? Sparkles : X

  return (
    <li className="flex items-start gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0">
      <Icon
        className={
          positive
            ? 'mt-0.5 h-5 w-5 shrink-0 text-success'
            : warning
              ? 'mt-0.5 h-5 w-5 shrink-0 text-warning'
              : 'mt-0.5 h-5 w-5 shrink-0 text-destructive'
        }
        strokeWidth={positive ? 3 : 2.5}
        aria-hidden
      />
      <div>
        <strong className="block text-body-md text-foreground">{label}</strong>
        <span className="text-body-sm text-muted-foreground">{value}</span>
      </div>
    </li>
  )
}
