/**
 * @fileType component
 * @domain progress
 * @pattern learning-state-seed
 * @ai-summary Renders nothing; on the first client render it writes the student's server-side learning state into localStorage so the lesson components below it read the student's own progress on any computer.
 *
 * Gotcha: must render BEFORE the lesson components in the tree. Seeding runs
 * during render (lazy state init), and React renders in tree order, so
 * siblings after it see the seeded cache in their own lazy initialisers.
 */

'use client'

import { useState } from 'react'

import type { LearningStateRef, LearningStateValue } from '@/infra/learning-state/refs'

import { seedLearningState } from './learningStateSync'

interface LearningStateSeederProps {
  refs: LearningStateRef[]
  states: Record<string, LearningStateValue>
}

export function LearningStateSeeder({ refs, states }: LearningStateSeederProps) {
  useState(() => seedLearningState(refs, states))
  return null
}
