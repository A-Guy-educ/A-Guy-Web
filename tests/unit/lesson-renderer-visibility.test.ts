/**
 * @fileType unit-test
 * @domain lessons
 * @pattern visible-renderers, dual-mode
 * @ai-summary Unit tests for the renderer-visibility helper functions used in
 *             DualModeLessonView: getVisibleTabs and resolveEffectiveMode.
 *             Imports the real implementations so behaviour changes are actually
 *             exercised (the earlier inlined mirrors let a regression slip
 *             through when 'chat' was added as a first-class mode).
 */
import { describe, expect, it } from 'vitest'
import { getVisibleTabs } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/DualModeLessonView'
import { resolveEffectiveMode } from '@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/DualModeLessonView/useLessonViewMode'

describe('getVisibleTabs', () => {
  it('shows all five when all allowed and hasMedia=true', () => {
    const result = getVisibleTabs(['media', 'pdf', 'interactive', 'test', 'chat'], true)
    expect(result).toEqual({
      media: true,
      pdf: true,
      interactive: true,
      test: true,
      chat: true,
    })
  })

  it('hides media tab when hasMedia=false even if media is in visibleRenderers', () => {
    const result = getVisibleTabs(['media', 'pdf', 'interactive', 'test'], false)
    expect(result).toEqual({
      media: false,
      pdf: true,
      interactive: true,
      test: true,
      chat: false,
    })
  })

  it('defaults to the four legacy tabs when visibleRenderers is undefined (chat opt-in)', () => {
    // 'chat' is intentionally excluded from the default allowlist so legacy
    // lessons don't surface the demo chat renderer.
    const result = getVisibleTabs(undefined, true)
    expect(result).toEqual({
      media: true,
      pdf: true,
      interactive: true,
      test: true,
      chat: false,
    })
  })

  it('returns all false when visibleRenderers is empty array', () => {
    const result = getVisibleTabs([], true)
    expect(result).toEqual({
      media: false,
      pdf: false,
      interactive: false,
      test: false,
      chat: false,
    })
  })

  it('respects partial selection: pdf only', () => {
    const result = getVisibleTabs(['pdf'], true)
    expect(result).toEqual({
      media: false,
      pdf: true,
      interactive: false,
      test: false,
      chat: false,
    })
  })

  it('respects partial selection: media + interactive (no pdf)', () => {
    const result = getVisibleTabs(['media', 'interactive'], true)
    expect(result).toEqual({
      media: true,
      pdf: false,
      interactive: true,
      test: false,
      chat: false,
    })
  })

  it('respects partial selection: chat only', () => {
    const result = getVisibleTabs(['chat'], true)
    expect(result).toEqual({
      media: false,
      pdf: false,
      interactive: false,
      test: false,
      chat: true,
    })
  })

  it('media + pdf (no interactive) with hasMedia=true', () => {
    const result = getVisibleTabs(['media', 'pdf'], true)
    expect(result).toEqual({
      media: true,
      pdf: true,
      interactive: false,
      test: false,
      chat: false,
    })
  })

  it('shows test tab when test is in visibleRenderers alongside other tabs', () => {
    const result = getVisibleTabs(['pdf', 'interactive', 'test'], false)
    expect(result).toEqual({
      media: false,
      pdf: true,
      interactive: true,
      test: true,
      chat: false,
    })
  })

  it('shows chat tab when admin opts in', () => {
    const result = getVisibleTabs(['pdf', 'chat'], false)
    expect(result).toEqual({
      media: false,
      pdf: true,
      interactive: false,
      test: false,
      chat: true,
    })
  })
})

describe('resolveEffectiveMode', () => {
  it('returns stored mode when it is in allowedModes', () => {
    expect(resolveEffectiveMode('pdf', ['media', 'pdf', 'interactive', 'test', 'chat'])).toBe('pdf')
    expect(resolveEffectiveMode('media', ['media', 'pdf', 'interactive', 'test', 'chat'])).toBe(
      'media',
    )
    expect(
      resolveEffectiveMode('interactive', ['media', 'pdf', 'interactive', 'test', 'chat']),
    ).toBe('interactive')
    expect(resolveEffectiveMode('test', ['media', 'pdf', 'interactive', 'test', 'chat'])).toBe(
      'test',
    )
    expect(resolveEffectiveMode('chat', ['media', 'pdf', 'interactive', 'test', 'chat'])).toBe(
      'chat',
    )
  })

  it('prefers chat first in the priority fallback when stored is not in allowedModes', () => {
    // Priority list starts with 'chat' — if chat is allowed, it wins over anything else.
    expect(resolveEffectiveMode('pdf', ['media', 'interactive', 'chat'])).toBe('chat')
    expect(resolveEffectiveMode('media', ['pdf', 'chat'])).toBe('chat')
  })

  it('falls back to media when chat is not allowed', () => {
    expect(resolveEffectiveMode('pdf', ['media', 'interactive'])).toBe('media')
  })

  it('falls back to pdf when chat and media are not allowed', () => {
    expect(resolveEffectiveMode('media', ['pdf', 'interactive'])).toBe('pdf')
  })

  it('returns interactive when only interactive and test are allowed', () => {
    expect(resolveEffectiveMode('pdf', ['interactive', 'test'])).toBe('interactive')
  })

  it('returns test when only test is in allowedModes', () => {
    expect(resolveEffectiveMode('media', ['test'])).toBe('test')
  })

  it('returns chat as ultimate fallback when no modes are allowed', () => {
    expect(resolveEffectiveMode('pdf', [])).toBe('chat')
  })

  it('honours stored mode when allowedModes is undefined; defaults to chat when stored is null', () => {
    expect(resolveEffectiveMode('pdf', undefined)).toBe('pdf')
    expect(resolveEffectiveMode('media', undefined)).toBe('media')
    expect(resolveEffectiveMode('interactive', undefined)).toBe('interactive')
    expect(resolveEffectiveMode('test', undefined)).toBe('test')
    expect(resolveEffectiveMode('chat', undefined)).toBe('chat')
    expect(resolveEffectiveMode(null, undefined)).toBe('chat')
  })

  it('returns chat first when stored is null and chat is allowed', () => {
    expect(resolveEffectiveMode(null, ['media', 'pdf', 'interactive', 'chat'])).toBe('chat')
    expect(resolveEffectiveMode(null, ['chat'])).toBe('chat')
  })

  it('returns first-allowed non-chat mode when stored is null and chat is disabled', () => {
    expect(resolveEffectiveMode(null, ['media', 'pdf'])).toBe('media')
    expect(resolveEffectiveMode(null, ['pdf'])).toBe('pdf')
    expect(resolveEffectiveMode(null, ['interactive'])).toBe('interactive')
    expect(resolveEffectiveMode(null, ['test'])).toBe('test')
  })

  it('applies priority fallback when stored is not in allowedModes', () => {
    // Stored is 'interactive', but allowedModes only has 'media' — priority fallback applies
    expect(resolveEffectiveMode('interactive', ['media'])).toBe('media')
  })
})
