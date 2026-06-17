Fixed 3 technical inaccuracies in docs/exercises/README.md flagged in the review of PR #141.

Changes:
- Corrected pageState type: doc showed 'exercises' | 'pdf' | 'workspace', actual is { type: 'intro' } | { type: 'content'; initialExerciseIndex: number } | { type: 'workspace' }
- Corrected routing table: replaced direct ExercisesPager/PdfLessonPager routing with accurate DualModeLessonView + visibleRenderers description
- Fixed diagram description: "Routes to ExercisesPager / PdfLessonPager / workspace" → "Routes to DualModeLessonView or ExerciseWorkspace"

Verified against: useLessonIntroPage.ts:5-8 and LessonIntroPage/index.tsx:94-98.
