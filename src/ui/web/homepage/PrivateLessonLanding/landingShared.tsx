/**
 * Pieces shared by the private-lesson landing sections: where the CTAs go,
 * `{token}` filling for copy (the I18n provider has no interpolation), and
 * the demo's centered section heading.
 *
 * @fileType utility
 * @domain frontend
 */

/** Start CTAs open the /start card: teacher → class → sign-in. */
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

/** /start with the landing's teacher preselected, so the card opens on the class step. */
export function startWithTeacherHref(slug: string): string {
  return `${START_PAGE_HREF}?teacher=${encodeURIComponent(slug)}`
}

export function SectionHeading({
  id,
  title,
  description,
}: {
  id?: string
  title: string
  description: string
}) {
  return (
    <div className="section-heading">
      <h2 id={id}>{title}</h2>
      <p className="section-copy">{description}</p>
    </div>
  )
}
