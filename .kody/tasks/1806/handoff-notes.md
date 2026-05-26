# Merge Conflict Resolution for PR #1806

## What was done

Resolved the single conflicted file `src/ui/admin/RecentTransactionsWidget/index.tsx`.

## Conflict resolution

The conflict was in the `fetchTransactions` callback on the API endpoint URL:

- **HEAD (PR branch)**: `/api/admin/recent-transactions?limit=5`
- **origin/dev**: `/api/transactions?limit=5&sort=-createdAt&depth=2`

**Decision**: Took the `origin/dev` version (`/api/transactions`).

**Rationale**: The PR title states "Recent Transactions widget shows HTTP 404 error" — the PR branch's endpoint `/api/admin/recent-transactions` doesn't exist and would continue to 404. The `/api/transactions` endpoint is the correct Payload CMS transactions endpoint that exists. Additionally, the dev version includes `sort=-createdAt&depth=2` which provides proper sorting and relationship depth.

## Quality checks

- TypeScript: passed
- ESLint: passed (no errors)
- Conflict markers: none remain
