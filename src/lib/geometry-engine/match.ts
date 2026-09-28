/**
 * Pattern matching / unification.
 *
 * We unify a `Pattern` (Fact-shaped with variable point-names) against a
 * concrete `Fact` and extend a `Binding`. Because facts have symmetries
 * (segments are unordered pairs, congruent triangles have 12 equivalent
 * presentations, etc.), we walk `enumerateForms(fact)` and try to unify
 * each; the first that succeeds wins.
 *
 * Conventions:
 *  - Every point-name string in a Pattern is treated as a variable. When
 *    unifying, we either bind it or check consistency with an existing
 *    binding.
 *  - Two variables may bind to the same concrete point unless a lemma's
 *    `guard` disallows it (e.g. "these must be distinct").
 */

import { enumerateForms } from './canonical.js'
import type { Binding, BindingValue, Fact, Pattern } from './types.js'

function bindVar(b: Binding, v: string, p: BindingValue): Binding | null {
  const cur = b[v]
  if (cur === undefined) return { ...b, [v]: p }
  return cur === p ? b : null
}

/**
 * Unify a pattern's `degrees` field (which may be a number or a numeric-
 * var string) against a concrete fact's numeric degrees. Returns extended
 * binding on success or null on mismatch.
 */
function unifyDegrees(
  pattern: number | string,
  fact: number | string,
  binding: Binding,
): Binding | null {
  if (typeof pattern === 'string') {
    // Numeric var: bind (or check consistency).
    return bindVar(binding, pattern, fact)
  }
  // Concrete number in pattern — must equal fact.
  if (pattern !== fact) return null
  return binding
}

/**
 * Unify a pattern with a *single specific presentation* of a fact.
 * Returns extended binding or null if no match. Both pattern and fact
 * must be the same kind (checked here for safety).
 */
export function unify(pattern: Pattern, fact: Fact, binding: Binding): Binding | null {
  if (pattern.kind !== fact.kind) return null

  switch (pattern.kind) {
    case 'segment_eq': {
      const f = fact as typeof pattern
      let b: Binding | null = binding
      b = bindVar(b, pattern.a[0], f.a[0])
      if (!b) return null
      b = bindVar(b, pattern.a[1], f.a[1])
      if (!b) return null
      b = bindVar(b, pattern.b[0], f.b[0])
      if (!b) return null
      b = bindVar(b, pattern.b[1], f.b[1])
      if (!b) return null
      return b
    }
    case 'angle_eq': {
      const f = fact as typeof pattern
      let b: Binding | null = binding
      for (let i = 0; i < 3; i++) {
        b = bindVar(b, pattern.a[i]!, f.a[i]!)
        if (!b) return null
      }
      for (let i = 0; i < 3; i++) {
        b = bindVar(b, pattern.b[i]!, f.b[i]!)
        if (!b) return null
      }
      return b
    }
    case 'angle_measure': {
      const f = fact as typeof pattern
      let b: Binding | null = unifyDegrees(pattern.degrees, f.degrees, binding)
      if (!b) return null
      for (let i = 0; i < 3; i++) {
        b = bindVar(b, pattern.angle[i]!, f.angle[i]!)
        if (!b) return null
      }
      return b
    }
    case 'angle_sum': {
      const f = fact as typeof pattern
      if (pattern.angles.length !== f.angles.length) return null
      let b: Binding | null = unifyDegrees(pattern.degrees, f.degrees, binding)
      if (!b) return null
      for (let i = 0; i < pattern.angles.length; i++) {
        const pa = pattern.angles[i]!
        const fa = f.angles[i]!
        for (let j = 0; j < 3; j++) {
          b = bindVar(b, pa[j]!, fa[j]!)
          if (!b) return null
        }
      }
      return b
    }
    case 'triangle_congruent':
    case 'triangle_similar': {
      const f = fact as typeof pattern
      let b: Binding | null = binding
      for (let i = 0; i < 3; i++) {
        b = bindVar(b, pattern.t1[i]!, f.t1[i]!)
        if (!b) return null
        b = bindVar(b, pattern.t2[i]!, f.t2[i]!)
        if (!b) return null
      }
      return b
    }
    case 'parallel':
    case 'perpendicular': {
      const f = fact as typeof pattern
      let b: Binding | null = binding
      b = bindVar(b, pattern.a[0], f.a[0])
      if (!b) return null
      b = bindVar(b, pattern.a[1], f.a[1])
      if (!b) return null
      b = bindVar(b, pattern.b[0], f.b[0])
      if (!b) return null
      b = bindVar(b, pattern.b[1], f.b[1])
      if (!b) return null
      return b
    }
    case 'segment_exists': {
      const f = fact as typeof pattern
      let b: Binding | null = binding
      b = bindVar(b, pattern.s[0], f.s[0])
      if (!b) return null
      b = bindVar(b, pattern.s[1], f.s[1])
      if (!b) return null
      return b
    }
    case 'triangle_exists':
    case 'isosceles': {
      const f = fact as typeof pattern
      let b: Binding | null = binding
      for (let i = 0; i < 3; i++) {
        b = bindVar(b, pattern.t[i]!, f.t[i]!)
        if (!b) return null
      }
      return b
    }
    case 'collinear': {
      const f = fact as typeof pattern
      if (pattern.points.length !== f.points.length) return null
      let b: Binding | null = binding
      for (let i = 0; i < pattern.points.length; i++) {
        b = bindVar(b, pattern.points[i]!, f.points[i]!)
        if (!b) return null
      }
      return b
    }
    case 'between': {
      const f = fact as typeof pattern
      let b: Binding | null = binding
      b = bindVar(b, pattern.a, f.a)
      if (!b) return null
      b = bindVar(b, pattern.m, f.m)
      if (!b) return null
      b = bindVar(b, pattern.b, f.b)
      if (!b) return null
      return b
    }
    case 'midpoint': {
      const f = fact as typeof pattern
      let b: Binding | null = binding
      b = bindVar(b, pattern.m, f.m)
      if (!b) return null
      b = bindVar(b, pattern.a, f.a)
      if (!b) return null
      b = bindVar(b, pattern.b, f.b)
      if (!b) return null
      return b
    }
    case 'ray_between': {
      const f = fact as typeof pattern
      let b: Binding | null = binding
      b = bindVar(b, pattern.vertex, f.vertex)
      if (!b) return null
      b = bindVar(b, pattern.a, f.a)
      if (!b) return null
      b = bindVar(b, pattern.m, f.m)
      if (!b) return null
      b = bindVar(b, pattern.b, f.b)
      if (!b) return null
      return b
    }
    case 'parallelogram':
    case 'rectangle':
    case 'rhombus':
    case 'square':
    case 'trapezoid':
    case 'trapezoid_isosceles': {
      const f = fact as typeof pattern
      let b: Binding | null = binding
      for (let i = 0; i < 4; i++) {
        b = bindVar(b, pattern.q[i]!, f.q[i]!)
        if (!b) return null
      }
      return b
    }
  }
}

/**
 * Try to unify `pattern` against `fact` under any of the fact's equivalent
 * presentations. Yields all successful bindings (deduped by JSON).
 */
export function unifyAny(pattern: Pattern, fact: Fact, binding: Binding): Binding[] {
  const forms = enumerateForms(fact)
  const seen = new Set<string>()
  const out: Binding[] = []
  for (const form of forms) {
    const b = unify(pattern, form, binding)
    if (b) {
      const key = JSON.stringify(b)
      if (!seen.has(key)) {
        seen.add(key)
        out.push(b)
      }
    }
  }
  return out
}

/**
 * Iterate over the fact database and yield every binding that satisfies
 * `pattern` when extending `seed`. Lazy: `for...of` a caller can break
 * out as soon as it has what it needs.
 */
export function* matchPatternGen(
  pattern: Pattern,
  factDB: readonly Fact[],
  seed: Binding,
): Generator<Binding> {
  for (const fact of factDB) {
    if (fact.kind !== pattern.kind) continue
    for (const b of unifyAny(pattern, fact, seed)) yield b
  }
}

/**
 * Iteratively satisfy every precondition. Yields complete bindings one at a
 * time. DFS with backtracking: fix precondition[0], recurse on the rest.
 *
 * Lazy generation matters: a rich fact DB can produce combinatorially many
 * satisfying bindings, and the caller typically only wants the first one
 * that also passes the lemma guard. Materialising them all would freeze
 * the UI thread on the first valid step in a busy proof.
 */
export function* matchAllGen(
  preconditions: readonly Pattern[],
  factDB: readonly Fact[],
  seed: Binding,
): Generator<Binding> {
  if (preconditions.length === 0) {
    yield seed
    return
  }
  const [head, ...rest] = preconditions
  for (const b of matchPatternGen(head!, factDB, seed)) {
    yield* matchAllGen(rest, factDB, b)
  }
}

/** Array-returning wrapper — handy for tests. */
export function matchPattern(pattern: Pattern, factDB: readonly Fact[], seed: Binding): Binding[] {
  return [...matchPatternGen(pattern, factDB, seed)]
}

/** Array-returning wrapper — handy for tests. */
export function matchAll(
  preconditions: readonly Pattern[],
  factDB: readonly Fact[],
  seed: Binding,
): Binding[] {
  return [...matchAllGen(preconditions, factDB, seed)]
}
