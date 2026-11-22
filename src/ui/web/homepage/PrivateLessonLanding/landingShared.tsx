/**
 * Pieces shared by the private-lesson landing sections: where the CTAs go,
 * `{token}` filling for copy (the I18n provider has no interpolation), and
 * the section heading.
 *
 * @fileType utility
 * @domain frontend
 */

/** Every "start" CTA scrolls to the teacher picker: teacher → course → sign-in. */
export const START_HREF = '#teachers'
export const START_PAGE_HREF = '/start'
export const SUBSCRIPTIONS_HREF = '/subscriptions'
/** Aguy's WhatsApp line for fit calls with a teacher (from the boss's landing demo). */
export const WHATSAPP_NUMBER = '972546608920'

export type Translate = (key: string) => string

export function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  )
}

export function whatsappHref(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export function SectionHeading({
  id,
  title,
  description,
}: {
  id?: string
  title: string
  description?: string
}) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      <h2 id={id} className="text-display-sm font-extrabold text-foreground md:text-display-md">
        {title}
      </h2>
      {description && <p className="mt-3 text-heading-lg text-muted-foreground">{description}</p>}
    </div>
  )
}

export const PRIMARY_CTA_CLASS =
  'inline-flex items-center justify-center gap-content-gap-xs rounded-full bg-primary px-8 py-3 text-heading-md font-bold text-primary-foreground shadow-elevation-2 transition-transform duration-normal hover:-translate-y-0.5 hover:bg-primary/90'

export const SECONDARY_CTA_CLASS =
  'inline-flex items-center justify-center gap-content-gap-xs rounded-full border border-border bg-card px-6 py-2.5 text-body-md font-semibold text-foreground transition-colors duration-normal hover:bg-muted'
