// @vitest-environment node
/**
 * Guards the accent presets in /account?section=preferences:
 *   - every preset in AccentPicker has a light and a dark block in accents.css
 *   - --primary-text (math, question badges, hint chips) stays legible on the
 *     card surface in both themes, for the default and every preset.
 *
 * Source-based: it reads the CSS and checks the declared HSL values, so a
 * preset added without dark values, or a too-dark tone, fails here.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { describe, expect, it } from 'vitest'

import { ACCENT_PRESETS } from '@/ui/web/components/accent-picker'

const here = path.dirname(fileURLToPath(import.meta.url))
const frontend = path.resolve(here, '../../src/app/(frontend)')
const read = (file: string) =>
  fs.readFileSync(path.join(frontend, file), 'utf8').replace(/\r\n/g, '\n')
const accentsCss = read('accents.css')
const globalsCss = read('globals.css')

const WCAG_AA = 4.5

function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`Missing CSS block "${selector}"`)
  return css.slice(start, css.indexOf('}', start))
}

function token(cssBlock: string, name: string): string {
  const match = cssBlock.match(new RegExp(`${name}:\\s*([^;]+);`))
  if (!match) throw new Error(`Missing ${name}`)
  return match[1].trim()
}

function luminance(hsl: string): number {
  const [h, s, l] = hsl
    .replace(/%/g, '')
    .split(/[\s,]+/)
    .map(Number)
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  const [r, g, b] = [f(0), f(8), f(4)].map((c) => {
    const v = Math.round(c * 255) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const lightTheme = block(globalsCss, ":root,\n  [data-theme='light']")
const darkTheme = block(globalsCss, "[data-theme='dark']")
const lightCard = token(lightTheme, '--card')
const darkCard = token(darkTheme, '--card')

describe('accent presets', () => {
  it('default (Burgundy) --primary-text is legible on the card in both themes', () => {
    expect(contrast(token(lightTheme, '--primary-text'), lightCard)).toBeGreaterThanOrEqual(WCAG_AA)
    expect(contrast(token(darkTheme, '--primary-text'), darkCard)).toBeGreaterThanOrEqual(WCAG_AA)
  })

  const nonDefault = ACCENT_PRESETS.filter((p) => p.id !== 'burgundy')

  it.each(nonDefault)('$name has light and dark values with legible --primary-text', ({ id }) => {
    const light = block(accentsCss, `:root[data-accent='${id}']`)
    const dark = block(accentsCss, `:root[data-accent='${id}'][data-theme='dark']`)

    for (const name of ['--primary', '--ring', '--primary-text']) {
      expect(token(light, name)).toBeTruthy()
      expect(token(dark, name)).toBeTruthy()
    }

    expect(contrast(token(light, '--primary-text'), lightCard)).toBeGreaterThanOrEqual(WCAG_AA)
    expect(contrast(token(dark, '--primary-text'), darkCard)).toBeGreaterThanOrEqual(WCAG_AA)
  })
})
