/**
 * The teacher's round portrait from the demo's welcome screen. Every 11
 * seconds it says a quiet hello; "החופר" waves from his own pose frames
 * (`detailed-motion.webp`) and winks when clicked. Reduced motion keeps it still.
 *
 * @fileType component
 * @domain frontend
 */
'use client'

import { useEffect, useState } from 'react'

import type { TeacherPersona } from './teacherPersonas'

import './private-lesson.css'

const HELLO_EVERY_MS = 11000

type Motion = 'quiet-hello' | 'wink-hello' | null

interface TutorPortraitProps {
  persona: TeacherPersona
  /** Spoken name, e.g. "המורה שבחרתם — החופר". */
  label: string
  /** Wink hint for the clickable portrait. */
  winkTitle: string
  /** A first hello this long after mounting (the demo greets as the welcome arrives). */
  greetAfterMs?: number
}

export function TutorPortrait({ persona, label, winkTitle, greetAfterMs }: TutorPortraitProps) {
  const [motion, setMotion] = useState<Motion>(null)
  const canWink = persona === 'detailed'

  useEffect(() => {
    const hello = () => {
      if (!document.hidden) setMotion('quiet-hello')
    }
    const first = greetAfterMs === undefined ? undefined : window.setTimeout(hello, greetAfterMs)
    const timer = window.setInterval(hello, HELLO_EVERY_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [greetAfterMs])

  const wink = () => setMotion('wink-hello')

  return (
    <div
      className={['pl-avatar pl-portrait', motion].filter(Boolean).join(' ')}
      data-teacher={persona}
      role={canWink ? 'button' : 'img'}
      aria-label={label}
      title={canWink ? winkTitle : undefined}
      tabIndex={canWink ? 0 : undefined}
      onClick={canWink ? wink : undefined}
      onKeyDown={
        canWink
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                wink()
              }
            }
          : undefined
      }
      onAnimationEnd={() => setMotion(null)}
    />
  )
}
