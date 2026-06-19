## Applied Specialist Review Feedback — Session (kody) — CONTINUED

This session continues from a context-compacted previous session. The prior session fixed: auth redirect bug (page.tsx), race condition (pendingAiMapRef), CtaSection contrast.

This session fixed the remaining 2 BLOCK-level bugs that were confirmed but not fully addressed:

### BLOCK 1 — Quick-question buttons read stale simulationInput (session cont.)
**File:** `SimulationSection.tsx:118` + `index.tsx:53`
**Bug:** `onClick={() => { onInputChange(q); onSend() }}` fires synchronously — `onSend()` reads `simulationInput` which is still `''` (setState is async) and returns early.
**Fix:** Changed `SimulationSectionProps.onSend` signature to `(directText?: string) => void`. Quick-question buttons now call `onClick={() => onSend(q)}` (no onInputChange needed). `handleSimulationSend` uses `const text = (directText ?? simulationInput).trim()`. The send button wrapper also changed from `onClick={onSend}` to `onClick={() => onSend()}` to avoid passing the MouseEvent as the directText argument.

### BLOCK 2 — Catch filter removed ALL matching user messages (session cont.)
**File:** `index.tsx:72`
**Bug:** `prev.filter((m) => m.role !== 'user' || m.text !== text)` removes every user message with that text, not just the last one. If a user sent "איך פותרים?" twice, the error handler would remove BOTH.
**Fix:** Added `id: number` to the message type. `handleSimulationSend` now passes `{ id: msgId, role: 'user', text }` when creating messages. The catch filter changed to `prev.filter((m) => m.id !== msgId)` — removes only the one message with the captured ID.

### Files changed (this session only)
- `src/app/(frontend)/start/_components/NewStartPage/SimulationSection.tsx` — onSend type + quick-question fix + send button wrapper
- `src/app/(frontend)/start/_components/NewStartPage/index.tsx` — message id field + handleSimulationSend directText param + catch filter fix

### Open items (from prior session, still outstanding)
- rgba() hardcoded values throughout sub-components (low priority — followups.json)
- E2E test gaps for onboarding, tab switching, simulation (medium priority — followups.json)
- Dead gradient tokens in tailwind.tokens.mjs (low priority — followups.json)
