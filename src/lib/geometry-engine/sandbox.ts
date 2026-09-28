/**
 * Sandbox state model — what a user is building in the "Setup" phase before
 * they start proving.
 */
import type { Fact } from './types'

export interface PlacedPoint {
  name: string
  x: number
  y: number
}

export interface Sandbox {
  points: PlacedPoint[]
  givens: Fact[]
  goal: Fact | null
}

export function emptySandbox(): Sandbox {
  return { points: [], givens: [], goal: null }
}

/** Next unused single-uppercase-letter name, in A..Z order. */
export function nextPointName(points: readonly PlacedPoint[]): string {
  const used = new Set(points.map((p) => p.name))
  for (let c = 65; c <= 90; c++) {
    const n = String.fromCharCode(c)
    if (!used.has(n)) return n
  }
  return `P${points.length}` // fallback if the alphabet is exhausted
}

export function pointByName(points: readonly PlacedPoint[], name: string): PlacedPoint | undefined {
  return points.find((p) => p.name === name)
}
