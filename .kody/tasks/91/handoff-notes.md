Fixed two items from the PR review feedback on branch 90--doc-gap-srcinfraanalytics-0-ai-summary-coverage.

1. system-events-subscriber.ts @ai-summary: corrected the "sole non-test caller" claim. The module is the bridge between systemEventBus and analytics.track() triggered by system events — but usePageAbandonment.ts (lines 46, 52, 74) and useSessionDuration.ts (line 34) also call analytics.track() directly. Updated the header to say "Other hooks (usePageAbandonment, useSessionDuration) call analytics.track() directly."

2. context.json:7 and handoff-notes.md: changed "20" to "24" to match the actual diff (24 source files modified). handoff-notes.md also had "23" which was also corrected to 24.

No code logic changed — purely additive documentation fix. Quality gate passed.
