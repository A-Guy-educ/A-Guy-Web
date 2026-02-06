# LLP: Remove Diagram Generator, Fix Admin UI, and Ship PDF Stage 1 Reliability

**Last Updated**: 2026-02-06
**Execution Order**: Step 1 → Step 2 → Step 3 (sequential)

---

## Step 1 — Fix Admin UI (1-2 days)

### Goal

Clean up inline styling, improve discoverability, and ensure consistent Payload Admin UX for the conversion workflow.

### Files to Modify

| File                                                               | Action                                                                                        |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `src/ui/admin/exercise-conversion/ConvertForm/index.tsx`           | Replace inline `style={{...}}` objects with Payload CSS variable classes or colocated `.scss` |
| `src/ui/admin/exercise-conversion/LessonConversionPanel/index.tsx` | Same styling cleanup + improve section header/layout                                          |
| `src/ui/admin/exercise-conversion/ConversionStatusPanel/index.tsx` | Same styling cleanup                                                                          |
| `src/ui/admin/exercise-conversion/DraftExercisesList/index.tsx`    | Same styling cleanup                                                                          |
| `src/ui/admin/exercise-conversion/LessonMediaActions/index.tsx`    | Same styling cleanup                                                                          |
| `src/server/payload/collections/Lessons.ts`                        | Move `conversionPanel` UI field to sidebar position (lines 157-165)                           |

### Styling Patterns to Apply

Use Payload Admin CSS variables instead of inline styles:

```scss
// Before (inline)
style={{ padding: 12, backgroundColor: 'var(--theme-elevation-50)' }}

// After (colocated .scss)
@import './ConvertForm.scss';

.conversion-form {
  padding: var(--spacing-3);
  background-color: var(--theme-elevation-50);
}
```

Or use Tailwind if the component is under `/ui/` scope:

```tsx
<div className="p-3 bg-elevation-50">
```

### Specific Changes per File

**ConvertForm**:

- Replace all inline button styles (lines 244-275) with `.btn-primary` / `.btn-secondary` classes
- Replace inline select styles (lines 176-238) with `<Select>` from `@payloadcms/ui`
- Replace container div styles (lines 96-104) with CSS classes

**LessonConversionPanel**:

- Replace panel container styles (lines 124-131) with CSS classes
- Replace inner div styles (lines 143-202) with CSS classes

**ConversionStatusPanel**:

- Keep the badge color logic but extract to CSS classes
- Replace inline progress bar styles (lines 224-241) with CSS

**LessonMediaActions**:

- Replace inline button styles (lines 47-58) with standard button classes

### Visibility Improvement

In `Lessons.ts`, move the `conversionPanel` field from the main form area to the sidebar:

```typescript
{
  name: 'conversionPanel',
  type: 'ui',
  admin: {
    position: 'sidebar',  // Changed from default
    components: {
      Field: '@/ui/admin/exercise-conversion/LessonConversionPanel#LessonConversionPanel',
    },
  },
},
```

### Gate

- [ ] All conversion UI components use CSS classes (no inline `style={{...}}` objects remain)
- [ ] Conversion panel is visible in Lesson edit view sidebar
- [ ] `pnpm tsc --noEmit` passes

---

## Step 2 — Remove Diagram Generator (1-2 days)

### Goal

Completely remove Diagram Generator from the product flow with no diagram dependencies remaining.

### Files to Modify (8 files)

| #   | File                                                         | Changes                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------- | --------------------- |
| 1   | `src/ui/admin/exercise-conversion/ConvertForm/index.tsx`     | Remove `diagramPrompts` state (line 23), `selectedDiagram` state (line 26), `setDiagramPrompts` call (line 49), diagram `<select>` dropdown (lines 217-238), `diagramPromptId` from submit body (line 73)                                                                                                                            |
| 2   | `src/app/api/prompts/for-conversion/route.ts`                | Remove `diagram_generator` query (lines 106-119), `diagramGenerators` from response (lines 140-147)                                                                                                                                                                                                                                  |
| 3   | `src/app/api/exercises/convert/queue/route.ts`               | Remove `diagramPromptId` from request body destructure (line 62), diagram validation block (lines 145-170), `diagramHash` (line 192), diagram fields in job `promptRefs` (line 203), `promptSnapshot` (line 208), `promptSnapshotHash` (line 213)                                                                                    |
| 4   | `src/server/payload/jobs/pdf-to-exercises-task.ts`           | Remove `import { createDiagramMetrics, runDiagramPass }` (lines 20-22), diagram metric output fields (lines 58-64), diagram prompt fetching (lines 119-148), `diagramPrompt` param and usage (lines 155, 547), diagram pass call (lines 543-559), diagram metric aggregation (lines 325-334), diagram debug from segments (line 347) |
| 5   | `src/server/payload/services/exercise-conversion-service.ts` | Remove `diagramPromptId` from `QueueConversionParams` interface (line 13), diagram prompt fetching (lines 98-110), `diagramGenerator` from `promptSnapshot` (line 117), `diagramGeneratorHash` (lines 123-125, 144)                                                                                                                  |
| 6   | `src/server/payload/jobs/types.ts`                           | Remove `DiagramPassMetrics` interface (lines 57-64), `diagramPromptId` from `PdfToExercisesInput.promptRefs` (line 40), `diagramGenerator` from `promptSnapshot` (line 46), `diagramGenerator` from `promptSnapshotHash` (line 52), diagram fields from `PdfToExercisesOutput` (lines 71-76, 83)                                     |
| 7   | `src/server/services/exercise-conversion/helpers.ts`         | Change `validatePromptForUsageAndTenant` expectedUsage union from `'extractor'                                                                                                                                                                                                                                                       | 'verifier' | 'diagram_generator'`to`'extractor' | 'verifier'` (line 71) |
| 8   | `src/server/payload/collections/Prompts.ts`                  | Remove `diagram_generator` option from `usage` select (line 94), update admin description (line 99)                                                                                                                                                                                                                                  |

### Files to Delete Entirely (5 files)

| #   | File                                                            | Lines       |
| --- | --------------------------------------------------------------- | ----------- |
| 1   | `src/server/services/exercise-conversion/diagram-pass.ts`       | 257         |
| 2   | `src/server/services/exercise-conversion/diagram-pass.types.ts` | 36          |
| 3   | `src/infra/llm/prompts/diagram-generator.ts`                    | 48          |
| 4   | `tests/int/diagram-pass.int.spec.ts`                            | 209         |
| 5   | `src/server/payload/jobs/pdf-to-exercises-task.ts.backup`       | (if exists) |

### Tests to Update

| #   | File                                                             | Action                                                                                             |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | `tests/unit/server/services/exercise-conversion/helpers.test.ts` | Remove `diagram_generator` test case from `validatePromptForUsageAndTenant` tests (around line 43) |

### Post-Removal Commands

```bash
# Regenerate types to remove diagram_generator from Prompt.usage union
pnpm generate:types

# Regenerate import map
pnpm generate:importmap

# Type check
pnpm tsc --noEmit

# Verify no broken imports remain
pnpm eslint src/server/services/exercise-conversion/
pnpm eslint src/server/payload/jobs/pdf-to-exercises-task.ts
```

### Gate

- [ ] No `diagram` or `Diagram` references in any source file
- [ ] `pnpm tsc --noEmit` passes
- [ ] Conversion completes successfully without any diagram step
- [ ] Prompts collection still works (admin can create/view extractor/verifier prompts)

---

## Step 3 — PDF Conversion Stage 1 Reliability (3-4 days)

### Goal

Add structured failure classification, per-page retries, deterministic terminal statuses, and baseline metrics.

### 3a. Add Failure Bucket Types

**File**: `src/server/payload/jobs/types.ts`

Add after existing imports:

```typescript
/**
 * Failure classification buckets for PDF conversion errors
 */
export type FailureBucket =
  | 'parse_error' // LLM response couldn't be parsed as JSON
  | 'schema_error' // JSON matched but didn't match required schema
  | 'low_confidence' // LLM indicated low confidence in extraction
  | 'empty_page' // No exercises detected on page
  | 'verification_failed' // Verifier marked exercise as invalid
  | 'llm_error' // LLM API call failed (network, timeout, etc.)

/**
 * Per-page processing metrics
 */
export interface PageMetrics {
  pageIndex: number
  status: 'success' | 'failed'
  failureBucket?: FailureBucket
  retryCount: number
  latencyMs: number
  tokensUsed?: number
  errorMessage?: string
}

/**
 * Extend PdfToExercisesOutput to include page-level metrics
 */
export interface PdfToExercisesOutput {
  // ... existing fields ...
  pageMetrics?: PageMetrics[]
  failureCounts?: Record<FailureBucket, number>
}
```

### 3b. Refactor Per-Page Processing with Retries

**File**: `src/server/payload/jobs/pdf-to-exercises-task.ts`

Changes:

1. Import new types and helper function:

```typescript
import type { FailureBucket, PageMetrics } from './types'
import { classifyFailure } from '@/server/services/exercise-conversion/failure-classifier'
```

2. Add retry configuration via SystemParams:

```typescript
const maxRetriesPerPage = await getPdfConversionMaxRetriesPerPage(tenantId) // New config
```

3. Refactor segment loop to process pages individually:

```typescript
// Before: segment-level processing with hard fail
for (const segment of segments) {
  try {
    await processSegmentWithMultimodal(...)
  } catch (segmentError) {
    output.segmentsFailed++
    throw segmentError  // Kills entire job
  }
}

// After: page-level processing with bounded retries
for (const segment of segments) {
  const segmentPageMetrics: PageMetrics[] = []

  for (let pageIndex = segment.pageStart; pageIndex <= segment.pageEnd; pageIndex++) {
    let retries = 0
    let pageStatus: 'success' | 'failed' = 'failed'
    let failureBucket: FailureBucket | undefined
    let errorMessage: string | undefined

    while (retries <= maxRetriesPerPage) {
      try {
        await processSinglePage(pageIndex, ...)
        pageStatus = 'success'
        failureBucket = undefined
        break  // Success, exit retry loop
      } catch (error: any) {
        failureBucket = classifyFailure(error)
        errorMessage = error.message
        retries++

        if (retries > maxRetriesPerPage) {
          // Final failure after all retries
          break
        }

        // Log retry attempt
        console.warn(`[PDF→Exercises] Page ${pageIndex} retry ${retries}/${maxRetriesPerPage}: ${failureBucket}`)
      }
    }

    segmentPageMetrics.push({
      pageIndex,
      status: pageStatus,
      failureBucket,
      retryCount: retries,
      latencyMs: 0, // Measure actual latency
      errorMessage,
    })
  }

  output.pageMetrics.push(...segmentPageMetrics)
}
```

4. Add deterministic terminal status determination:

```typescript
function determineTerminalStatus(
  pageMetrics: PageMetrics[],
  hasHardErrors: boolean,
): 'completed' | 'completed_with_failures' | 'failed' {
  if (hasHardErrors) {
    return 'failed'
  }

  const failedPages = pageMetrics.filter((p) => p.status === 'failed')
  if (failedPages.length === 0) {
    return 'completed'
  }

  return 'completed_with_failures'
}
```

5. Update `updateJobStatus` to handle new statuses:

```typescript
async function updateJobStatus(
  payload: any,
  jobId: string,
  status: 'completed' | 'completed_with_failures' | 'failed',
  output?: any,
): Promise<void> {
  // ... existing logic ...
}
```

### 3c. Add Failure Classification Helper

**New File**: `src/server/services/exercise-conversion/failure-classifier.ts`

```typescript
import type { FailureBucket } from '@/server/payload/jobs/types'

export function classifyFailure(error: Error): FailureBucket {
  const message = error.message || ''
  const code = (error as any).code || ''

  if (code === 'PARSE_EXTRACTOR_RESPONSE_FAILED' || code === 'PARSE_VERIFIER_RESPONSE_FAILED') {
    return 'parse_error'
  }

  if (code === 'VALIDATION_FAILED') {
    return 'schema_error'
  }

  if (message.includes('No exercises detected') || message.includes('empty')) {
    return 'empty_page'
  }

  if (code === 'VERIFICATION_FAILED') {
    return 'verification_failed'
  }

  if (message.includes('LLM') || message.includes('AI') || message.includes('model')) {
    return 'llm_error'
  }

  // Default to parse_error for unknown failures
  return 'parse_error'
}
```

### 3d. Update ConversionStatusPanel for New Statuses

**File**: `src/ui/admin/exercise-conversion/ConversionStatusPanel/index.tsx`

Changes:

1. Add new status type:

```typescript
interface JobStatus {
  id: string
  status: 'queued' | 'running' | 'completed' | 'completed_with_failures' | 'failed'
  // ... existing fields ...
}
```

2. Update badge colors:

```typescript
const getBadgeStyle = (status: string) => {
  switch (status) {
    case 'completed':
      return { backgroundColor: 'var(--theme-success-100)', color: 'var(--theme-success)' }
    case 'completed_with_failures':
      return { backgroundColor: 'var(--theme-warning-100)', color: 'var(--theme-warning)' }
    case 'failed':
      return { backgroundColor: 'var(--theme-error-100)', color: 'var(--theme-error)' }
    // ... other cases ...
  }
}
```

3. Add failure bucket breakdown:

```typescript
{status.status === 'completed_with_failures' && status.output?.failureCounts && (
  <div className="failure-breakdown">
    {Object.entries(status.output.failureCounts).map(([bucket, count]) => (
      <div key={bucket} className="failure-item">
        <span className="bucket-name">{bucket.replace('_', ' ')}</span>
        <span className="bucket-count">{count}</span>
      </div>
    ))}
  </div>
)}
```

4. Add metrics summary:

```typescript
{status.output?.pageMetrics && (
  <div className="metrics-summary">
    <div>Success Rate: {successRate}%</div>
    <div>Avg Latency: {avgLatency}ms</div>
    <div>Retries: {totalRetries}</div>
  </div>
)}
```

### 3e. Add New SystemParam

**File**: `src/infra/config/system-params.ts` (or appropriate location)

```typescript
export async function getPdfConversionMaxRetriesPerPage(tenantId: string): Promise<number> {
  const key = 'pdfConversionMaxRetriesPerPage'
  const value = await getSystemParam<string>(key, tenantId)
  return value ? parseInt(value, 10) : 2 // Default 2 retries
}
```

### Files Modified for Stage 1

| File                                                               | Changes                                                                                   |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `src/server/payload/jobs/types.ts`                                 | Add `FailureBucket`, `PageMetrics` types, update `PdfToExercisesOutput`                   |
| `src/server/payload/jobs/pdf-to-exercises-task.ts`                 | Refactor to per-page processing, add retry loop, deterministic status, metrics collection |
| `src/server/services/exercise-conversion/failure-classifier.ts`    | **New file** — classify errors into buckets                                               |
| `src/ui/admin/exercise-conversion/ConversionStatusPanel/index.tsx` | Display `completed_with_failures`, failure buckets, metrics                               |
| `src/infra/config/system-params.ts`                                | Add `pdfConversionMaxRetriesPerPage` config                                               |

### Gate

- [ ] Schema validation blocks invalid extraction outputs (existing behavior retained)
- [ ] Every failed page is classified into a defined `FailureBucket`
- [ ] Retry policy is bounded (max 2 retries per page by default)
- [ ] Terminal statuses are deterministic: `completed`, `completed_with_failures`, or `failed`
- [ ] Per-page metrics are persisted in job output
- [ ] `ConversionStatusPanel` displays success rate, latency, failure breakdown
- [ ] `pnpm tsc --noEmit` passes

---

## Rollout Plan

| Phase   | Changes                      | Deployment                                             |
| ------- | ---------------------------- | ------------------------------------------------------ |
| Phase 1 | Step 1 (UI fixes only)       | Deploy to dev, verify styling                          |
| Phase 2 | Step 2 (Diagram removal)     | Deploy to dev, verify conversion works without diagram |
| Phase 3 | Step 3 (Stage 1 reliability) | Enable new retry/metrics behavior for all new jobs     |

Each phase:

1. Deploy to development environment
2. Run integration tests
3. Manual QA on a sample PDF
4. Deploy to staging
5. Monitor for 24 hours before production

---

## Command Checklist

Run these commands after each step:

```bash
# After Step 1 (UI)
pnpm lint:fix
pnpm tsc --noEmit

# After Step 2 (Diagram removal)
pnpm generate:types
pnpm generate:importmap
pnpm tsc --noEmit

# After Step 3 (Stage 1)
pnpm tsc --noEmit
pnpm test:int
```

---

## Parallelization Note

Steps 1 and 2 can run in parallel since they modify different files (Step 1 touches UI components, Step 2 touches backend). However, Step 2 modifies `ConvertForm/index.tsx` which Step 1 also touches. To avoid merge conflicts:

- **Option A**: Do Step 1 first, then Step 2
- **Option B**: Run both in parallel but coordinate file ownership

Recommended: **Sequential execution** as approved.

---

## Time Estimate Summary

| Step                        | Effort              | Files        | Days         |
| --------------------------- | ------------------- | ------------ | ------------ |
| Step 1: UI Fix              | 6 files             | 6 files      | 1-2          |
| Step 2: Diagram Removal     | 8 modify + 5 delete | 13 files     | 1-2          |
| Step 3: Stage 1 Reliability | 5 files             | 5 files      | 3-4          |
| **Total**                   | **19 files**        | **24 items** | **5-8 days** |
