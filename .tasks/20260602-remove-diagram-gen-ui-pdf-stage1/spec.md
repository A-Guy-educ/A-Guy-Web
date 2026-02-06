# Spec: Remove Diagram Generation, Standardize Admin UI, and Ship PDF Conversion Stage 1

## Document Control

- Date: 2026-02-06
- Owner: Product + Engineering
- Status: Draft for implementation
- Scope Type: Product + Platform flow simplification

## Goal

Simplify and stabilize the PDF conversion flow by:

1. fully removing Diagram Generator from the product flow,
2. standardizing the related UI into a proper Payload Admin experience,
3. delivering Stage 1 reliability foundations for PDF conversion (validation, per-page execution, retries, and baseline observability).

Success means a user can complete PDF conversion end-to-end without Diagram Generator dependencies, from a clean Admin page, with predictable error handling and measurable reliability metrics.

## Problem Statement

- The current flow includes a Diagram Generator step with high complexity and low demonstrated value.
- Diagram Generator introduces fragility and can break the core conversion flow.
- Current link/page UX is not aligned with standard Payload Admin structure (non-standard header/sidebar and unclear navigation).
- Current conversion pipeline lacks strong Stage 1 reliability controls (failure taxonomy, per-page retry strategy, and baseline metrics), making improvements hard to measure.

## Product Decisions (Locked)

1. Diagram Generator is removed from the product flow now.
2. PDF conversion completion must not depend on any diagram-related step.
3. The conversion page must be delivered as a standard Payload Admin page/layout.
4. Stage 1 reliability work is mandatory in this implementation window.

## Scope

### In Scope

- Remove Diagram Generator from:
  - user-visible flow steps,
  - backend orchestration path,
  - blocking validations/gates,
  - related UI controls/CTAs in the conversion journey.
- Introduce a standard Payload Admin page for conversion operations:
  - consistent header/sidebar,
  - clear route and clean navigation entry/link,
  - standard action placement and status presentation.
- Implement PDF Conversion Stage 1:
  - strict structured output validation,
  - explicit failure buckets,
  - per-page processing,
  - bounded retries per page,
  - baseline metrics collection.

### Out of Scope

- Rebuilding Diagram Generator as optional/async in this stage.
- Advanced image normalization pipeline beyond minimal existing preprocessing.
- Golden dataset and regression harness (future stage).
- Major redesign of the entire admin IA (only conversion-related UX is targeted).

## Requirements

## 1) Diagram Generator Removal

### Functional Requirements

- FR-D1: No conversion request can enter or require a diagram generation step.
- FR-D2: Any existing Diagram Generator status fields used as blockers must be detached from completion criteria.
- FR-D3: User-facing flow copy must remove references to diagram generation as a required step.
- FR-D4: Existing historical records with diagram-related state must remain readable (no destructive data migration required for MVP removal).

### Non-Functional Requirements

- NFR-D1: Removal must reduce failure surface area; no new blocking step may be introduced.
- NFR-D2: Backward compatibility for reading legacy entities must be maintained.

## 2) Admin UI Standardization (Payload-native)

### Functional Requirements

- FR-U1: Conversion page must render inside standard Payload Admin shell (default header and sidebar).
- FR-U2: Navigation/link label to conversion page must be clear and concise.
- FR-U3: Route should be predictable and clean (resource-based pathing, minimal noisy query params).
- FR-U4: The page must expose primary conversion actions and status in a standard admin interaction model.

### UX Requirements

- UX-U1: A user can reach conversion page from one obvious entry point.
- UX-U2: Page title, breadcrumbs, and primary action are immediately understandable.
- UX-U3: Error and success states are visible in-page without custom/non-standard shells.

## 3) PDF Conversion Stage 1 Reliability

### Functional Requirements

- FR-P1: Enforce schema validation on extraction outputs (structured contract required).
- FR-P2: Classify failures into explicit buckets at minimum:
  - `parse_error`
  - `schema_error`
  - `low_confidence`
  - `empty_page`
- FR-P3: Process PDF conversion per-page, not as a single all-or-nothing unit.
- FR-P4: Add bounded retry policy per page (configurable max retry count).
- FR-P5: Failure of a subset of pages must not hard-fail the entire document processing lifecycle; final status must reflect partial failures explicitly.
- FR-P6: Persist baseline operational metrics for each job:
  - success/failure counts,
  - latency per page,
  - retry count,
  - estimated cost/tokens if available.

### Non-Functional Requirements

- NFR-P1: Idempotent retry behavior for the same page attempt context.
- NFR-P2: Deterministic status transitions (no ambiguous terminal state).
- NFR-P3: Logging and metrics must support post-mortem analysis by failure bucket.

## Architecture and Flow Changes (HLS)

## Current (to be replaced)

- Step chain includes Diagram Generator as an in-flow dependency.
- UI entry/page is not aligned with standard Payload Admin shell.
- Limited structured failure semantics for conversion troubleshooting.

## Target

1. User opens conversion from standard Payload Admin page.
2. PDF processing runs page-by-page.
3. Each page result is validated against schema.
4. Failed pages are bucketed and retried within limits.
5. Job completes with deterministic aggregate outcome:
   - `completed`
   - `completed_with_failures`
   - `failed` (only when hard-stop criteria are met)
6. Diagram generation is absent from the flow and from completion gates.

## Low-Level Implementation Plan (LLP)

## Workstream A — Remove Diagram Generator

1. Remove diagram step from orchestrator/state machine.
2. Remove diagram dependencies from completion logic.
3. Remove/replace diagram-related UI controls and helper text.
4. Verify legacy records can still be read/rendered safely.

## Workstream B — Standard Payload Admin UX

1. Register conversion page as a proper Payload Admin view.
2. Place navigation entry in standard admin structure.
3. Normalize route/link naming and page title semantics.
4. Ensure status, action, and feedback components use standard admin conventions.

## Workstream C — PDF Stage 1 Reliability

1. Define/lock output schema and validator wiring.
2. Implement per-page processing envelope and retry controller.
3. Implement failure bucketing and deterministic terminal statuses.
4. Add baseline metrics and structured logs.
5. Expose summary status in admin page.

## Data and Migration Strategy

- No destructive migration in this phase.
- Diagram-related historical fields may remain but become non-blocking/deprecated.
- If deprecation markers are added, they must be additive and backward compatible.

## Security and Access Requirements

- Preserve existing Payload access control semantics for conversion operations.
- Any Local API calls with user context must enforce `overrideAccess: false`.
- Any nested Payload operations inside hooks must pass `req` to preserve transaction safety.
- No new endpoint or page action may bypass authorization checks.

## Observability and Reporting

- Required metrics (minimum):
  - total jobs,
  - per-job page count,
  - page success rate,
  - failures by bucket,
  - retry distribution,
  - average latency/page.
- Required logs:
  - job start/end,
  - page attempt lifecycle,
  - validation failures with bucket reason,
  - terminal job outcome.

## Acceptance Criteria (Gates)

## Gate 1 — Diagram Removal

- No user flow path includes Diagram Generator.
- Conversion can complete successfully without any diagram field/status.
- UI has no required-step copy referencing diagrams.

## Gate 2 — Admin UI Standard

- Conversion page is rendered within standard Payload Admin shell.
- Header/sidebar and navigation are consistent with existing admin pages.
- Link/entry is clean, understandable, and reachable in one clear path.

## Gate 3 — Stage 1 Reliability

- Schema validation actively blocks invalid extraction outputs from silent acceptance.
- Every failed page is classified into a defined bucket.
- Retry policy is bounded and auditable.
- Job-level terminal statuses are deterministic and visible.
- Baseline metrics are emitted and queryable.

## Test Plan

- Unit:
  - validation and failure bucket mapping,
  - retry policy boundaries,
  - terminal status reducer/aggregator.
- Integration:
  - end-to-end conversion without diagram step,
  - partial page failures produce `completed_with_failures`,
  - admin page loads with standard layout and functional action flow.
- Regression:
  - legacy records containing diagram-era fields remain readable.

## Risks and Mitigations

- Risk R1: Hidden dependencies on diagram fields break downstream logic.
  - Mitigation: dependency scan + feature-flagged removal rollout if needed.
- Risk R2: UI standardization introduces routing regressions.
  - Mitigation: explicit route tests + navigation smoke tests.
- Risk R3: Per-page retries increase cost unexpectedly.
  - Mitigation: hard retry caps + metric alerts on retry distribution.

## Rollout Plan

- Phase 1: Deploy with diagram flow removed and UI standardized.
- Phase 2: Enable Stage 1 reliability controls for all new jobs.
- Phase 3: Monitor metrics for 7 days and tune retry thresholds.

## Timebox

- Total: 5-8 engineering days.
- Workstream A (Diagram removal): 1-2 days.
- Workstream B (Admin standardization): 1-2 days.
- Workstream C (Stage 1 reliability): 3-4 days.

## Definition of Done

- All three gates pass.
- Tests for changed behavior are added and green.
- No diagram dependency remains in conversion completion path.
- Conversion is operable from a standard Payload Admin page.
- Stage 1 reliability metrics are available for operational review.
