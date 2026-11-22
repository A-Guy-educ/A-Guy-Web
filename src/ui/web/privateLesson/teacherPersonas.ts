/**
 * The three teachers from the private-lesson demo, and which Admin teacher
 * profile each one stands for. The photos live in one strip
 * (`/private-lesson/teachers.webp`), so a persona is also the sprite position.
 * Names and lines are in the `teacherPersonas` translations.
 *
 * @fileType utility
 * @domain frontend
 */

export type TeacherPersona = 'detailed' | 'focused' | 'attentive'

export const TEACHER_PERSONAS: readonly TeacherPersona[] = ['detailed', 'focused', 'attentive']

/** Teacher profile slug (Admin → Teacher Profiles) behind each demo teacher. */
export const PERSONA_PROFILE_SLUG: Record<TeacherPersona, string> = {
  detailed: 'teacher_patient',
  focused: 'teacher_focused',
  attentive: 'teacher_challenging',
}

/**
 * The persona for a profile slug. A profile the demo doesn't know gets a photo
 * by its position in the list, so a new profile still shows a face.
 */
export function personaForSlug(slug: string | null | undefined, index = 0): TeacherPersona {
  const known = TEACHER_PERSONAS.find((persona) => PERSONA_PROFILE_SLUG[persona] === slug)
  return known ?? TEACHER_PERSONAS[index % TEACHER_PERSONAS.length]
}

/** True when the slug is one of the three demo teachers (so the demo's name applies). */
export function isPersonaSlug(slug: string | null | undefined): boolean {
  return TEACHER_PERSONAS.some((persona) => PERSONA_PROFILE_SLUG[persona] === slug)
}
