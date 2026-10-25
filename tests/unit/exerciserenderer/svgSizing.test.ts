import { describe, expect, it } from 'vitest'
import {
  getSvgAspectRatio,
  getSvgCardStyle,
} from '@/ui/web/exerciserenderer/blocks/SvgRenderer/svgSizing'

describe('getSvgAspectRatio', () => {
  it('reads width / height from the first svg viewBox', () => {
    expect(getSvgAspectRatio('<svg viewBox="0 0 400 200"><rect/></svg>')).toBe(2)
  })

  it('accepts comma-separated viewBox values', () => {
    expect(getSvgAspectRatio("<svg viewBox='-10,-10,300,300'></svg>")).toBe(1)
  })

  it('returns null when the viewBox is missing or degenerate', () => {
    expect(getSvgAspectRatio('<svg width="100" height="50"></svg>')).toBeNull()
    expect(getSvgAspectRatio('<svg viewBox="0 0 100 0"></svg>')).toBeNull()
    expect(getSvgAspectRatio('<svg viewBox="0 0 abc 10"></svg>')).toBeNull()
  })
})

describe('getSvgCardStyle', () => {
  it('keeps the unscaled sketch spec for full and undefined', () => {
    const expected = { width: 'min(660px, 75%)', minWidth: 'min(280px, 100%)' }
    expect(getSvgCardStyle(2, 'full')).toEqual(expected)
    expect(getSvgCardStyle(2, undefined)).toEqual(expected)
  })

  it('scales the natural width, max percent and min width together', () => {
    expect(getSvgCardStyle(2, 'medium')).toEqual({
      width: 'min(330px, 37.5%)',
      minWidth: 'min(140px, 100%)',
    })
    expect(getSvgCardStyle(2, 'xsmall')).toEqual({
      width: 'min(165px, 18.75%)',
      minWidth: 'min(70px, 100%)',
    })
  })

  it('does not stretch a tall drawing past its natural width', () => {
    expect(getSvgCardStyle(0.5, 'full')).toEqual({
      width: 'min(165px, 75%)',
      minWidth: 'min(165px, 100%)',
    })
  })

  it('ignores the authored size and the 75% cap on mobile', () => {
    expect(getSvgCardStyle(2, 'medium', true)).toEqual({
      width: 'min(660px, 100%)',
      minWidth: 'min(280px, 100%)',
    })
  })

  it('falls back to the percentage cap when the aspect ratio is unknown', () => {
    expect(getSvgCardStyle(null, 'large')).toEqual({
      width: '56.25%',
      minWidth: 'min(210px, 100%)',
    })
  })

  it('derives the width from a height cap and skips the min-width floor', () => {
    expect(getSvgCardStyle(2, 'full', true, 275)).toEqual({ width: 'min(550px, 100%)' })
    expect(getSvgCardStyle(0.5, 'full', true, 275)).toEqual({ width: 'min(138px, 100%)' })
  })

  it('keeps the percentage fallback under a height cap when the aspect is unknown', () => {
    expect(getSvgCardStyle(null, 'full', true, 275)).toEqual({
      width: '100%',
      minWidth: 'min(280px, 100%)',
    })
  })
})
