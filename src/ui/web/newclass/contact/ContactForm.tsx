'use client'

import type { FormEvent } from 'react'

import { btn } from '../newclassStyles'
import { CONTACT_ROLES, CONTACT_TOPICS, type ContactTopic } from './contactOptions'

interface ContactFormProps {
  initialTopic: ContactTopic
  onSubmitted: () => void
}

const label = 'flex flex-col gap-1.5 text-[15px] font-medium'
const field =
  'rounded-[10px] border border-nc-mock-line bg-white p-3 text-base text-nc-ink focus-visible:outline-2 focus-visible:outline-nc-brand-light'

// Not wired to a backend yet: submitting only shows the thank-you state,
// matching the preview version of the page.
export function ContactForm({ initialTopic, onSubmitted }: ContactFormProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSubmitted()
  }

  return (
    <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
      <label className={label}>
        שם מלא
        <input className={field} type="text" name="name" required autoFocus />
      </label>
      <label className={label}>
        אני
        <select className={field} name="role">
          {CONTACT_ROLES.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </select>
      </label>
      <label className={label}>
        בית ספר / יישוב
        <input className={field} type="text" name="school" />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className={`${label} flex-[1_1_180px]`}>
          טלפון
          <input className={field} type="tel" name="phone" dir="ltr" />
        </label>
        <label className={`${label} flex-[1_1_180px]`}>
          מייל
          <input className={field} type="email" name="email" dir="ltr" />
        </label>
      </div>
      <label className={label}>
        מה מעניין אתכם?
        <select className={field} name="topic" defaultValue={initialTopic}>
          {CONTACT_TOPICS.map((topic) => (
            <option key={topic}>{topic}</option>
          ))}
        </select>
      </label>
      <label className={label}>
        הודעה (לא חובה)
        <textarea className={field} name="message" rows={3} />
      </label>
      <button type="submit" className={btn.brand}>
        שליחה
      </button>
    </form>
  )
}
