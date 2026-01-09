# Fix: Chat History Persistence on Page Refresh

## Problem

In the exercise page (`/courses/.../exercises/:id`), chat conversation history was lost after page refresh. The chat would always start with only the welcome message, even if the user had an existing conversation.

## Root Cause

The `NotebookChat` component was using client-side `useState` with only an initial welcome message. It never fetched existing conversation history from the database on component mount.

```typescript
// Before - Only initial message, no history loading
const [messages, setMessages] = useState<ChatMessage[]>([
  { role: ChatMessageRole.Model, content: initialMessage },
])
```

## Solution

### 1. Created GET Endpoint for Conversation History

**File**: `src/app/api/agent/conversation/route.ts` (NEW)

```typescript
GET /api/agent/conversation?exerciseId=<id>
```

- Fetches existing conversation for authenticated user + exercise
- Returns all messages in the conversation
- Returns empty array if no conversation exists yet

### 2. Updated API Service

**File**: `src/services/api/api-service.ts`

Added new types and method:
- `ConversationMessage` interface
- `ConversationApiResponse` interface
- `getConversation(exerciseId)` method

### 3. Load History on Component Mount

**File**: `useNotebookChat.ts`

Added `useEffect` hook to:
- Fetch conversation history when component mounts
- Map API messages to ChatMessage format
- Replace initial message with full history if it exists
- Show loading state while fetching

```typescript
useEffect(() => {
  async function loadConversationHistory() {
    const result = await apiService.getConversation(exerciseId)

    if (result.success && result.exists && result.messages.length > 0) {
      const loadedMessages = result.messages.map(...)
      setMessages(loadedMessages)
    }
    // Keep initial message if no history exists
  }

  loadConversationHistory()
}, [exerciseId])
```

### 4. Added Loading Indicator

**File**: `NotebookChat/index.tsx`

Shows "Loading conversation..." spinner while fetching history.

## Files Changed

1. ✅ `src/app/api/agent/conversation/route.ts` - NEW
2. ✅ `src/services/api/api-service.ts` - Added `getConversation()` method
3. ✅ `useNotebookChat.ts` - Added history loading logic
4. ✅ `NotebookChat/index.tsx` - Added loading state UI

## How It Works Now

1. **Page loads** → Component mounts
2. **Fetches history** → `GET /api/agent/conversation?exerciseId=X`
3. **History exists?**
   - YES → Load all messages, replace welcome message
   - NO → Keep initial welcome message
4. **User refreshes** → Same flow, history persists ✅

## Testing

### Manual Test Steps

1. Open exercise page: `/courses/.../exercises/:id`
2. Send a chat message
3. Refresh the page
4. ✅ Chat history should be preserved

### Edge Cases Handled

- ✅ First time user (no conversation exists) → Shows welcome message
- ✅ Returning user with history → Loads full conversation
- ✅ Authentication required → Handled gracefully
- ✅ Network errors → Falls back to welcome message
- ✅ Loading state shown → UX feedback during fetch

## Database Schema

Uses existing `conversations` collection:
- `user` - User ID (relationship)
- `exercise` - Exercise ID (relationship)
- `messages` - Array of message objects
  - `role` - 'user' or 'model'
  - `content` - Message text
  - `timestamp` - When message was sent

No schema changes required.

## Security

- ✅ **Authentication required** - Endpoint checks `req.user`
- ✅ **User isolation** - Query filters by `user.id`
- ✅ **No data leakage** - Users only see their own conversations

## Performance

- **Initial load**: +1 API call (~50-100ms)
- **Caching**: None currently (could add client-side caching if needed)
- **Impact**: Minimal - only runs once on mount

## Future Enhancements

### Short-term
- [ ] Add client-side caching (localStorage/IndexedDB)
- [ ] Add retry logic for failed fetches
- [ ] Show message count in loading state

### Long-term
- [ ] Real-time sync (WebSocket/SSE)
- [ ] Pagination for very long conversations
- [ ] Export conversation history
- [ ] Search within conversation

## Related Issues

- Fixes: Chat history lost on refresh
- Related to: Long-term memory system (retrieves past context)
- Works with: Existing conversation persistence in database

## Verification

```bash
# 1. Start dev server
pnpm dev

# 2. Navigate to exercise page
# http://localhost:3000/courses/.../exercises/:id

# 3. Send a message

# 4. Refresh page

# 5. Verify chat history persists ✅
```

## Notes

- The POST `/api/agent/chat` endpoint already saves messages to the database
- This fix only adds the **loading** part, not the saving
- Conversation is created on first message (existing behavior)
- Welcome message still shown for brand new users

