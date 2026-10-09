/**
 * Catalog of math tools the student can insert from the "+" picker.
 *
 * Mirrors the structure from the design handoff (aguy-chat-demo.html): three
 * categories (math / functions / geometry), each with a basic and advanced
 * set of tools. Each tool declares its named input fields (Hebrew labels
 * matching the demo) and a `build(values)` function that produces the LaTeX
 * for the resulting chip.
 *
 * `build` must emit LaTeX that KaTeX can render — placeholders for empty
 * slots use `\placeholder{}`, which MathChip aliases to `\square` on the
 * read-only KaTeX render so empty argument slots show as visible boxes.
 */

export type ToolCategory = 'math' | 'functions' | 'geometry'

export interface MathToolField {
  label: string
  defaultValue?: string
  optional?: boolean
}

export interface MathTool {
  key: string
  label: string
  symbol: string
  fields: MathToolField[]
  build: (values: string[]) => string
}

/** Wrap a user-provided value for inclusion in a LaTeX template. Empty values
 *  become `\placeholder{}` so the KaTeX preview still shows an argument slot. */
export function slot(v: string | undefined): string {
  const trimmed = (v ?? '').trim()
  if (!trimmed) return '\\placeholder{}'
  // Multi-char runs need braces so e.g. `AB` stays grouped under a sqrt.
  return trimmed.length > 1 ? `{${trimmed}}` : trimmed
}

export const MATH_TOOLS: Record<string, MathTool> = {
  // ---------- math ----------
  x: {
    key: 'x',
    label: 'x',
    symbol: 'x',
    fields: [],
    build: () => 'x',
  },
  fraction: {
    key: 'fraction',
    label: 'שבר',
    symbol: 'a/b',
    fields: [{ label: 'מונה' }, { label: 'מכנה' }],
    build: ([n, d]) => `\\frac{${slot(n)}}{${slot(d)}}`,
  },
  power: {
    key: 'power',
    label: 'חזקה',
    symbol: 'xⁿ',
    fields: [{ label: 'בסיס', defaultValue: 'x' }, { label: 'מעריך' }],
    build: ([b, e]) => `${slot(b)}^{${slot(e).replace(/^\\placeholder\{\}$/, '\\placeholder{}')}}`,
  },
  root: {
    key: 'root',
    label: 'שורש',
    symbol: '√',
    fields: [{ label: 'ביטוי בתוך השורש' }],
    build: ([x]) => `\\sqrt{${slot(x)}}`,
  },
  brackets: {
    key: 'brackets',
    label: 'סוגריים',
    symbol: '( )',
    fields: [{ label: 'ביטוי' }],
    build: ([x]) => `\\left(${slot(x)}\\right)`,
  },
  unequal: {
    key: 'unequal',
    label: 'לא שווה',
    symbol: '≠',
    fields: [{ label: 'אגף שמאל', defaultValue: 'x' }, { label: 'אגף ימין' }],
    build: ([l, r]) => `${slot(l)} \\neq ${slot(r)}`,
  },
  abs: {
    key: 'abs',
    label: 'ערך מוחלט',
    symbol: '|x|',
    fields: [{ label: 'ביטוי', defaultValue: 'x' }],
    build: ([x]) => `\\left|${slot(x)}\\right|`,
  },
  an: {
    key: 'an',
    label: 'איבר בסדרה',
    symbol: 'aₙ',
    fields: [
      { label: 'סימן האיבר', defaultValue: 'a' },
      { label: 'אינדקס', defaultValue: 'n' },
    ],
    build: ([s, i]) => `${slot(s)}_{${slot(i)}}`,
  },
  sn: {
    key: 'sn',
    label: 'סכום סדרה',
    symbol: 'Sₙ',
    fields: [
      { label: 'סימן הסכום', defaultValue: 'S' },
      { label: 'אינדקס', defaultValue: 'n' },
    ],
    build: ([s, i]) => `${slot(s)}_{${slot(i)}}`,
  },
  sum: {
    key: 'sum',
    label: 'סכום',
    symbol: 'Σ',
    fields: [
      { label: 'גבול תחתון', defaultValue: 'k=1' },
      { label: 'גבול עליון', defaultValue: 'n' },
      { label: 'ביטוי' },
    ],
    build: ([lo, hi, x]) => `\\sum_{${slot(lo)}}^{${slot(hi)}} ${slot(x)}`,
  },

  // ---------- functions ----------
  sin: {
    key: 'sin',
    label: 'sin',
    symbol: 'sin',
    fields: [{ label: 'ביטוי', defaultValue: 'x' }],
    build: ([x]) => `\\sin\\left(${slot(x)}\\right)`,
  },
  cos: {
    key: 'cos',
    label: 'cos',
    symbol: 'cos',
    fields: [{ label: 'ביטוי', defaultValue: 'x' }],
    build: ([x]) => `\\cos\\left(${slot(x)}\\right)`,
  },
  tan: {
    key: 'tan',
    label: 'tan',
    symbol: 'tan',
    fields: [{ label: 'ביטוי', defaultValue: 'x' }],
    build: ([x]) => `\\tan\\left(${slot(x)}\\right)`,
  },
  ln: {
    key: 'ln',
    label: 'ln',
    symbol: 'ln',
    fields: [{ label: 'ביטוי', defaultValue: 'x' }],
    build: ([x]) => `\\ln\\left(${slot(x)}\\right)`,
  },
  log: {
    key: 'log',
    label: 'log',
    symbol: 'log',
    fields: [{ label: 'ביטוי', defaultValue: 'x' }],
    build: ([x]) => `\\log\\left(${slot(x)}\\right)`,
  },
  integral: {
    key: 'integral',
    label: 'אינטגרל',
    symbol: '∫',
    fields: [{ label: 'פונקציה' }, { label: 'משתנה', defaultValue: 'x' }],
    build: ([f, v]) => `\\int ${slot(f)} \\, d${slot(v)}`,
  },
  definite: {
    key: 'definite',
    label: 'אינטגרל עם גבולות',
    symbol: '∫ₐᵇ',
    fields: [
      { label: 'גבול תחתון' },
      { label: 'גבול עליון' },
      { label: 'פונקציה' },
      { label: 'משתנה', defaultValue: 'x' },
    ],
    build: ([lo, hi, f, v]) => `\\int_{${slot(lo)}}^{${slot(hi)}} ${slot(f)} \\, d${slot(v)}`,
  },

  // ---------- geometry ----------
  parallel: {
    key: 'parallel',
    label: 'מקביל',
    symbol: '∥',
    fields: [
      { label: 'קטע ראשון', defaultValue: 'AB' },
      { label: 'קטע שני', defaultValue: 'CD' },
    ],
    build: ([a, b]) => `${slot(a)} \\parallel ${slot(b)}`,
  },
  perpendicular: {
    key: 'perpendicular',
    label: 'מאונך',
    symbol: '⊥',
    fields: [
      { label: 'קטע ראשון', defaultValue: 'AB' },
      { label: 'קטע שני', defaultValue: 'CD' },
    ],
    build: ([a, b]) => `${slot(a)} \\perp ${slot(b)}`,
  },
  congruent: {
    key: 'congruent',
    label: 'חופף',
    symbol: '≅',
    fields: [
      { label: 'משולש ראשון', defaultValue: 'ABC' },
      { label: 'משולש שני', defaultValue: 'DEF' },
    ],
    build: ([a, b]) => `\\triangle ${slot(a)} \\cong \\triangle ${slot(b)}`,
  },
  similar: {
    key: 'similar',
    label: 'דומה',
    symbol: '∼',
    fields: [
      { label: 'משולש ראשון', defaultValue: 'ABC' },
      { label: 'משולש שני', defaultValue: 'DEF' },
    ],
    build: ([a, b]) => `\\triangle ${slot(a)} \\sim \\triangle ${slot(b)}`,
  },
  angle: {
    key: 'angle',
    label: 'זווית',
    symbol: '∠',
    fields: [{ label: 'שם הזווית', defaultValue: 'ABC' }],
    build: ([a]) => `\\angle ${slot(a)}`,
  },
  vector: {
    key: 'vector',
    label: 'וקטור',
    symbol: 'u⃗',
    fields: [{ label: 'שם הווקטור', defaultValue: 'u' }],
    build: ([v]) => `\\vec{${slot(v)}}`,
  },
  vectorab: {
    key: 'vectorab',
    label: 'וקטור בין נקודות',
    symbol: 'AB⃗',
    fields: [
      { label: 'נקודת התחלה', defaultValue: 'A' },
      { label: 'נקודת סיום', defaultValue: 'B' },
    ],
    build: ([a, b]) => `\\overrightarrow{${slot(a)}${slot(b)}}`,
  },
  components: {
    key: 'components',
    label: 'רכיבי וקטור',
    symbol: '(x,y,z)',
    fields: [{ label: 'רכיב x' }, { label: 'רכיב y' }, { label: 'רכיב z (רשות)', optional: true }],
    build: ([x, y, z]) =>
      z && z.trim()
        ? `\\left(${slot(x)}, ${slot(y)}, ${slot(z)}\\right)`
        : `\\left(${slot(x)}, ${slot(y)}\\right)`,
  },
  dot: {
    key: 'dot',
    label: 'מכפלה סקלרית',
    symbol: 'u⃗·v⃗',
    fields: [
      { label: 'וקטור ראשון', defaultValue: 'u' },
      { label: 'וקטור שני', defaultValue: 'v' },
    ],
    build: ([u, v]) => `\\vec{${slot(u)}} \\cdot \\vec{${slot(v)}}`,
  },
}

export interface CategoryLayout {
  category: ToolCategory
  title: string
  basic: string[]
  advanced: string[]
}

export const MATH_CATEGORIES: CategoryLayout[] = [
  {
    category: 'math',
    title: 'ביטויים מתמטיים',
    basic: ['x', 'fraction', 'power', 'root', 'brackets', 'unequal'],
    advanced: ['abs', 'an', 'sn', 'sum'],
  },
  {
    category: 'functions',
    title: 'פונקציות',
    basic: ['sin', 'cos', 'ln', 'log', 'tan'],
    advanced: ['integral', 'definite'],
  },
  {
    category: 'geometry',
    title: 'גאומטריה',
    basic: ['parallel', 'perpendicular', 'congruent', 'similar', 'angle'],
    advanced: ['vector', 'vectorab', 'components', 'dot'],
  },
]
