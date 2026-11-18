/**
 * @fileType utility
 * @domain chat-tools
 * @ai-summary Scientific calculator core for the chat tool rail: a small recursive-descent parser (no eval) plus an immutable key-press reducer. Errors carry codes so the panel can localize them.
 */

export type AngleMode = 'DEG' | 'RAD'

export type CalculatorErrorCode =
  | 'empty'
  | 'invalid'
  | 'missingParen'
  | 'incomplete'
  | 'unknownFunction'
  | 'undefined'
  | 'factorialDomain'
  | 'tanUndefined'

export class CalculatorError extends Error {
  constructor(public readonly code: CalculatorErrorCode) {
    super(code)
    this.name = 'CalculatorError'
  }
}

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'name'; value: string }
  | { kind: 'symbol'; value: string }

type FunctionName = 'asin' | 'acos' | 'atan' | 'sqrt' | 'sin' | 'cos' | 'tan' | 'log' | 'ln'
const NAME_PATTERN = /^(?:asin|acos|atan|sqrt|sin|cos|tan|log|ln|Ans|e)/
const NUMBER_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/
const SYMBOLS = '+-*/^()%!π√'
const MAX_FACTORIAL = 170

function tokenize(source: string): Token[] {
  const text = source.replaceAll('−', '-').replaceAll('×', '*').replaceAll('÷', '/')
  const tokens: Token[] = []
  let i = 0
  while (i < text.length) {
    const rest = text.slice(i)
    const spaces = rest.match(/^\s+/)
    if (spaces) {
      i += spaces[0].length
      continue
    }
    const num = rest.match(NUMBER_PATTERN)
    if (num) {
      tokens.push({ kind: 'num', value: Number(num[0]) })
      i += num[0].length
      continue
    }
    const name = rest.match(NAME_PATTERN)
    if (name) {
      tokens.push({ kind: 'name', value: name[0] })
      i += name[0].length
      continue
    }
    if (SYMBOLS.includes(text[i])) {
      tokens.push({ kind: 'symbol', value: text[i] })
      i++
      continue
    }
    throw new CalculatorError('invalid')
  }
  return tokens
}

function factorial(x: number): number {
  if (!Number.isInteger(x) || x < 0 || x > MAX_FACTORIAL)
    throw new CalculatorError('factorialDomain')
  let acc = 1
  for (let k = 2; k <= x; k++) acc *= k
  return acc
}

/**
 * Grammar: sum → product → signed → power → postfix → atom.
 * Juxtaposition multiplies (`2π`, `3(4)`, `2sin(30)`).
 */
export function evaluateExpression(
  source: string,
  options: { angle: AngleMode; ans: number },
): number {
  const tokens = tokenize(source)
  if (tokens.length === 0) throw new CalculatorError('empty')

  const toRadians = (x: number) => (options.angle === 'DEG' ? (x * Math.PI) / 180 : x)
  const fromRadians = (x: number) => (options.angle === 'DEG' ? (x * 180) / Math.PI : x)
  const functions: Record<FunctionName, (x: number) => number> = {
    sin: (x) => Math.sin(toRadians(x)),
    cos: (x) => Math.cos(toRadians(x)),
    tan: (x) => {
      const a = toRadians(x)
      if (Math.abs(Math.cos(a)) < 1e-13) throw new CalculatorError('tanUndefined')
      return Math.tan(a)
    },
    asin: (x) => fromRadians(Math.asin(x)),
    acos: (x) => fromRadians(Math.acos(x)),
    atan: (x) => fromRadians(Math.atan(x)),
    sqrt: Math.sqrt,
    log: Math.log10,
    ln: Math.log,
  }

  let pos = 0
  const peek = (): Token | undefined => tokens[pos]
  const take = (symbol: string): boolean => {
    const token = peek()
    if (token?.kind === 'symbol' && token.value === symbol) {
      pos++
      return true
    }
    return false
  }
  const expect = (symbol: string) => {
    if (!take(symbol)) throw new CalculatorError('missingParen')
  }
  const startsAtom = (token: Token | undefined): boolean =>
    token !== undefined &&
    (token.kind === 'num' ||
      token.kind === 'name' ||
      (token.kind === 'symbol' && ['(', 'π', '√'].includes(token.value)))

  function atom(): number {
    const token = peek()
    if (!token) throw new CalculatorError('incomplete')
    if (token.kind === 'num') {
      pos++
      return token.value
    }
    if (take('π')) return Math.PI
    if (take('√')) {
      expect('(')
      const inner = sum()
      expect(')')
      return Math.sqrt(inner)
    }
    if (token.kind === 'name') {
      pos++
      if (token.value === 'e') return Math.E
      if (token.value === 'Ans') return options.ans
      const fn = functions[token.value as keyof typeof functions]
      if (!fn) throw new CalculatorError('unknownFunction')
      expect('(')
      const arg = sum()
      expect(')')
      return fn(arg)
    }
    if (take('(')) {
      const inner = sum()
      expect(')')
      return inner
    }
    throw new CalculatorError('invalid')
  }

  function postfix(): number {
    let n = atom()
    for (;;) {
      if (take('!')) n = factorial(n)
      else if (take('%')) n = n / 100
      else return n
    }
  }

  function power(): number {
    const base = postfix()
    return take('^') ? Math.pow(base, signed()) : base
  }

  function signed(): number {
    if (take('+')) return signed()
    if (take('-')) return -signed()
    return power()
  }

  function product(): number {
    let n = signed()
    for (;;) {
      if (take('*')) n *= signed()
      else if (take('/')) n /= signed()
      else if (startsAtom(peek())) n *= signed()
      else return n
    }
  }

  function sum(): number {
    let n = product()
    for (;;) {
      if (take('+')) n += product()
      else if (take('-')) n -= product()
      else return n
    }
  }

  const result = sum()
  if (pos !== tokens.length) throw new CalculatorError('invalid')
  if (!Number.isFinite(result)) throw new CalculatorError('undefined')
  return result
}

/** 12 significant digits, with float noise near zero snapped to 0. */
export function formatResult(x: number): string {
  if (!Number.isFinite(x)) throw new CalculatorError('undefined')
  const snapped = Math.abs(x) < 1e-12 ? 0 : x
  return String(Number(snapped.toPrecision(12)))
}

/** Values carried by calculator keys (the label shown can differ). */
export type CalculatorKey =
  | 'SECOND'
  | 'SIN'
  | 'COS'
  | 'TAN'
  | 'ANGLE'
  | 'C'
  | 'DEL'
  | '='
  | 'ANS'
  | 'RECIP'
  | 'NEGATE'
  | (string & {})

export interface CalculatorState {
  expression: string
  /** The solved expression shown above the result (`2+2 =`). */
  previous: string
  ans: number
  angle: AngleMode
  /** `2nd` toggled: sin/cos/tan insert their inverses. */
  inverse: boolean
  justSolved: boolean
  error: CalculatorErrorCode | null
}

export const INITIAL_CALCULATOR_STATE: CalculatorState = {
  expression: '',
  previous: '',
  ans: 0,
  angle: 'DEG',
  inverse: false,
  justSolved: false,
  error: null,
}

/** Keys that start a fresh expression when pressed right after `=`. */
const STARTS_NEW_EXPRESSION = ['π', 'e', '(', '√(', 'log(', 'ln(', 'SIN', 'COS', 'TAN', 'ANS']

export function pressKey(state: CalculatorState, key: CalculatorKey): CalculatorState {
  switch (key) {
    case 'ANGLE':
      return { ...state, angle: state.angle === 'DEG' ? 'RAD' : 'DEG' }
    case 'SECOND':
      return { ...state, inverse: !state.inverse }
    case 'C':
      return { ...state, expression: '', previous: '', error: null, justSolved: false }
    case 'DEL':
      return {
        ...state,
        expression: state.expression.slice(0, -1),
        previous: '',
        error: null,
        justSolved: false,
      }
    case '=':
      try {
        const value = evaluateExpression(state.expression, state)
        return {
          ...state,
          previous: `${state.expression} =`,
          expression: formatResult(value),
          ans: value,
          error: null,
          justSolved: true,
        }
      } catch (error) {
        return { ...state, error: error instanceof CalculatorError ? error.code : 'invalid' }
      }
  }

  const startFresh =
    state.justSolved && (/^[\d.]$/.test(key) || STARTS_NEW_EXPRESSION.includes(key))
  const base = startFresh ? '' : state.expression
  return {
    ...state,
    expression: appendKey(base, key, state.inverse),
    previous: '',
    error: null,
    justSolved: false,
  }
}

function appendKey(expression: string, key: CalculatorKey, inverse: boolean): string {
  if (key === 'SIN' || key === 'COS' || key === 'TAN') {
    const name = key.toLowerCase()
    return `${expression}${inverse ? `a${name}` : name}(`
  }
  if (key === 'ANS') return `${expression}Ans`
  if (key === 'RECIP') return `1/(${expression || '1'})`
  if (key === 'NEGATE') return expression ? `-(${expression})` : '-'
  return expression + key
}
