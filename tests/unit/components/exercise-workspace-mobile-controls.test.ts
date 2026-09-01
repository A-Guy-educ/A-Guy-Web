import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

describe('ExerciseWorkspace mobile controls contract', () => {
  const workspaceSource = readFileSync(
    path.join(
      process.cwd(),
      'src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/exercises/[exerciseSlug]/_components/ExerciseWorkspace/index.tsx',
    ),
    'utf8',
  )
  const pagerSource = readFileSync(
    path.join(
      process.cwd(),
      'src/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/_components/ExercisesPager/index.tsx',
    ),
    'utf8',
  )
  const splitPaneSource = readFileSync(
    path.join(process.cwd(), 'src/ui/web/components/split-pane-layout.tsx'),
    'utf8',
  )

  // The mobile "Unified Help" panel that used to host <FormulaSheetContent>
  // inside ExerciseWorkspace was removed with the HelpCircle FAB. Formula
  // sheet is now reachable via ChatInterface's own FormulaSheetButton inside
  // the mobile chat pane. ExerciseWorkspace still accepts `formulaSheet` for
  // API compatibility with callers, so the pager continues to pass it.
  it('passes formula sheet data through to the exercise workspace', () => {
    expect(pagerSource).toContain('formulaSheet={formulaSheet}')
  })

  it('no longer wires the mobile fullscreen toggle (retired with the exercise header)', () => {
    // The `isFullscreen` prop + its four hidden-class selectors were
    // dropped from SplitPaneLayout when the mobile Maximize2 entry point
    // went away with ExerciseHeader. Pinned so the dead code doesn't
    // quietly get re-added.
    expect(splitPaneSource).not.toContain('isFullscreen')
  })

  it('mounts the floating LessonMenu instead of the old title/back chrome', () => {
    // The desktop ExerciseHeader (title + logo row) and the mobile
    // floating back arrow were both replaced by <LessonMenu> mounted
    // inside ExerciseWorkspace. The LessonMenu handles back navigation +
    // view-mode switching from a single fixed pill.
    expect(workspaceSource).toContain('<LessonMenu')
    expect(workspaceSource).toContain('useLessonMenuConfig()')
  })

  it('keeps the mobile chat back-to-exercise button inside the chat panel', () => {
    const en = readFileSync(path.join(process.cwd(), 'src/i18n/en.json'), 'utf8')
    const he = readFileSync(path.join(process.cwd(), 'src/i18n/he.json'), 'utf8')
    expect(en).toMatch(/"backToExercise":\s*"back to exercise"/)
    expect(he).toMatch(/"backToExercise":\s*"חזור לתרגיל"/)

    // MobileChatPanel still hosts an X button that flips mobileMode back
    // to 'exercise' — that's how the student escapes the mobile chat pane.
    expect(workspaceSource).toContain("t('backToExercise')")
    expect(workspaceSource).toContain("onBackToExercise={() => handleMobileModeChange('exercise')}")
  })

  it('does not modify the forbidden files', () => {
    const backButtonSource = readFileSync(
      path.join(process.cwd(), 'src/ui/web/components/BackButton/index.tsx'),
      'utf8',
    )
    const chatInterfaceSource = readFileSync(
      path.join(process.cwd(), 'src/ui/web/chat/ChatInterface/index.tsx'),
      'utf8',
    )
    expect(backButtonSource).not.toContain('backToExercise')
    expect(chatInterfaceSource).not.toContain('backToExercise')
  })
})
