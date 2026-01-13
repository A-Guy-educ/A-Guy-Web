# TDD Workflow: Spec → Plan → Implement → Commit

**Execute 4-stage TDD workflow. Always comply with `docs/specs/CONSTRAINTS.md`.**

```
Task → [1] Spec → [2] Plan → [3] Implement → [4] Commit → DONE
         ↓          ↓           ↓              ↓
      User OK    User OK    Tests pass    Hooks pass
```

---

## Stage 1: Create Specification

**Read:** `docs/specs/CREATE-SPEC.md` + `docs/specs/CONSTRAINTS.md`

**If unclear:** Use `AskUserQuestion` (behaviors, edge cases, security, schema, i18n) → BLOCK until clear

**Create:** `docs/specs/tasks/TASK-{name}.md` with 8 sections:
1. Scope (feature, type, impact)
2. Behaviors to Cover (6-15 testable items)
3. Expected Outcomes (observable per behavior)
4. Out of Scope (explicit exclusions)
5. Test Boundaries (unit/integration, mocking)
6. Stop Conditions (DONE criteria)
7. Deliverables (tests, CI, docs, migrations)
8. Risk & Rollback (blast radius, strategy)

**Validate:** All 8 sections, every behavior → outcome, constraints compliant

**Exit:** ✓ Complete ✓ User approved ✓ No violations

---

## Stage 2: Create Implementation Plan

**Read:** `docs/specs/CREATE-PLAN.md` + `CONSTRAINTS.md` + approved spec

**Explore:** Use Task(Explore) for patterns, files, tests, collections/components

**If multiple approaches:** Use `AskUserQuestion` (patterns, flags, rollout, migrations) → BLOCK until decided

**Append to spec:** Plan with 7 sections:
1. Overview (objective, impact, rollout)
2. Requirements → Plan Map (trace all)
3. Stages (3-7, risk-ordered, each with: scope, deliverables, verification, exit criteria, constraints check, risk)
4. Test Plan (staged, not deferred)
5. Data & Migration (if needed)
6. Rollout & Monitoring
7. Stop Conditions

**Validate:** All requirements mapped, stages verified, constraints per stage

**Exit:** ✓ Complete ✓ Mapped ✓ Compliant ✓ User approved

---

## Stage 3: Implement the Plan

**Branch:** `git checkout -b <type>/<kebab-name>` (feat|fix|chore|docs|refactor|test|security)

**Track:** Use `TodoWrite` for each stage (content, activeForm, status)

**Per stage:**
1. Mark todo "in_progress"
2. **Write tests FIRST** → Run `pnpm test:unit` → VERIFY fail (red)
3. **Implement** (Payload-first, i18n, microcomponents, @/ imports, no scope creep)
4. **Make tests pass** → Run `pnpm test:unit` → VERIFY green
5. **Quality gate:** `pnpm typecheck && pnpm lint && pnpm build && pnpm test:unit` → Must ALL pass
6. **Commit** (Stage 4 protocol)
7. Mark todo "completed"

**If issues:** Tests fail → fix code (never skip). Constraints → refactor. Blocked → `AskUserQuestion`

**Exit:** ✓ All stages done ✓ All behaviors tested ✓ Quality passes ✓ No violations

---

## Stage 4: Commit and Push

**Pre-check:** On feature branch, quality gates pass (`typecheck && lint && build && test:unit`)

**Stage:** `git add <files>` → No secrets, no CSS (except globals.css) → Review `git diff --cached`

**Commit:** See style with `git log --oneline -5`, then:
```bash
git commit -m "$(cat <<'EOF'
<type>: <Subject in sentence case, no period>

<Body: min 20 chars, WHY not WHAT>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```
Types: `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|security`

**Hooks (8 auto-checks):** Branch protection, naming, secrets, CSS, lint-staged, types, build, tests
→ If fail: read error, consult `COMMIT_GUIDE.md`, fix, `git add`, retry

**Push:** `git push -u origin <branch>` (first) or `git push`

**Exit:** ✓ Committed ✓ Hooks passed ✓ Pushed

---

## Rules

**MUST DO:** Ask when unclear • Tests before code • Follow CONSTRAINTS.md • Complete all sections • Map requirements • Verify exits • Quality gates • Conventional commits • Co-author line • TodoWrite tracking

**NEVER:** Skip spec/plan • Invent behaviors • Code before tests • Violate constraints • Commit to main/dev • Skip checks • Wrong branch format • Commit secrets • Add CSS • Scope creep • Guess

---

## Error Recovery

| Error | Action |
|-------|--------|
| Spec invalid | Fix → Re-validate → User approval |
| Plan invalid | Fix → Ensure traceability → User approval |
| Tests fail | Fix code → Re-run → Never skip |
| Commit fails | Read error → Check COMMIT_GUIDE.md → Fix → Retry |
| Blocked | AskUserQuestion → Wait |

---

## Done Criteria

✓ Spec (8 sections) + user approval
✓ Plan (7 sections, mapped) + user approval
✓ All stages implemented + tests pass + quality gates
✓ Commits proper format + hooks pass + pushed
✓ User approves final implementation

---

## References

`CREATE-SPEC.md` (Stage 1) • `CREATE-PLAN.md` (Stage 2) • `COMMIT_GUIDE.md` (Stage 4) • `CONSTRAINTS.md` (all) • `CLAUDE.md` • `AGENTS.md`
