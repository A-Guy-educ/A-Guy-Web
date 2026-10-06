/**
 * Returns true when a markdown-math value is "math-only" — strip every KaTeX
 * delimited atom (`$...$`, `$$...$$`, `\(...\)`, `\[...\]`) and check that the
 * remainder is nothing but trivial surrounding characters (whitespace, basic
 * punctuation, letter-prefix labels like "a)"). Used by MCQ renderers to
 * decide when every option is a pure KaTeX expression, in which case the
 * option list is given extra vertical breathing room so baseline-shifted
 * glyphs don't visually crowd each other.
 *
 * The permissive "trivial chars" step matters because authored options often
 * carry small bits of surrounding content — a trailing period, a Hebrew
 * letter label, parentheses — that would otherwise disqualify a visually
 * math-only option from the roomier gap.
 */
const TRIVIAL_SURROUND = /[\s.,;:!?()\-–—‎‏'"]+/gu
const LETTER_PREFIX = /^[A-Za-z֐-׿][.)]\s*/

export function isMathOnlyRichText(value: string | null | undefined): boolean {
  if (!value?.trim()) return false
  const stripped = value
    .replace(/\$\$[\s\S]+?\$\$/g, '')
    .replace(/\$[^$\n]+\$/g, '')
    .replace(/\\\([\s\S]+?\\\)/g, '')
    .replace(/\\\[[\s\S]+?\\\]/g, '')
    .replace(LETTER_PREFIX, '')
    .replace(TRIVIAL_SURROUND, '')
    .trim()
  return stripped === ''
}
