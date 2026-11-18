import { describe, expect, it } from 'vitest'

import {
  CalculatorError,
  INITIAL_CALCULATOR_STATE,
  evaluateExpression,
  formatResult,
  pressKey,
  type CalculatorState,
} from '@/ui/web/chat-tools/calculator/calculator-engine'

const deg = { angle: 'DEG' as const, ans: 0 }
const evaluate = (expression: string, options = deg) => evaluateExpression(expression, options)
const errorCode = (expression: string) => {
  try {
    evaluate(expression)
    return null
  } catch (error) {
    return error instanceof CalculatorError ? error.code : 'not-a-calculator-error'
  }
}
const press = (...keys: string[]): CalculatorState =>
  keys.reduce(pressKey, INITIAL_CALCULATOR_STATE)

describe('evaluateExpression', () => {
  it('respects precedence and parentheses', () => {
    expect(evaluate('2+3×4')).toBe(14)
    expect(evaluate('(2+3)×4')).toBe(20)
    expect(evaluate('10÷4−1')).toBe(1.5)
  })

  it('treats powers as right-associative and binds unary minus looser', () => {
    expect(evaluate('2^3^2')).toBe(512)
    expect(evaluate('-2^2')).toBe(-4)
    expect(evaluate('2^-1')).toBe(0.5)
  })

  it('multiplies juxtaposed atoms', () => {
    expect(evaluate('2π')).toBeCloseTo(2 * Math.PI)
    expect(evaluate('3(4)')).toBe(12)
  })

  it('evaluates trig in degrees and radians', () => {
    expect(evaluate('sin(30)')).toBeCloseTo(0.5)
    expect(evaluate('asin(0.5)')).toBeCloseTo(30)
    expect(evaluate('cos(π)', { angle: 'RAD', ans: 0 })).toBeCloseTo(-1)
  })

  it('handles roots, logs, factorial, percent and Ans', () => {
    expect(evaluate('√(16)')).toBe(4)
    expect(evaluate('log(1000)')).toBeCloseTo(3)
    expect(evaluate('ln(e)')).toBeCloseTo(1)
    expect(evaluate('5!')).toBe(120)
    expect(evaluate('50%')).toBe(0.5)
    expect(evaluate('Ans+1', { angle: 'DEG', ans: 41 })).toBe(42)
  })

  it('reports error codes instead of throwing raw errors', () => {
    expect(errorCode('')).toBe('empty')
    expect(errorCode('2+')).toBe('incomplete')
    expect(errorCode('(2+3')).toBe('missingParen')
    expect(errorCode('2.5!')).toBe('factorialDomain')
    expect(errorCode('tan(90)')).toBe('tanUndefined')
    expect(errorCode('1/0')).toBe('undefined')
    expect(errorCode('2$3')).toBe('invalid')
  })

  it('never evaluates arbitrary code', () => {
    expect(errorCode('alert(1)')).toBe('invalid')
  })
})

describe('formatResult', () => {
  it('trims float noise', () => {
    expect(formatResult(0.1 + 0.2)).toBe('0.3')
    expect(formatResult(1e-15)).toBe('0')
  })
})

describe('pressKey', () => {
  it('solves and keeps the expression above the result', () => {
    const state = press('2', '+', '2', '=')
    expect(state.expression).toBe('4')
    expect(state.previous).toBe('2+2 =')
    expect(state.ans).toBe(4)
  })

  it('starts fresh after = for digits but continues for operators', () => {
    expect(press('2', '=', '5').expression).toBe('5')
    expect(press('2', '=', '+', '1').expression).toBe('2+1')
  })

  it('inserts inverse trig when 2nd is on', () => {
    expect(press('SECOND', 'SIN').expression).toBe('asin(')
    expect(press('SIN').expression).toBe('sin(')
  })

  it('surfaces errors as codes and clears them on the next key', () => {
    const failed = press('(', '2', '=')
    expect(failed.error).toBe('missingParen')
    expect(pressKey(failed, ')').error).toBeNull()
  })

  it('does not mutate the previous state', () => {
    const before = press('7')
    const after = pressKey(before, '8')
    expect(before.expression).toBe('7')
    expect(after.expression).toBe('78')
  })

  it('wraps for reciprocal and negate, and toggles the angle mode', () => {
    expect(press('4', 'RECIP').expression).toBe('1/(4)')
    expect(press('4', 'NEGATE').expression).toBe('-(4)')
    expect(press('ANGLE').angle).toBe('RAD')
  })
})
