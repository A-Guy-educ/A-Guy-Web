'use client'

import { Fragment, useState } from 'react'

import {
  PERSONA_PROFILE_SLUG,
  TEACHER_PERSONAS,
  type TeacherPersona,
} from '@/ui/web/privateLesson/teacherPersonas'

import { fill, startWithTeacherHref, type Translate } from './landingShared'

/**
 * "איזה מורה מתאים לכם?" — three teacher cards and a big portrait with the
 * picked teacher's line. Continuing opens /start on the class step.
 */
export function LandingTeachers({ t, tp }: { t: Translate; tp: Translate }) {
  const [picked, setPicked] = useState<TeacherPersona>('detailed')
  const name = tp(`${picked}.name`)
  const quoteLines = tp(`${picked}.quote`).split('\n')

  return (
    <section className="mentors wrap" id="teachers" aria-labelledby="mentors-title">
      <div className="mentor-copy">
        <h2 id="mentors-title">{t('teachers.title')}</h2>
        <p className="section-copy">{t('teachers.description')}</p>
        <div className="mentor-picks" role="group" aria-label={t('teachers.pickLabel')}>
          {TEACHER_PERSONAS.map((persona) => (
            <button
              key={persona}
              type="button"
              className="mentor-pick"
              aria-pressed={picked === persona}
              onClick={() => setPicked(persona)}
            >
              <span className="pl-avatar" data-teacher={persona} aria-hidden="true" />
              <strong>{tp(`${persona}.name`)}</strong>
              <span>{tp(`${persona}.tagline`)}</span>
            </button>
          ))}
        </div>
        <a className="mentor-start" href={startWithTeacherHref(PERSONA_PROFILE_SLUG[picked])}>
          {t('teachers.continue')}
        </a>
      </div>

      <div className="hero-visual">
        <div className="portrait-field">
          <span className="scribble">{t('teachers.hello')}</span>
          <div
            className="pl-avatar hero-teacher"
            data-teacher={picked}
            role="img"
            aria-label={fill(t('teachers.portraitLabel'), { name })}
          />
          <div className="name-tag">
            <b>{name}</b>
            <span>{tp(`${picked}.tagline`)}.</span>
          </div>
        </div>
        <div className="speech">
          <span className="quote-mark" aria-hidden="true">
            ״
          </span>
          <p>
            {quoteLines.map((line, index) => (
              <Fragment key={index}>
                {index > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </p>
        </div>
      </div>
    </section>
  )
}
