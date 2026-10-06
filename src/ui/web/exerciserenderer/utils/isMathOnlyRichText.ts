/**
 * Returns true when a markdown-math value is nothing but math atoms — strip
 * `$...$`, `$$...$$`, `\(...\)` and `\[...\]`, and if the remainder is
 * whitespace-only the string is "math-only". Used by MCQ renderers to decide
 * when every option is a pure KaTeX expression, in which case the option list
 * is given extra vertical breathing room so baseline-shifted glyphs don't
 * visually crowd each other.
 */
export function isMathOnlyRichText(value: string | null | undefined): boolean {
  if (!value?.trim()) return false
  const stripped = value
    .replace(/\$\$[\s\S]+?\$\$/g, '')
    .replace(/\$[^$\n]+\$/g, '')
    .replace(/\\\([\s\S]+?\\\)/g, '')
    .replace(/\\\[[\s\S]+?\\\]/g, '')
    .trim()
  return stripped === ''
}
