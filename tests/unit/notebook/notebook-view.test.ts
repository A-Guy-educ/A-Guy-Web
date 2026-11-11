// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useInkPalette } from '@/ui/web/notebook/LessonNotebook/useInkPalette'
import { MAX_ZOOM, usePinchZoom } from '@/ui/web/notebook/LessonNotebook/usePinchZoom'

describe('useInkPalette', () => {
  const style = document.createElement('style')
  style.textContent = `
    [data-theme='light'] { --notebook-ink-1: 0 0% 0%; }
    [data-theme='dark'] { --notebook-ink-1: 0 0% 96%; }
  `

  afterEach(() => {
    style.remove()
    delete document.documentElement.dataset.theme
  })

  it('uses dark-page inks on screen but light inks for paper, and follows the theme', async () => {
    document.head.append(style)
    document.documentElement.dataset.theme = 'dark'
    const { result } = renderHook(() => useInkPalette())

    await waitFor(() => expect(result.current.inks[0]).toBe('hsl(0 0% 96%)'))
    expect(result.current.paperInks[0]).toBe('hsl(0 0% 0%)')

    act(() => {
      document.documentElement.dataset.theme = 'light'
    })
    await waitFor(() => expect(result.current.inks[0]).toBe('hsl(0 0% 0%)'))
  })
})

describe('usePinchZoom', () => {
  function setup() {
    const area = document.createElement('div')
    const content = document.createElement('div')
    area.append(content)
    document.body.append(area)
    const hook = renderHook(() => usePinchZoom({ current: area }, { current: content }))
    return { area, hook }
  }

  const wheel = (area: HTMLElement, deltaY: number, ctrlKey = true) => {
    const event = new WheelEvent('wheel', { deltaY, ctrlKey, cancelable: true })
    area.dispatchEvent(event)
    return event
  }

  it('zooms the notebook on a trackpad pinch instead of the page', async () => {
    const { area, hook } = setup()
    const event = wheel(area, -50)
    expect(event.defaultPrevented).toBe(true)
    await waitFor(() => expect(hook.result.current).toBeGreaterThan(1))
  })

  it('stays between 100% and the maximum', async () => {
    const { area, hook } = setup()
    wheel(area, -10_000)
    await waitFor(() => expect(hook.result.current).toBe(MAX_ZOOM))
    wheel(area, 10_000)
    await waitFor(() => expect(hook.result.current).toBe(1))
  })

  it('leaves plain scrolling alone', () => {
    const { area, hook } = setup()
    expect(wheel(area, 100, false).defaultPrevented).toBe(false)
    expect(hook.result.current).toBe(1)
  })
})
