# Test Validation Guide

## Quick Start: Running Tests with Docker

### Prerequisites
- Docker installed and running
- pnpm installed

### Step 1: Verify Docker is Running

```bash
docker ps
```

If Docker is not running, start it:
- **macOS/Windows**: Start Docker Desktop
- **Linux**: `sudo systemctl start docker`

### Step 2: Run Tests

The tests use testcontainers which automatically start MongoDB:

```bash
# Run conversation history tests
pnpm test:int tests/int/conversation-history-loading.int.spec.ts
```

### Step 3: Verify Results

You should see:
- ✅ All 10 tests passing
- MongoDB container automatically started/stopped
- Test results showing access control validation

## Alternative: Manual MongoDB Setup

If you prefer to run MongoDB manually:

```bash
# Start MongoDB
pnpm db:start

# Run tests (tests will use the running MongoDB)
pnpm test:int tests/int/conversation-history-loading.int.spec.ts

# Stop MongoDB
pnpm db:stop
```

## What the Tests Validate

1. ✅ Payload REST API endpoint (/api/conversations) structure
2. ✅ Access control (isOwner) filters by user ID
3. ✅ Query structure matches frontend implementation
4. ✅ User isolation (users only see their own conversations)
5. ✅ Sort order returns most recent conversation
6. ✅ Unauthenticated requests are blocked

## Troubleshooting

**Docker not found:**
- Install Docker Desktop (macOS/Windows) or Docker Engine (Linux)
- Ensure Docker daemon is running

**Tests skip:**
- Check if DATABASE_URL is set (for manual setup)
- Verify Docker is running (for testcontainers)

**Connection errors:**
- Ensure MongoDB container is running: `docker ps | grep mongo`
- Check DATABASE_URL format in .env file
