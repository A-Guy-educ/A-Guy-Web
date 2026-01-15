# Active Conversation Invariant Verification

## Invariant
**Active = `archivedAt` field is MISSING**  
**Archived = `archivedAt` field EXISTS**

## Verification Status: ✅ ALL CORRECT

### 1. Schema (`src/collections/Conversations.ts`)
- ✅ NO `defaultValue` for `archivedAt` field
- ✅ Access control: `create: () => false, update: () => false`
- ✅ Comment: "NO defaultValue - active docs must NOT have this field"
- ✅ Invariant documented in field description

### 2. Migration Script (`scripts/migrate-conversations-context.ts`)
- ✅ Does NOT set `archivedAt` in `updateData`
- ✅ Comment: "Do NOT set archivedAt - active conversations must NOT have this field"
- ✅ Header comment: "Active conversations must NOT have archivedAt field (missing = active)"

### 3. Service Layer (`src/lib/services/conversation-service.ts`)
- ✅ Does NOT set `archivedAt` when creating conversations
- ✅ Uses `archivedAt: { exists: false }` in all active queries (3 occurrences)
- ✅ Uses `overrideAccess: true` when archiving (setting `archivedAt: new Date()`)

### 4. API Queries
- ✅ `src/services/api/api-service.ts`: Uses `archivedAt: { exists: false }`
- ✅ All active conversation queries use the correct pattern

### 5. Database Indexes
- ✅ `scripts/setup-conversation-indexes.ts`: Uses `{ archivedAt: { $exists: false } }`
- ✅ `scripts/migrate-conversations-context.ts`: Uses `{ archivedAt: { $exists: false } }`
- ✅ Both unique partial indexes correctly filter for missing field

### 6. Verification Scripts
- ✅ `scripts/verify-conversations.ts`: Uses `{ archivedAt: { $exists: false } }`
- ✅ `scripts/normalize-conversations-archivedAt.ts`: Finds and removes `archivedAt: null`
- ✅ Both scripts handle ObjectId | string types correctly

### 7. Integration Tests
- ✅ `tests/int/conversations.int.spec.ts`: Uses `archivedAt: { exists: false }` in queries
- ✅ Tests verify field is undefined (missing), not null
- ✅ DB-level uniqueness tests use raw MongoDB values to avoid string/ObjectId mismatch

## Summary
All production code correctly implements the invariant:
- **Active conversations**: Field is MISSING (not set, not null)
- **Archived conversations**: Field EXISTS with a Date value
- **All queries**: Use `archivedAt: { exists: false }`
- **All indexes**: Use `{ archivedAt: { $exists: false } }`

## Note on Unit Tests
Unit tests in `tests/unit/` still use `archivedAt: null` in test mocks. These are test-only and don't affect production behavior, but could be updated for consistency.
