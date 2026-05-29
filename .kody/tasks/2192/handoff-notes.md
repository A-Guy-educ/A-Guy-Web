# Handoff Notes - Issue #2192

## What was implemented

Added a mobile chat FAB (Floating Action Button) that opens a bottom-anchored panel on lesson pages. This is a redo of the reverted PR #2155.

## Files changed

1. **src/ui/web/chat/MobileChatFAB/index.tsx** (NEW)
   - MobileChatFAB component with FAB button and bottom panel
   - Handles Escape key and collapse button for closing
   - Listens to `focus-chat-input` event to auto-open (wrong-answer flows)
   - Uses `left-6 bottom-6` positioning (NOT `start-6` for correct RTL)

2. **src/ui/web/components/split-pane-layout.tsx**
   - Added `fabPanelOpen` state for FAB panel visibility
   - Mounts MobileChatFAB wrapping ChatInterface on mobile
   - Passes `fabOpen` prop to ChatInterface

3. **src/ui/web/chat/ChatInterface/index.tsx**
   - Added `fabOpen` prop to ChatInterfaceProps
   - Input container hidden when `fabOpen=true` (avoids duplicate chat UIs)

4. **src/i18n/en.json and src/i18n/he.json**
   - Added `openChat`, `closeChat`, `chatPanelTitle` keys under `courses` namespace

5. **tests/unit/components/MobileChatFAB.test.tsx** (NEW)
   - Regression tests for FAB visibility, panel opening/closing, Escape key handling

## Key design decisions

- FAB rendered OUTSIDE ChatInterface in SplitPaneLayout (not inside ChatInterface)
- `fabPanelOpen` state managed in SplitPaneLayout, passed as `fabOpen` to ChatInterface
- When FAB panel is open, ChatInterface input is hidden via `className={fabOpen && 'hidden'}`
- Uses existing `focus-chat-input` event to auto-open panel (preserves exercise wrong-answer flow)
- Bottom panel: `max-h-[60dvh]`, `left-0 right-0 bottom-0`, exercise stays visible above

## Follow-up items

1. **Manual QA for Hebrew RTL** - Verify FAB appears at bottom-left in Hebrew (left-6, not start-6)
2. **End-to-end send test** - Verify POST /api/agent/chat/stream works correctly with the new FAB panel
