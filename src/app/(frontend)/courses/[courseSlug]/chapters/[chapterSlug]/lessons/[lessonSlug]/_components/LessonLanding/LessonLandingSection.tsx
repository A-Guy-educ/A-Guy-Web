import type { ReactNode } from 'react'

interface LessonLandingSectionProps {
  id: string
  title: string
  subtitle?: string
  children: ReactNode
}

export function LessonLandingSection({ id, title, subtitle, children }: LessonLandingSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6">
      <div className="mb-content-gap-sm">
        <h2 id={`${id}-title`} className="text-heading-xl font-semibold text-foreground">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-body-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}
