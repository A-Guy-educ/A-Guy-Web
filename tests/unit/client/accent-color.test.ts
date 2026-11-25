// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import {
  ACCENT_PRESET_IDS,
  ACCENT_STORAGE_KEY,
  accentInitScript,
} from '@/client/state/localStorage/accentColor'
import { ACCENT_PRESETS } from '@/ui/web/components/accent-picker'

const runInitScript = () => new Function(accentInitScript())()

afterEach(() => {
  window.localStorage.clear()
  delete document.documentElement.dataset.accent
})

describe('accentInitScript', () => {
  it('applies the saved system color before the picker ever mounts', () => {
    window.localStorage.setItem(ACCENT_STORAGE_KEY, '1')
    runInitScript()
    expect(document.documentElement.dataset.accent).toBe('ocean')
  })

  it('leaves the default (Burgundy), an unknown index and junk alone', () => {
    for (const saved of ['0', '42', 'pink']) {
      window.localStorage.setItem(ACCENT_STORAGE_KEY, saved)
      runInitScript()
      expect(document.documentElement.dataset.accent).toBeUndefined()
    }
  })

  it("reads the picker's preset order", () => {
    expect(ACCENT_PRESETS.map((preset) => preset.id)).toEqual([...ACCENT_PRESET_IDS])
  })
})
