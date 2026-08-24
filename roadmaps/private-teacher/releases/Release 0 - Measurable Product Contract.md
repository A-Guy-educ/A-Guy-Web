# Release 0 Implementation Plan — Measurable Product Contract

**Status:** Draft — awaiting product approval  
**Repository:** A-Guy-educ/A-Guy-Web  
**Environment gate:** Development only  
**Complexity:** High  
**Implementation authority:** This document does not authorize code changes. Implementation starts only after explicit approval.

## 1. Release outcome

Release 0 creates the reliable contract needed to build the AI private teacher safely.

At the end of this release:

- The two source specifications are converted into one measurable requirement set.
- One exact teaching journey is selected for Release 1.
- Exercise and pedagogical data contracts are typed and testable.
- Observed facts are separated from AI inferences.
- Storage, privacy, accessibility, measurement, and QA rules are agreed.
- The development deployment is approved by QA before Release 1 planning begins.

Release 0 does not deliver the private-teacher experience to students. It makes that experience safe and measurable to implement.

---

## 2. Scope

### Included

1. Canonical requirement registry with stable IDs.
2. Release ownership, priority, status, and acceptance criteria for every requirement.
3. Selection of one Release 1 pilot topic and one wrong-answer journey.
4. Typed exercise-content contract with real runtime validation.
5. Initial contracts for lesson state, interaction events, observations, inferences, pedagogical actions, and evidence links.
6. Clear source-of-truth and analytics boundaries.
7. Privacy, retention, deletion, correction, and access rules.
8. Accessibility and Hebrew RTL requirements.
9. Automated contract tests and Release 1 acceptance scenarios.
10. Development deployment and QA approval.

### Excluded

- Guided-question or hint behavior in the live lesson.
- Visual teacher actions.
- Adaptive difficulty.
- Student knowledge-model updates.
- Interactive notebook.
- Voice, multimodal teaching, or Avatar.
- Production deployment.
- Broad migration of all existing course content.

---

## 3. Current baseline to verify

The implementation team must recheck these facts before changing code:

- Exercise rendering already supports several question and content types.
- The shared exercise contract currently contains an unvalidated content boundary.
- Durable progress currently stores aggregate completion, score, and time.
- Tutor context currently uses aggregate learning progress.
- Analytics includes attempts, hints, and guiding-question events, but analytics is not the pedagogical source of truth.
- Existing tutor chat transport must remain working and is not the private-teacher decision engine.

Primary review areas:

- src/infra/types/exercise.ts
- src/server/web-api/progress.ts
- src/server/services/user-learning-context.ts
- src/infra/analytics/contracts/schemas.ts
- Exercise renderers and current exercise fixtures
- Tutor-chat context, persistence, and streaming boundaries
- Current data-access and security documentation

No current-state claim is accepted without file or test evidence.

---

## 4. Requirement contract

Create a canonical registry where every requirement contains:

- Stable ID.
- Short user outcome.
- Source specification and section.
- Priority: must, should, or later.
- Target release.
- Acceptance criteria.
- Owner.
- Dependencies.
- Data created or read.
- Privacy and accessibility impact.
- Required automated and QA evidence.
- Status: proposed, approved, implemented, QA approved, or deferred.

Suggested ID groups:

- PT-PED-* — pedagogy and intervention.
- PT-INT-* — interaction and communication.
- PT-DATA-* — learning evidence and storage.
- PT-SAFE-* — privacy, safety, and correction.
- PT-A11Y-* — accessibility and RTL.
- PT-QA-* — measurement and acceptance.

### Requirement acceptance gate

- Every normative statement from both specifications is mapped or explicitly deferred.
- Duplicate requirements are merged.
- Conflicts between the two proposed V0 scopes are resolved.
- Every Release 1 requirement has a measurable pass condition.
- No mandatory requirement remains ownerless.

---

## 5. Release 1 pilot definition

Select one existing mathematics topic with representative content and low migration risk.

The selected journey must include:

1. Student opens a lesson and exercise.
2. Student submits an incorrect answer.
3. The system records the attempt as an observation.
4. The teacher selects a self-check or guiding-question action.
5. A valid part of the current content can be targeted.
6. The student responds again.
7. A similar verification question checks independent understanding.
8. The evidence survives reload.

### Pilot-selection criteria

- Existing content is legally and technically usable.
- The exercise can be represented by the hardened content contract.
- The expected answer can be checked reliably.
- The journey contains at least one meaningful misconception.
- QA can repeat the journey deterministically.
- No voice, notebook, or new general-purpose canvas is required.

The chosen topic and exercise IDs must be recorded before Release 0 closes.

---

## 6. Typed content contract

Replace permissive content handling with an explicit discriminated union and runtime validation for the exercise blocks required by the pilot.

### Required work

- Inventory all block types currently rendered.
- Define the supported shape of each pilot block.
- Validate identifiers needed for targeting content.
- Reject malformed or unknown blocks with a controlled error.
- Preserve valid existing content through compatibility fixtures.
- Document versioning and migration rules.
- Avoid claiming full support for block types that remain unvalidated.

### Required tests

- Valid fixtures parse successfully.
- Invalid and unknown block types fail safely.
- Required targeting IDs cannot be missing or duplicated.
- Existing pilot content renders without regression.
- Serialization and deserialization preserve the contract.
- TypeScript no longer relies on any at the shared content boundary.

If Payload schemas change, regenerate types and import maps as required.

---

## 7. Pedagogical data contracts

Define versioned schemas for the minimum Release 1 loop.

### Exercise metadata

- Exercise, lesson, concept, and skill IDs.
- Pedagogical goal.
- Prerequisites.
- Exercise role.
- Difficulty.
- Assessment dimensions.
- Sections and targetable content IDs.

### Interaction event — observed fact

- User, session, lesson, exercise, and question IDs.
- Timestamp.
- Input type.
- Attempt number.
- Response time.
- Correctness when deterministically known.
- Answer changed, skipped, hint requested, or solution opened.
- Teacher action shown.
- Content target.
- Schema version.

### Pedagogical inference

- Inference type.
- Evidence-event references.
- Confidence.
- Severity.
- Created and last-seen timestamps.
- Resolution state.
- Model or policy version.
- Correction history.

### Lesson state

- Current concept, goal, difficulty, and exercise.
- Attempt and hint counts.
- Engagement, frustration, confidence, and fatigue only when evidence exists.
- Last approved pedagogical action.
- Resume position.
- State version.

### Pedagogical action

The first action vocabulary should contain only what Release 1 needs:

- ASK_SELF_CHECK
- ASK_GUIDING_QUESTION
- GIVE_SMALL_HINT
- HIGHLIGHT_TARGET
- ISOLATE_TARGET
- GIVE_VERIFICATION_EXERCISE
- WAIT

Each action must include its reason, evidence references, target, expected response, and policy version.

---

## 8. Storage and ownership decisions

A-Guy-Web remains the backend owner for student data.

Before implementation, approve:

- Which records are append-only facts.
- Which records are derived and replaceable.
- How corrections are stored without rewriting history.
- Retention periods for raw answers and derived inferences.
- Student deletion and export behavior.
- Who may read or correct each record.
- Session and multi-device conflict behavior.
- Whether raw mathematical responses are needed after grading.

### Hard boundaries

- Analytics is a derived reporting destination, not the source of truth.
- Generic chat memory is not the source of truth for student knowledge.
- AI inference must never overwrite an observation.
- Local API calls using a user must enforce access control.
- Nested Payload operations in hooks must preserve the request transaction.
- Sensitive answer content must not be sent to analytics unless separately approved.

---

## 9. Privacy, safety, and accessibility

### Privacy and safety decisions

- Consent model for minors.
- Data visibility for student, parent, teacher, and administrator.
- Retention and deletion.
- Correction and appeal of an AI inference.
- Mathematical uncertainty and escalation.
- Behavior when the system cannot grade reliably.
- The rule for when the teacher should wait instead of interrupting.

### Accessibility requirements

- Full keyboard path.
- Screen-reader names and status announcements.
- No meaning communicated by color alone.
- Hebrew RTL and mixed RTL/LTR mathematics.
- Focus preservation after feedback.
- Reduced-motion support.
- Text alternative for every visual action.
- Future voice features must have text equivalents.

All Release 1 requirements must include their privacy and accessibility effect.

---

## 10. Measurement baseline

Capture the current baseline before Release 1 behavior changes.

Required baseline measures:

- Answer correctness.
- Attempts per question.
- Hint and solution use when available.
- Time to first action and answer when available.
- Exercise skip and abandonment.
- Lesson completion.
- Current event coverage and missing fields.

The baseline report must distinguish:

- Durable pedagogical records.
- Analytics-only events.
- Data that is not currently collected.
- Data that cannot be interpreted reliably.

Do not invent numerical success targets. Product targets are approved only after the baseline is measured.

---

## 11. Acceptance and test plan

### Automated checks

- Schema unit tests.
- Compatibility fixture tests.
- Invalid-data and version-mismatch tests.
- Access-control tests.
- Observation-versus-inference tests.
- Analytics privacy tests.
- Existing exercise-rendering regression tests.
- TypeScript, lint, formatting, unit, integration, and production build gates.

### QA journeys

1. Open the selected lesson and identify the exact context.
2. Load every pilot exercise fixture.
3. Submit representative valid and invalid answers.
4. Refresh and confirm the baseline state remains consistent.
5. Verify malformed content fails safely.
6. Verify unauthorized users cannot read student evidence.
7. Verify Hebrew RTL, keyboard, and screen-reader-critical behavior.
8. Verify existing tutor chat and non-pilot exercises still work.

QA must record evidence for every acceptance criterion, not only a general approval statement.

---

## 12. Implementation sequence

### Phase A — Approve the contract

- Normalize and identify requirements.
- Resolve V0 scope conflicts.
- Select the Release 1 pilot.
- Approve ownership, privacy, and accessibility decisions.

**Gate:** Product approval.

### Phase B — Harden shared content types

- Inventory block types.
- Implement the pilot discriminated union and runtime schemas.
- Add compatibility fixtures and regression tests.
- Document versioning and migration.

**Gate:** Engineering review and green automated checks.

### Phase C — Define pedagogical schemas

- Add versioned contracts for events, state, inference, action, and evidence.
- Add schema tests and correction-history rules.
- Confirm database ownership and access rules.

**Gate:** Backend, security, and data review.

### Phase D — Establish the baseline and QA harness

- Measure current event coverage.
- Add missing test fixtures and deterministic QA journey definitions.
- Validate privacy and accessibility gates.

**Gate:** QA declares the release testable.

### Phase E — Development deployment

- Run the repository quality gates.
- Deploy to the development environment.
- Run API, browser, regression, security, and accessibility checks.
- Fix all Release 0 blockers.
- Record remaining non-blocking limitations.

**Gate:** QA approval in a separate Release 0 QA document.

### Phase F — Close Release 0

- Mark accepted requirements as QA approved.
- Freeze the approved Release 1 scope.
- Record lessons learned.
- Create the Release 1 implementation plan.

**Gate:** Explicit product approval to proceed.

---

## 13. Release acceptance criteria

Release 0 is complete only when all conditions pass:

- **R0-AC-01:** Every source requirement is mapped, merged, or deferred with a reason.
- **R0-AC-02:** One Release 1 pilot journey and exact content set are approved.
- **R0-AC-03:** The shared pilot content contract is typed and runtime validated.
- **R0-AC-04:** Valid, invalid, compatibility, and versioning tests pass.
- **R0-AC-05:** Observation, inference, action, lesson-state, and evidence contracts are versioned.
- **R0-AC-06:** Data ownership, access, privacy, retention, deletion, and correction rules are approved.
- **R0-AC-07:** Accessibility and Hebrew RTL requirements are testable.
- **R0-AC-08:** The current measurement baseline and known gaps are documented.
- **R0-AC-09:** Repository quality gates and the development deployment pass.
- **R0-AC-10:** QA approves the release with linked evidence.
- **R0-AC-11:** Release 1 has not started before the approval gate.

---

## 14. Risks

### High

- Existing content may depend on shapes that are currently accepted without validation.
- The two specifications describe conflicting V0 sizes.
- Student inference may be treated as fact unless the boundary is enforced.
- Privacy decisions for minors may block storage design.

### Medium

- Existing analytics may create a false impression that durable learning evidence already exists.
- Pilot content may not contain reliable misconception metadata.
- RTL mathematics and visual targeting may expose renderer limitations.
- Broad schema migration may expand Release 0 beyond its purpose.

### Low

- Document naming and internal Kody space slugs may differ from visible labels.

### Mitigation

Keep the pilot narrow, preserve compatibility fixtures, version every contract, separate facts from inference, and stop scope growth at the approved Release 0 boundary.

---

## 15. Rollback and recovery

- Schema changes must remain backward-compatible until migration evidence is approved.
- New contracts should be unused by production behavior until Release 1.
- Development deployment must support reverting to the previous build.
- No destructive migration or deletion is allowed in Release 0.
- Failed QA returns work to the current phase; it does not advance the roadmap.

---

## 16. Deliverables

- Canonical requirement registry.
- Approved Release 1 pilot definition.
- Requirement-to-test traceability matrix.
- Typed and validated pilot content contract.
- Versioned pedagogical data contracts.
- Storage and access decision record.
- Privacy, safety, and accessibility checklist.
- Baseline measurement report.
- Automated test evidence.
- Development deployment evidence.
- Release 0 QA approval document.

---

## 17. Open decisions resolved during Release 0

- Exact pilot topic, lesson, exercise, and question.
- Raw-answer retention policy.
- Student, parent, teacher, and administrator visibility.
- QA approver and required evidence location.
- Numerical Release 1 success targets after baseline measurement.
- The exact WAIT policy for non-intervention.

---

## Approval

**Current state:** Waiting for review.

Approval of this document authorizes detailed Release 0 implementation work only. It does not authorize production deployment or Release 1 implementation.
