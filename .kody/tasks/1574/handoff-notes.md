# Feature: Show Per-Message Timestamps in Admin Chat

## What was implemented

Added per-message timestamps to admin chat bubbles. The timestamp shows:
- **Same day**: "14:32" (time only)
- **Older**: "May 11, 14:32" (short date + time)
- **Hebrew locale**: Proper Hebrew month names (e.g., "11 במאי, 14:32")

## Key files

- `src/ui/web/chat/utils/formatMessageTime.ts` — New utility function
- `src/ui/web/chat/ChatInterface/index.tsx` — Uses `formatMessageTime` at line 548-552
- `tests/unit/ui/web/chat/utils/format-message-time.test.ts` — 9 unit tests (all passing)

## Implementation details

Timestamps only appear in `adminMode` for messages that have a `createdAt` field. The `createdAt` is set when messages are created via `useNotebookChat` hook.

## Verification

- Unit tests: `pnpm exec vitest run --config ./vitest.config.unit.mts tests/unit/ui/web/chat/utils/format-message-time.test.ts` — 9/9 passing
- Lint: passes (warning only on unrelated file)
- Typecheck: passes