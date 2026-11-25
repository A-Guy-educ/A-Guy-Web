/**
 * The system color (AccentPicker): the picked preset's index under
 * `aguy-accent-color`, a device-level preference like the theme. The picker
 * only applies it while mounted (it lives in the user menu), so
 * `accentInitScript` applies it before the first paint on every page —
 * including the private-lesson pages, whose accent follows it.
 *
 * Preset values live in `src/app/(frontend)/accents.css`; index 0 (Burgundy)
 * is the default theme and sets no attribute.
 */

export const ACCENT_STORAGE_KEY = 'aguy-accent-color'

/** In picker order — the saved index points into this list. */
export const ACCENT_PRESET_IDS = [
  'burgundy',
  'ocean',
  'forest',
  'sunset',
  'violet',
  'rose',
] as const

/** Inline <head> script: the saved index → `data-accent` on <html>. */
export function accentInitScript(): string {
  const key = JSON.stringify(ACCENT_STORAGE_KEY)
  const ids = JSON.stringify(ACCENT_PRESET_IDS)
  return `(function(){try{var i=parseInt(localStorage.getItem(${key})||'0',10);var id=${ids}[i];if(i>0&&id)document.documentElement.dataset.accent=id}catch(e){}})()`
}
