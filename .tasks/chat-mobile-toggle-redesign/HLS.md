# HLS — Mobile Chat Toggle (Mode-Based, Mobile Only)

## 1. Goal
Enable mobile users (non-PC devices) to explicitly switch between full-screen learning content (PDF) and full-screen chat, ensuring content is never obstructed unless the user chooses it.

---

## 2. Scope

### In Scope
- Mobile-only behavior (any non-PC device)
- Explicit mode switching between PDF and Chat
- Chat state retained while hidden
- Header-based toggle
- Existing split chat behavior reused when typing in PDF mode

### Out of Scope
- Desktop behavior changes
- Gestures
- Animations
- Cross-page or cross-session persistence
- New layout systems or resizing logic

---

## 3. Definitions

### Device Classification
- **Mobile**: any non-PC device (phones, tablets)
- **Desktop**: PC / laptop devices

### Modes (Mobile Only)
- **PDF Mode** (default)
- **Chat Mode**

---

## 4. Mode Behavior

### 4.1 PDF Mode (Default)
- PDF / exercise content occupies the full screen
- Chat input bar is visible at the bottom
- Chat message list is not visible

**Interaction inside PDF Mode**
- If the user starts typing or sends a message:
  - Chat expands into the existing split layout
  - PDF remains visible on top
  - Chat appears on the bottom, scalable as currently implemented

This expansion does **not** change the explicit mode.

---

### 4.2 Chat Mode
- Chat occupies the entire screen
- PDF / exercise content is completely hidden
- Full chat history is visible

---

## 5. Mode Switching

- Mode switching is **explicit only**
- Controlled by a toggle in the **top header**
- Toggle switches between:
  - PDF Mode ↔ Chat Mode
- Switching to PDF Mode always collapses any expanded split view

---

## 6. State Model (Mobile)

### State Variables
- `viewMode`: `PDF | CHAT` (page-local)
- `chatExpandedInPdf`: `boolean`

### State Rules
- On page entry (mobile):
  - `viewMode = PDF`
  - `chatExpandedInPdf = false`
- Header toggle:
  - Sets `viewMode`
  - If switching to PDF → `chatExpandedInPdf = false`
- Typing/sending message in PDF Mode:
  - Sets `chatExpandedInPdf = true`

---

## 7. Chat State Retention
- Chat messages, scroll position, and input state are preserved
- Visual hiding must not reset or destroy chat data

---

## 8. Layout Rules

### PDF Mode (Collapsed)
- PDF fills available viewport
- Chat input bar visible
- No chat message list visible

### PDF Mode (Expanded Split)
- Existing behavior:
  - PDF on top
  - Chat on bottom
- Triggered only by user typing/sending a message

### Chat Mode
- Chat fills entire viewport
- PDF not rendered

---

## 9. Controls

- Single toggle in the top header
- No secondary controls
- No gesture-based interaction
- Transitions are instant

---

## 10. Desktop Contract
- No toggle rendered
- No behavior or layout changes
- No regressions

---

## 11. Acceptance Criteria

### Mobile
- Default entry mode is PDF Mode
- Header toggle switches cleanly between PDF and Chat modes
- Chat input bar is always visible in PDF Mode
- Typing in PDF Mode expands chat into split layout
- Explicit toggle back to PDF collapses split layout
- Chat data persists across all mode switches within the page

### Desktop
- Behavior remains unchanged

---

## 12. Definition of Done
- Mobile behavior matches the mode definitions exactly
- No implicit mode switches
- No content obstruction outside explicit user actions
- Desktop behavior untouched
