/**
 * Core types for the geometry proof engine.
 *
 * A `Fact` is a piece of established knowledge in a proof (concrete points).
 * A `Pattern` has the same shape as a `Fact` but its "point names" are
 * variables that get bound during lemma matching.
 *
 * We represent both with the same TypeScript type; the interpretation is
 * contextual (facts have concrete point names, patterns have variable
 * names). A `Binding` maps variable names → concrete point names.
 */

export type PointName = string

/** Two distinct points; canonicalised as [min, max]. */
export type Seg = readonly [PointName, PointName]

/** Angle rays around a vertex; canonicalised so rays[0] < rays[1] alpha. */
export type Angle = readonly [PointName, PointName, PointName] // [rayA, vertex, rayB]

/** Ordered triangle vertices. Correspondence-preserving. */
export type Triangle = readonly [PointName, PointName, PointName]

/** Ordered quadrilateral vertices (ABCD, walked around). */
export type Quad = readonly [PointName, PointName, PointName, PointName]

/**
 * All fact kinds. Adding a new fact kind requires:
 *  - update this union
 *  - add a case in canonicalize / enumerateForms in canonical.ts
 *  - add lemmas that produce/consume it
 */
export type Fact =
  // Equalities
  | { kind: 'segment_eq'; a: Seg; b: Seg }
  | { kind: 'angle_eq'; a: Angle; b: Angle }
  // Numeric measures (degrees for angles). `degrees` may be a numeric-var
  // string in a Pattern; concrete facts always carry a number.
  | { kind: 'angle_measure'; angle: Angle; degrees: number | string }
  // Angles that sum to a known total (e.g. linear pair: sum = 180)
  | { kind: 'angle_sum'; angles: readonly Angle[]; degrees: number | string }
  // Triangle correspondence relations (order-preserving)
  | { kind: 'triangle_congruent'; t1: Triangle; t2: Triangle }
  | { kind: 'triangle_similar'; t1: Triangle; t2: Triangle }
  // Geometric relations between lines/segments
  | { kind: 'parallel'; a: Seg; b: Seg }
  | { kind: 'perpendicular'; a: Seg; b: Seg }
  // Existence / structural facts
  | { kind: 'segment_exists'; s: Seg } // "there's a line from A to B" — visual only
  | { kind: 'triangle_exists'; t: Triangle }
  | { kind: 'collinear'; points: readonly PointName[] }
  | { kind: 'between'; a: PointName; m: PointName; b: PointName } // m strictly between a and b
  | { kind: 'midpoint'; m: PointName; a: PointName; b: PointName } // m is midpoint of segment ab
  /**
   * At `vertex`, ray toward `m` lies strictly inside angle ∠a-vertex-b.
   * Purely structural, no semantic implication on its own — a lemma
   * combines it with equal-parts equalities to derive equal-wholes.
   */
  | {
      kind: 'ray_between'
      vertex: PointName
      a: PointName
      m: PointName
      b: PointName
    }
  // Shape descriptors: apex/first vertex has special meaning
  | { kind: 'isosceles'; t: Triangle } // AB = AC (apex at t[0])
  | { kind: 'parallelogram'; q: Quad }
  | { kind: 'rectangle'; q: Quad }
  | { kind: 'rhombus'; q: Quad }
  | { kind: 'square'; q: Quad }
  | { kind: 'trapezoid'; q: Quad } // AB ∥ CD (bases are q[0]q[1] and q[2]q[3])
  | { kind: 'trapezoid_isosceles'; q: Quad }

export type FactKind = Fact['kind']

/** A Pattern has the same shape as a Fact but variables in place of points. */
export type Pattern = Fact

/**
 * A binding maps pattern variable names to concrete values. Point
 * variables bind to point-name strings; numeric variables (currently only
 * degrees in angle_measure / angle_sum patterns) bind to numbers.
 */
export type BindingValue = PointName | number
export type Binding = Readonly<Record<string, BindingValue>>

export interface Lemma {
  id: string
  nameHe: string
  nameEn: string
  category: string
  gradeLevel: readonly number[]
  /** Structural preconditions that must be established in the proof state. */
  preconditions: readonly Pattern[]
  /** The single fact derived when preconditions match. */
  conclusion: Pattern
  /**
   * Extra semantic side-conditions checked after binding. Return true to
   * accept. Used for things like "the two variables must bind to different
   * points" that are awkward to encode in pattern form.
   */
  guard?: (binding: Binding) => boolean
  /**
   * Optional numeric-conclusion computation. When the conclusion is an
   * angle_measure / angle_sum whose degrees is a variable, this returns the
   * degrees value that binding should produce (e.g. `180 - X - Y` for the
   * triangle-third-angle case). If it returns undefined for a binding, that
   * binding is treated as invalid for this lemma.
   */
  computeDegrees?: (binding: Binding) => number | undefined
}
