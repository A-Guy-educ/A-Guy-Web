# OpenCode Pipeline

Automated development pipeline for A-Guy project using OpenCode CLI agents.

**Note:** For LLM agent execution, see `.opencode/DRIVER.md`. This document is a human reference.

## Pipeline Stages

```
spec → clarify → plan → build → test → verify → auditor → pr
```

| Agent   | Description                        | Input            | Output       |
| ------- | ---------------------------------- | ---------------- | ------------ |
| spec    | Requirements definition            | task.md          | spec.md      |
| clarify | Generate clarifying questions      | task.md, spec.md | questions.md |
| plan    | Architecture, implementation steps | clarified.md     | plan.md      |
| build   | Write implementation code          | plan.md          | build.md     |
| test    | Write E2E/integration tests        | build.md         | test.md      |
| verify  | Run tests, validate                | test.md          | verify.md    |
| auditor | Process improvement analysis       | verify.md        | auditor.md   |
| pr      | Create pull request                | all above        | pr.md        |

## Task Types

Task type is **metadata only** — affects branch prefix and commit type, NOT pipeline:

| Type             | Branch    | Commit        |
| ---------------- | --------- | ------------- |
| feat             | feat/     | feat(...)     |
| fix              | fix/      | fix(...)      |
| refactor         | refactor/ | refactor(...) |
| chore            | chore/    | chore(...)    |
| docs             | docs/     | docs(...)     |
| security         | security/ | security(...) |
| test             | test/     | test(...)     |
| auditor-followup | feat/     | feat(...)     |

## Task Structure

```
.tasks/
└── <YYMMDD-task-name>/
    ├── task.md           # PRD/requirements (USER writes this)
    ├── spec.md           # Detailed spec (spec agent writes)
    ├── questions.md      # Clarifying questions (clarify agent writes)
    ├── clarified.md     # Answers (USER writes — ONLY human artifact)
    ├── plan.md           # Implementation plan (plan agent writes)
    ├── build.md          # Build output (build agent writes)
    ├── test.md           # Test output (test agent writes)
    ├── verify.md         # Verification results (verify agent writes)
    ├── auditor.md        # Auditor analysis (auditor agent writes)
    └── pr.md             # PR summary (pr agent writes)
```

## Running the Pipeline

### Phase 1: Spec + Clarify (stops for user)

```bash
pnpm pipeline:spec <task-id>
```

This runs:

1. **spec agent** — reads `task.md`, writes `spec.md`
2. **clarify agent** — reads `task.md + spec.md`, writes `questions.md`

**STOPS here.** User must:

1. Read `.tasks/<task-id>/questions.md`
2. Write answers to `.tasks/<task-id>/clarified.md`

### Phase 2: Implementation through PR (autonomous)

```bash
pnpm pipeline:impl <task-id>
```

This runs (if outputs don't already exist):

1. **plan agent** — reads `task.md + spec.md + clarified.md`, writes `plan.md`
2. **build agent** — reads `plan.md + spec.md`, implements, writes `build.md`
3. **test agent** — reads `build.md + spec.md`, writes tests, writes `test.md`
4. **verify agent** — runs `pnpm verify`, writes `verify.md`
5. **auditor agent** — analyzes run, writes `auditor.md`
6. **pr agent** — opens GitHub PR, writes `pr.md`

## Commit Format

Conventional commits required:

```
<type>(<scope>): <subject>

- Bullet 1
- Bullet 2
```

### Valid Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Restructuring
- `perf` - Performance
- `test` - Testing
- `build` - Build system
- `ci` - CI/CD
- `chore` - Maintenance
- `revert` - Revert
- `security` - Security

### Rules

- Type must be lowercase
- Subject must be sentence-case (first letter capitalized)
- Body lines under 100 characters

## Branch Naming

- `feat/<task-name>` - Features
- `fix/<task-name>` - Bug fixes
- `chore/<task-name>` - Maintenance
- `refactor/<task-name>` - Refactoring
- `docs/<task-name>` - Documentation

## Validation

Run commit validation before committing:

```bash
./scripts/validate-commit.sh .git/COMMIT_EDITMSG
```

## Troubleshooting

### Pre-commit checks fail

1. Run `pnpm lint:fix` to auto-fix issues
2. Run `./scripts/validate-commit.sh <commit-msg>` to check format

### Type checking fails

1. Check for TypeScript errors: `pnpm typecheck`
2. Fix errors before committing

### Push verification fails

1. Run `pnpm verify` locally
2. Fix any issues before pushing

## Notes

- Always use `git add -A` when committing (not specific files)
- Skip hooks with `SKIP_HOOKS=1` git commit if needed
- Use `--no-verify` for pre-push verification bypass (not recommended)
