/**
 * Returns true when a markdown-math value contains at least one KaTeX
 * delimited atom (`$...$`, `$$...$$`, `\(...\)`, `\[...\]`). Sibling of
 * `isMathOnlyRichText`, used by MCQ renderers when the per-option
 * breathing-room boost should kick in as soon as ANY option carries a
 * math atom (not only when every option is a bare expression).
 */
const MATH_ATOM = /\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]/

export function containsMathAtom(value: string | null | undefined): boolean {
  if (!value) return false
  return MATH_ATOM.test(value)
}
