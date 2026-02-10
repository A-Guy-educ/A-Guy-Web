# PRIMARY AGENT PIPELINE (Operational State Machine)

This pipeline is written for the **PRIMARY DRIVER agent**.
The driver does not reason intuitively.
It follows this document mechanically.

Source of truth:

- Task file
- Spec file
- Plan output
- Git state
- Verify report

If any required artifact is missing or ambiguous — STOP.

---

## ARTIFACTS (Required Files)

- Task: `.opencode/tasks/<task-id>.md`
- Spec: `docs/specs/<task-id>.spec.md`
- Plan: referenced output from Plan agent
- Verify Report: last verify output (PASS/FAIL)
- Auditor Output: `.tasks/<task-id>/runs/<run-id>/auditor.json`

---

## STATE DETECTION (Evaluate Top → Down)

Evaluate states in this exact order.
The **first matching rule wins**.

---

### STATE 0 — NO TASK

Condition:

- No file exists at `.opencode/tasks/<task-id>.md`

Action:

- STOP
- Ask user to create a Task file

---

### BLOCKED — CLARIFICATION REQUIRED

Condition:

- Task objective is ambiguous
- Scope is unclear
- Success Definition is not testable
- Conflicting constraints exist

Action:

- STOP pipeline execution
- Ask clarifying questions
- Do NOT proceed to Spec
- Do NOT guess

Exit Condition:

- Task updated with answers
- Ambiguity resolved

---

### STATE 1 — TASK ONLY

Condition:

- Task exists
- Spec does NOT exist

Next Agent:

- `spec`

Instruction:

- Produce a spec strictly from the task
- Write only `docs/specs/<task-id>.spec.md`
- Do not write code
- Do not plan implementation

---

### STATE 2 — SPEC READY

Condition:

- Spec exists
- Plan does NOT exist

Next Agent:

- `plan`

Instruction:

- Produce an execution plan derived from the spec
- Reference spec requirements explicitly
- Do not write code
- Do not modify spec

---

### STATE 3 — BUILD

Condition:

- Spec exists
- Plan exists
- AND (no commits exist after plan OR returning from verify FAIL)

Next Agent:

- `build`

Instruction:

- Pull latest `dev`
- Create a new working branch from `dev` named: `<type>/<kebab-case>`
- Validate the branch name by running: `pnpm check:branch`
- All work must be done on this branch only
- Implement strictly according to spec + plan
- Commit and push changes
- You own Git (commit / push / branch management)
- You may consult subagents
- You MUST NOT change the spec
- You MUST NOT expand scope

Exit Condition:

- One or more commits pushed that address the plan or verify fix list

---

### STATE 4 — VERIFY

Condition:

- New commits exist since last verify
- OR no verify has been run yet

Next Agent:

- `verify`

Instruction:

- Run hard gate (lint/typecheck/tests/build)
- Run soft gate (spec compliance)
- Output PASS or FAIL with an ordered fix list
- Do not modify code
- Do not commit
- Do not open PRs

---

### STATE 4b — VERIFY FAILED → AUDIT

Condition:

- Last verify result = FAIL
- AND no auditor output exists for the current run yet

Next Agent:

- `auditor`

Instruction:

- Analyze the failed run
- Classify the failure (SPEC_PROMPT / CONTEXT / EXECUTION / UNKNOWN)
- Produce one preventive improvement
- Write output to `.tasks/<task-id>/runs/<run-id>/auditor.json`
- Auditor must set `retrySafe` field
- Do not modify code

Post-audit:

- If `retrySafe = YES` → return to STATE 3 (BUILD)
- If `retrySafe = NO` → STOP, manual intervention required
- If `retrySafe = UNKNOWN` → STOP, improve observability first

---

### STATE 5 — AUDIT

Condition:

- Last verify result = PASS
- AND (no auditor output exists for current run OR auditor output has `canClose = false`)

Next Agent:

- `auditor`

Instruction:

- Analyze the full run (spec, plan, build diffs, verify report)
- Produce exactly one process improvement
- Write output to `.tasks/<task-id>/runs/<run-id>/auditor.json`
- Output must conform to AuditorOutput schema
- Do not modify code
- Do not commit

---

### STATE 5b — AUDIT FAILED → MANUAL INTERVENTION

Condition:

- Auditor output exists but `canClose = false`
- OR Auditor output schema validation failed

Action:

- STOP pipeline execution
- Report: "Auditor gate blocked closure. Reason: [canClose=false | schema invalid]"
- Follow-up task must be created before pipeline can close

---

### STATE 6 — DONE

Condition:

- Last verify result = PASS
- AND auditor output exists for current run
- AND auditor output `canClose = true`
- AND auditor output schema is valid

Action:

- STOP
- Task is complete and merge-ready

---

## CRITICAL LOOP (NON-NEGOTIABLE)

STATE 3 (BUILD)
→ STATE 4 (VERIFY)
→ FAIL → STATE 4b (AUDIT)
→ retrySafe=YES → STATE 3 (BUILD)
→ retrySafe=NO/UNKNOWN → MANUAL INTERVENTION
→ PASS → STATE 5 (AUDIT)
→ canClose=true → STATE 6 (DONE)
→ canClose=false → MANUAL INTERVENTION

Verify never advances the pipeline.
Verify only blocks or releases.
Audit always runs before DONE.
Audit blocks closure if canClose=false.

---

## DRIVER RULES (ABSOLUTE)

- Only **one agent** runs at a time
- The driver never skips states
- The driver never changes artifacts owned by other stages
- Verify FAIL never reopens Spec or Plan automatically
- Spec or Plan changes require **explicit manual restart**
- Progress = artifacts + commits, not discussion

---

## PRIMARY DRIVER OUTPUT CONTRACT

Every driver/orchestrator run MUST output exactly:

- Current State
- Blocking Condition (if any)
- Next Agent to Run
- Exact Instruction to That Agent
- Run ID: (if in AUDIT or post-AUDIT state)

No commentary. No alternatives.

---

## FAILURE HANDLING

If:

- An artifact is unclear
- Commands cannot be determined
- State cannot be classified

Then:

- STOP
- Report the missing or ambiguous input
- Do not guess
