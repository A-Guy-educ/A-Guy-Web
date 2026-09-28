/**
 * Step validation — the public interface of the engine.
 *
 * Hard mode: the student names both a fact and a justifying lemma.
 * Easy mode: the student names only a fact; the engine finds a lemma.
 *
 * A successful validation returns the extended `ProofState` (canonical fact
 * added to the DB). On rejection we return best-effort diagnostics — for
 * each precondition of the closest-matching lemma, whether that
 * precondition is satisfiable in the current fact pool under the tried
 * variable binding.
 */
import { canonicalize, factKey, factPoints } from './canonical.js'
import { ALL_LEMMAS, LEMMA_BY_ID } from './lemmas/index.js'
import { matchAllGen, matchPatternGen, unifyAny } from './match.js'
import { substitute } from './substitute.js'
import type { Binding, Fact, Lemma, Pattern, PointName } from './types.js'

export interface ProofState {
  facts: readonly Fact[] // canonicalised
  keys: ReadonlySet<string>
}

export function initState(givens: readonly Fact[]): ProofState {
  const facts: Fact[] = []
  const keys = new Set<string>()
  for (const g of givens) {
    const c = canonicalize(g)
    const k = factKey(c)
    if (!keys.has(k)) {
      facts.push(c)
      keys.add(k)
    }
  }
  return { facts, keys }
}

export function addFact(state: ProofState, fact: Fact): ProofState {
  const c = canonicalize(fact)
  const k = factKey(c)
  if (state.keys.has(k)) return state
  const facts = [...state.facts, c]
  const keys = new Set(state.keys)
  keys.add(k)
  return { facts, keys }
}

export function hasFact(state: ProofState, fact: Fact): boolean {
  return state.keys.has(factKey(fact))
}

// --------------------------- Diagnostics ---------------------------

export interface PrecondCheck {
  /** The precondition as it reads under the tried binding. */
  substituted: Fact
  /** Whether this precondition is satisfiable in isolation under the tried binding. */
  satisfied: boolean
}

export interface Diagnostics {
  lemma: Lemma
  /** The seed binding (from unifying claim with lemma conclusion) used for these checks. */
  seed: Binding
  preconditions: readonly PrecondCheck[]
  /** How many of the preconditions are satisfiable under this seed. */
  satisfiedCount: number
}

// --------------------------- Step results ---------------------------

/** A near-miss suggestion — an alternate claim that DOES validate. */
export interface Suggestion {
  fact: Fact
  lemma: Lemma
  binding: Binding
}

/**
 * One-step-away hint: the student's claim is *almost* provable — a single
 * lemma L1 would validate it if just one of its preconditions were in the
 * fact pool. The missing precondition is itself derivable by a different
 * lemma L2 from the current facts. Surfaces as "you're missing X —
 * establish it first via L2".
 */
export interface MissingFactHint {
  /** The concrete fact the student needs to add before their claim works. */
  missingFact: Fact
  /** Lemma that would derive `missingFact` from the current fact pool. */
  viaLemma: Lemma
  /** Lemma the student's original claim would then close under. */
  targetLemma: Lemma
}

export type StepResult =
  | { ok: true; lemma: Lemma; binding: Binding; state: ProofState }
  | {
      ok: false
      reason: string
      /** Only present when at least one candidate lemma had a satisfiable
       *  precondition — otherwise the "closest lemma" heuristic degenerates
       *  to whichever lemma sorts first, which is noise. */
      diagnostics?: Diagnostics
      /** "Did you mean …" alternates that validate (e.g. permuted vertices
       *  of an angle_eq claim). Empty if we couldn't find any. */
      suggestions?: readonly Suggestion[]
      /** "You're one step away" — a lemma L1 would validate the claim if
       *  a single missing fact were established, and that missing fact is
       *  itself derivable from the current pool via another lemma. */
      hints?: readonly MissingFactHint[]
      attemptedLemmas?: readonly string[]
    }

/**
 * DFS with backtracking that returns the deepest partial match — the
 * longest prefix of preconditions we can consistently satisfy from the
 * seed, plus the extended binding at that depth. Used for diagnostics so
 * that when the full matcher fails we can still show a coherent
 * "here's how far the engine got" report instead of per-precond
 * independent checks (which mislead because they use different bindings
 * for shared vars).
 *
 * Bounded — caps the branching per precond at LIMIT to avoid the
 * exponential worst case on lemmas with many free-var preconds.
 */
const PARTIAL_MATCH_LIMIT = 32

function findDeepestPartialMatch(
  preconds: readonly Pattern[],
  factDB: readonly Fact[],
  seed: Binding,
): { depth: number; binding: Binding } {
  if (preconds.length === 0) return { depth: 0, binding: seed }
  const [head, ...rest] = preconds
  let best = { depth: 0, binding: seed }
  let tried = 0
  for (const b of matchPatternGen(head!, factDB, seed)) {
    if (tried++ >= PARTIAL_MATCH_LIMIT) break
    const inner = findDeepestPartialMatch(rest, factDB, b)
    const depth = 1 + inner.depth
    if (depth > best.depth) best = { depth, binding: inner.binding }
    if (best.depth === preconds.length) break
  }
  return best
}

/**
 * Compute the "closest partial match" diagnostic under a given seed.
 *
 * We thread bindings across preconditions via `findDeepestPartialMatch`,
 * then display:
 *   - Preconds 0..(depth-1) as ✓ using the deepest coherent binding.
 *   - Precond depth as ✗ using the same binding, with any still-unbound
 *     vars wildcard-marked (`?M` etc.) so students can distinguish an
 *     unbound lemma variable from a real point named M.
 *   - Preconds depth+1..end are omitted — showing them would require
 *     more binding choices that the matcher hasn't committed to.
 */
function computeDiagnostics(lemma: Lemma, seed: Binding, factDB: readonly Fact[]): Diagnostics {
  const { depth, binding } = findDeepestPartialMatch(lemma.preconditions, factDB, seed)
  const preconditions: PrecondCheck[] = []
  for (let i = 0; i <= Math.min(depth, lemma.preconditions.length - 1); i++) {
    const p = lemma.preconditions[i]!
    if (i < depth) {
      preconditions.push({
        substituted: substitute(p, binding),
        satisfied: true,
      })
    } else {
      preconditions.push({
        substituted: substitute(p, binding, { markUnbound: true }),
        satisfied: false,
      })
    }
  }
  return {
    lemma,
    seed: binding, // return the extended binding, useful for downstream
    preconditions,
    satisfiedCount: depth,
  }
}

/**
 * Try to validate `claim` under a single lemma.
 * Returns success (with the successful binding) or failure (with
 * best-effort diagnostics — the seed that satisfied the most preconds).
 */
export function tryLemma(
  claim: Fact,
  lemma: Lemma,
  state: ProofState,
): { ok: true; binding: Binding } | { ok: false; reason: string; diagnostics?: Diagnostics } {
  const seeds = unifyAny(lemma.conclusion, claim, {})
  if (seeds.length === 0) {
    return {
      ok: false,
      reason: `claim shape does not match lemma conclusion (${lemma.id})`,
    }
  }

  // First pass: try each seed with the real matcher; return immediately on a
  // fully-satisfying binding.
  for (const seed of seeds) {
    for (const b of matchAllGen(lemma.preconditions, state.facts, seed)) {
      if (lemma.guard && !lemma.guard(b)) continue
      if (lemma.computeDegrees) {
        const expected = lemma.computeDegrees(b)
        if (expected === undefined) continue
        // Compare against the degrees the conclusion pattern's variable was
        // bound to (via unifying with the claim).
        const decl = lemma.conclusion
        const declaredDegrees =
          decl.kind === 'angle_measure' || decl.kind === 'angle_sum'
            ? typeof decl.degrees === 'string'
              ? b[decl.degrees]
              : decl.degrees
            : undefined
        if (declaredDegrees !== expected) continue
      }
      return { ok: true, binding: b }
    }
  }

  // No seed produced a fully-valid binding. Pick the seed whose preconds
  // are the "most satisfiable" independently — that's the correspondence
  // the student most likely intended.
  let best: Diagnostics | null = null
  for (const seed of seeds) {
    const d = computeDiagnostics(lemma, seed, state.facts)
    if (!best || d.satisfiedCount > best.satisfiedCount) best = d
  }

  return {
    ok: false,
    reason: `no binding of ${lemma.id} satisfies all preconditions`,
    diagnostics: best!,
  }
}

/** Hard mode: student picks the lemma. */
export function validateHard(claim: Fact, lemmaId: string, state: ProofState): StepResult {
  const lemma = LEMMA_BY_ID[lemmaId]
  if (!lemma) return { ok: false, reason: `unknown lemma id: ${lemmaId}` }
  const res = tryLemma(claim, lemma, state)
  if (!res.ok) {
    return {
      ok: false,
      reason: res.reason,
      diagnostics: res.diagnostics,
    }
  }
  return { ok: true, lemma, binding: res.binding, state: addFact(state, claim) }
}

/** Easy mode: engine searches every lemma. */
export function validateEasy(
  claim: Fact,
  state: ProofState,
  lemmas: readonly Lemma[] = ALL_LEMMAS,
  { skipSuggestions = false }: { skipSuggestions?: boolean } = {},
): StepResult {
  const attempted: string[] = []
  let bestDiag: Diagnostics | null = null

  for (const lemma of lemmas) {
    if (lemma.conclusion.kind !== claim.kind) continue
    attempted.push(lemma.id)
    const res = tryLemma(claim, lemma, state)
    if (res.ok) {
      return {
        ok: true,
        lemma,
        binding: res.binding,
        state: addFact(state, claim),
      }
    }
    if (res.diagnostics) {
      if (!bestDiag || res.diagnostics.satisfiedCount > bestDiag.satisfiedCount) {
        bestDiag = res.diagnostics
      }
    }
  }

  // Only surface the "closest lemma" diagnostic if it's actually useful —
  // that is, at least one precondition was satisfiable under the closest
  // seed. Otherwise the "closest" is whichever lemma of the right kind
  // sorted first, and its ✗-marked preconds with `?`-wildcarded lemma vars
  // are noise.
  const showDiagnostics = bestDiag !== null && bestDiag.satisfiedCount > 0

  // Best effort: try nearby claim shapes (vertex permutations for angle_eq,
  // etc.) and surface any that DO validate.
  const suggestions = skipSuggestions ? [] : findNearMissSuggestions(claim, state, lemmas)

  // "You're missing one" — a lemma whose only unmet precond is derivable
  // from a single other lemma. Skipped when we're already recursing (from
  // the suggestion search) to keep the cost bounded.
  const hints = skipSuggestions ? [] : findMissingFactHints(claim, state, lemmas)

  const reason =
    hints.length > 0
      ? "you're one step away — see the hint below"
      : showDiagnostics && bestDiag
        ? `no lemma justifies this step under the current fact set — closest match: ${bestDiag.lemma.nameEn}`
        : suggestions.length > 0
          ? 'no lemma directly validates this claim — see suggestions below'
          : 'no lemma justifies this step under the current fact set'

  return {
    ok: false,
    reason,
    diagnostics: showDiagnostics ? (bestDiag ?? undefined) : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    hints: hints.length > 0 ? hints : undefined,
    attemptedLemmas: attempted,
  }
}

// ---------------------- "Did you mean …" search ----------------------

/**
 * Generate all vertex-permuted variants of an angle-equality claim. For
 * ∠XYZ = ∠UVW there are 3 candidate vertices on each side (X, Y, or Z as
 * the vertex — angle ∠XYZ has vertex Y, ∠YXZ has vertex X, etc.). That's
 * 3 × 3 = 9 shapes, minus the original.
 */
function angleEqVariants(claim: Fact): Fact[] {
  if (claim.kind !== 'angle_eq') return []
  const [x, y, z] = claim.a
  const [u, v, w] = claim.b
  // For each side, the three "vertex" placements — the middle letter of a
  // triple is the vertex. We keep the outer-ray SET the same and only
  // choose which point sits at the vertex.
  const lefts: readonly (readonly [PointName, PointName, PointName])[] = [
    [x, y, z],
    [y, x, z],
    [x, z, y],
  ]
  const rights: readonly (readonly [PointName, PointName, PointName])[] = [
    [u, v, w],
    [v, u, w],
    [u, w, v],
  ]
  const claimKey = factKey(claim)
  const out: Fact[] = []
  const seen = new Set<string>([claimKey])
  for (const l of lefts) {
    for (const r of rights) {
      const alt: Fact = {
        kind: 'angle_eq',
        a: [l[0], l[1], l[2]],
        b: [r[0], r[1], r[2]],
      }
      const k = factKey(alt)
      if (seen.has(k)) continue
      seen.add(k)
      out.push(alt)
    }
  }
  return out
}

/**
 * "You're missing one" search.
 *
 * Iterate every lemma L1 whose conclusion matches the claim. For each seed
 * binding, if EXACTLY ONE of L1's preconditions is unsatisfied and that
 * precondition is fully bound under the seed, ask: is there a lemma L2
 * whose conclusion could produce that missing precondition AND whose own
 * preconditions are already satisfied in the current fact pool? If so,
 * emit a `MissingFactHint`.
 *
 * Only 1-step deep. Complexity: O(L² × avg_seeds²) per claim. For 40 lemmas
 * with a handful of seeds each, that's well under 10k operations —
 * real-time.
 */
function findMissingFactHints(
  claim: Fact,
  state: ProofState,
  lemmas: readonly Lemma[],
): MissingFactHint[] {
  const hints: MissingFactHint[] = []
  const seen = new Set<string>()

  for (const L1 of lemmas) {
    if (L1.conclusion.kind !== claim.kind) continue
    const seeds = unifyAny(L1.conclusion, claim, {})

    for (const seed of seeds) {
      // Use the SAME threaded backtracking as the diagnostic. This gives
      // us the deepest coherent binding — the point in the precondition
      // chain where the matcher genuinely got stuck — instead of doing
      // independent per-precondition checks (which could all pass under
      // different bindings while no consistent binding exists).
      const { depth, binding } = findDeepestPartialMatch(L1.preconditions, state.facts, seed)

      // "One step away" = we got all the way to the last precondition and
      // only THAT one is missing under the threaded binding.
      if (depth !== L1.preconditions.length - 1) continue

      const missingPattern = L1.preconditions[depth]!
      // We need the missing precondition to be fully bound under the
      // threaded binding — otherwise we can't offer a concrete "you need X"
      // hint. If any variable in the missing pattern isn't in `binding`,
      // skip; the caller may still see suggestions or the diagnostic.
      const vars = factPoints(missingPattern)
      if (!vars.every((v) => v in binding)) continue

      const missingFact = substitute(missingPattern, binding)

      // Search for L2 that produces `missingFact` from the current pool.
      for (const L2 of lemmas) {
        if (L2 === L1) continue
        if (L2.conclusion.kind !== missingFact.kind) continue
        const seeds2 = unifyAny(L2.conclusion, missingFact, {})
        let derivable = false
        for (const seed2 of seeds2) {
          for (const b of matchAllGen(L2.preconditions, state.facts, seed2)) {
            if (L2.guard && !L2.guard(b)) continue
            derivable = true
            break
          }
          if (derivable) break
        }
        if (!derivable) continue

        const key = factKey(missingFact) + '|' + L2.id + '|' + L1.id
        if (seen.has(key)) continue
        seen.add(key)
        hints.push({
          missingFact,
          viaLemma: L2,
          targetLemma: L1,
        })
      }
    }
  }
  return hints
}

function findNearMissSuggestions(
  claim: Fact,
  state: ProofState,
  lemmas: readonly Lemma[],
): Suggestion[] {
  const variants = angleEqVariants(claim)
  const suggestions: Suggestion[] = []
  const seen = new Set<string>()
  for (const alt of variants) {
    const res = validateEasy(alt, state, lemmas, { skipSuggestions: true })
    if (res.ok) {
      const k = factKey(alt)
      if (seen.has(k)) continue
      seen.add(k)
      suggestions.push({
        fact: alt,
        lemma: res.lemma,
        binding: res.binding,
      })
    }
  }
  return suggestions
}
