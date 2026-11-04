/**
 * ESLint Rule: no-raw-web-storage
 *
 * Keeps `localStorage` / `sessionStorage` access inside the storage layer
 * (`src/client/state/`). Schools share computers, so every piece of a
 * student's data in the browser must be known to that layer:
 *
 * - listed in `userScopedStorage` so it is wiped when another student signs in;
 * - synced through `learningStateSync` if it should follow the student to
 *   other computers.
 *
 * A component that calls `localStorage.setItem` directly bypasses both: the
 * next student sees the data, and the student loses it on another machine.
 *
 * The rule shipped with an exceptions list (GRANDFATHERED) of files that
 * predate it. Each was reviewed when the rule landed: their keys are either
 * device-level (theme, pane sizes, guest id, analytics) or already listed in
 * `userScopedStorage`. Never add to the list to silence a new error — add a
 * module under src/client/state/ instead. Shrinking it is always welcome.
 *
 * @example
 * // ❌ BAD — invisible to the shared-device wipe and the server sync
 * localStorage.setItem('my-feature:answers', JSON.stringify(answers))
 *
 * // ✅ GOOD — a storage module owns the key and registers it
 * import { saveAnswers } from '@/client/state/localStorage/myFeature'
 */

const STORAGE_GLOBALS = new Set(['localStorage', 'sessionStorage'])
const GLOBAL_OBJECTS = new Set(['window', 'globalThis', 'self'])

const STORAGE_LAYER = 'src/client/state/'

/** Files that predate the rule. Do not add to this list. */
export const GRANDFATHERED = new Set([
  // Per-student keys, listed in userScopedStorage (and synced where noted).
  'src/app/(frontend)/courses/[courseSlug]/_components/CoursePageContent/index.tsx',
  'src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ChatLessonView/useLessonChatProgress.ts', // synced
  'src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/DualModeLessonView/useLessonViewMode.ts',
  'src/client/hooks/useChatProgressMap.ts',
  'src/ui/web/exerciserenderer/utils/exerciseStateStorage.ts', // synced
  'src/ui/web/upsell/TokenUsageAlert.tsx',
  'src/ui/web/components/onboarding-tip.tsx',
  'src/infra/analytics/adapters/mixpanel/adapter.ts',
  'src/infra/analytics/components/UserIdentificationTracker.tsx',
  'src/infra/analytics/utils/user-properties-cache.ts',
  // Device-level preferences.
  'src/ui/web/components/accent-picker.tsx',
  'src/ui/web/components/resizable-pane.tsx',
  'src/ui/web/components/split-pane-layout.tsx',
  'src/ui/web/providers/Theme/ThemeSelector/index.tsx',
  // sessionStorage only: per tab, gone when the tab closes.
  'src/app/(frontend)/ask/_components/AskPrimaryContent/index.tsx',
  'src/app/(frontend)/courses/[courseSlug]/_components/CourseComposer/useCourseComposerDropToAsk.ts',
  'src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/LessonAnalytics.tsx',
  'src/app/(frontend)/join/_lib/join-enrollment.ts',
  'src/client/hooks/useGuestJsBeacon.ts',
  'src/infra/analytics/core/tracker.ts',
  'src/infra/analytics/providers/AnalyticsProvider.tsx',
  'src/infra/analytics/system-events-subscriber.ts',
  'src/infra/analytics/utils/lesson-load-timing.ts',
  'src/infra/system-events/bus.ts',
])

function projectPathOf(filename) {
  const normalized = filename.replace(/\\/g, '/')
  const index = normalized.lastIndexOf('/src/')
  return index === -1 ? undefined : normalized.slice(index + 1)
}

function storageName(node) {
  if (node.object.type === 'Identifier' && STORAGE_GLOBALS.has(node.object.name)) {
    return node.object.name
  }
  if (
    !node.computed &&
    node.property.type === 'Identifier' &&
    STORAGE_GLOBALS.has(node.property.name) &&
    node.object.type === 'Identifier' &&
    GLOBAL_OBJECTS.has(node.object.name)
  ) {
    return node.property.name
  }
  return undefined
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Access browser storage only through the storage layer in src/client/state/',
      category: 'Architecture',
      recommended: true,
    },
    messages: {
      rawStorage:
        'Do not use {{name}} directly. Add a module under src/client/state/ that owns the key — list per-student keys in userScopedStorage (wiped on user switch) and sync them via learningStateSync if they should follow the student.',
    },
    schema: [],
  },

  create(context) {
    const projectPath = projectPathOf(context.filename ?? context.getFilename())
    if (!projectPath || projectPath.startsWith(STORAGE_LAYER)) return {}
    if (GRANDFATHERED.has(projectPath)) return {}

    return {
      // Matches `localStorage.x` and `window.localStorage` — so
      // `window.localStorage.getItem(...)` is reported once, at its inner part.
      MemberExpression(node) {
        const name = storageName(node)
        if (name) context.report({ node, messageId: 'rawStorage', data: { name } })
      },
    }
  },
}

export default rule
