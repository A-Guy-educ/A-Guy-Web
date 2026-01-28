Goal

Improve mobile usability by allowing students to fully close and reopen the chat, ensuring the learning content and exercises remain clear and unobstructed on small screens.

Descriptiona

On mobile devices only, the chat must include a clear toggle button that allows the user to:

Fully close the chat

Fully reopen the chat when needed

Closing the chat should remove it completely from view, not minimize or overlay the exercise content.

Scope

Included

Chat toggle button (open / close)

Mobile-only behavior

Chat closes completely (no overlay, no hidden content) with a small button to open it again

Chat can be reopened at any time

Exercise / PDF content is always fully visible when chat is closed

Out of Scope

Desktop behavior changes

Chat resizing or partial minimize states

Persistent chat state between sessions (unless already supported)

User Flow (Mobile)

User opens chat

User taps “Close Chat” button

Chat disappears completely

Exercise / learning content fills the screen

User taps “Open Chat” button to return to chat

UX Requirements

Toggle button must be clearly visible

Button should not overlap important content

State must be obvious (chat open vs closed)

No accidental chat re-opening during scrolling

Acceptance Criteria

Chat toggle is available only on mobile

Chat can be fully closed and reopened

When chat is closed:

No part of the chat UI is visible

Exercises and content are not obscured

When chat is reopened:

Previous chat messages are preserved (if already supported)

No regression on desktop behavior
