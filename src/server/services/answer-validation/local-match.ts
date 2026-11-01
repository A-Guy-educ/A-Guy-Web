/**
 * Deterministic free-response matching — the cheap tier that runs before the
 * LLM fallback in `/api/exercises/validate-answer`.
 */

export type LocalMatchType = 'exact' | 'latex-plain' | 'numeric' | 'variable-label'

export type LocalMatchResult = { matched: true; matchType: LocalMatchType } | { matched: false }

function normalize(input: string) {
  return input.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Convert LaTeX-flavored math the chat/answer inputs produce (`$\frac{1}{2}$`,
 * `$x^{2}$`, `$\sqrt{9}$`) into a plain-text form comparable to a manually-
 * typed accepted answer like `1/2`, `x^2`, `sqrt(9)`.
 *
 * The transform is intentionally conservative — no CAS-level equivalence,
 * no operator reordering. It just strips display chrome so a student who
 * used the math keyboard doesn't get marked wrong for producing the same
 * expression the teacher wrote by hand. Semantic equivalence still falls
 * through to the LLM.
 *
 * Applied iteratively so nested `\frac{\frac{a}{b}}{c}` collapses fully.
 */
function latexToPlain(input: string) {
  let out = input
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$]*)\$/g, '$1')
    .replace(/\\left|\\right/g, '')
    .replace(/\\,|\\;|\\!|\\ /g, ' ')
  // Repeatedly expand \frac / \sqrt / ^{}/ _{} until stable so nested forms
  // collapse. Cap iterations to prevent pathological input from looping.
  for (let i = 0; i < 6; i++) {
    const next = out
      .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)')
      .replace(/\^\{([^{}]*)\}/g, '^$1')
      .replace(/_\{([^{}]*)\}/g, '_$1')
    if (next === out) break
    out = next
  }
  return out
    .replace(/\\cdot|\\times/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\\pm/g, '±')
    .replace(/\\leq\b/g, '≤')
    .replace(/\\geq\b/g, '≥')
    .replace(/\\neq\b/g, '≠')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\s+/g, '')
}

function numeric(input: string) {
  // Strip `$` delimiters too so a student's `$5$` compares against `5`.
  const stripped = input.replace(/[$,%\s]/g, '').trim()
  if (!stripped) return null
  const value = Number(stripped)
  return Number.isFinite(value) ? value : null
}

// A single variable name (`d`, `x`, `a_1`, `a_n`) followed by `=`, on an
// already-plain (whitespace-free) string. Only one `=` is allowed so
// equations like `x=y=3` are left alone.
const VARIABLE_LABEL = /^([a-zα-ω](?:_\w+)?)=([^=]+)$/i

function splitVariableLabel(plain: string): { label: string | null; value: string } {
  const match = VARIABLE_LABEL.exec(plain)
  return match ? { label: match[1].toLowerCase(), value: match[2] } : { label: null, value: plain }
}

function valuesEqual(a: string, b: string) {
  if (a === b) return true
  const aNum = numeric(a)
  const bNum = numeric(b)
  return aNum !== null && bNum !== null && Math.abs(aNum - bNum) < 0.0001
}

/**
 * `d=4` vs `4` (either direction): the student gave the right value and just
 * added or omitted the variable name the teacher wrote. Two different labels
 * (`x=4` vs `y=4`) never match — that's a wrong-variable answer.
 */
function matchesIgnoringLabel(studentPlain: string, acceptedPlain: string) {
  const student = splitVariableLabel(studentPlain)
  const accepted = splitVariableLabel(acceptedPlain)
  if (!student.label && !accepted.label) return false
  if (student.label && accepted.label && student.label !== accepted.label) return false
  return valuesEqual(student.value, accepted.value)
}

export function localMatch(studentAnswer: string, acceptedAnswers: string[]): LocalMatchResult {
  const studentNorm = normalize(studentAnswer)
  const studentPlain = normalize(latexToPlain(studentAnswer))
  const studentNum = numeric(latexToPlain(studentAnswer))

  for (const accepted of acceptedAnswers) {
    if (studentNorm === normalize(accepted)) return { matched: true, matchType: 'exact' }

    const acceptedPlain = normalize(latexToPlain(accepted))
    if (studentPlain && acceptedPlain && studentPlain === acceptedPlain) {
      return { matched: true, matchType: 'latex-plain' }
    }

    const acceptedNum = numeric(latexToPlain(accepted))
    if (
      studentNum !== null &&
      acceptedNum !== null &&
      Math.abs(studentNum - acceptedNum) < 0.0001
    ) {
      return { matched: true, matchType: 'numeric' }
    }

    if (studentPlain && acceptedPlain && matchesIgnoringLabel(studentPlain, acceptedPlain)) {
      return { matched: true, matchType: 'variable-label' }
    }
  }

  return { matched: false }
}
