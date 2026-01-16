# Running Integration Tests

This guide explains how to run integration tests, particularly those that require MongoDB.

## Prerequisites

- Docker installed and running
- Node.js and pnpm installed
- Environment variables configured (see `.env.example`)

## Option 1: Using Testcontainers (Recommended)

The integration tests use [testcontainers](https://testcontainers.com/) to automatically start and stop MongoDB containers. This is the recommended approach as it requires no manual setup.

### Requirements

- Docker must be installed and running
- Docker daemon must be accessible (usually requires Docker Desktop or Docker Engine)

### Running Tests

```bash
# Run all integration tests
pnpm test:int

# Run specific test file
pnpm test:int tests/int/conversation-history-loading.int.spec.ts

# Run with watch mode
pnpm test:watch
```

### How It Works

1. Tests automatically start a MongoDB container using testcontainers
2. Tests run against the containerized MongoDB
3. Container is automatically stopped and cleaned up after tests complete

### Troubleshooting

**Error: "Could not find a working container runtime strategy"**
- Ensure Docker is installed and running
- On Linux, ensure your user is in the `docker` group
- On macOS/Windows, ensure Docker Desktop is running

**Error: "DATABASE_URL is set to MongoDB Atlas"**
- Testcontainers cannot be used with Atlas connections
- The test will automatically unset DATABASE_URL before starting containers
- This is expected behavior

## Option 2: Using Docker Compose (Manual MongoDB)

If you prefer to run MongoDB manually using docker-compose:

### Start MongoDB

```bash
# Start MongoDB container
pnpm db:start
# OR
docker-compose up -d mongo

# Verify it's running
docker ps | grep mongo
```

### Configure Environment

Create a `.env` file with:

```env
DATABASE_URL=mongodb://127.0.0.1:27017/test-database
PAYLOAD_SECRET=your-secret-here-min-32-chars
# ... other required variables
```

### Run Tests

```bash
# Run all integration tests
pnpm test:int

# Run specific test file
pnpm test:int tests/int/conversation-history-loading.int.spec.ts
```

### Stop MongoDB

```bash
# Stop MongoDB container
pnpm db:stop
# OR
docker-compose down
```

## Option 3: Using Existing MongoDB Instance

If you have MongoDB running elsewhere (local or Atlas):

### Configure Environment

Create a `.env` file with your MongoDB connection string:

```env
DATABASE_URL=mongodb://localhost:27017/test-database
# OR for Atlas:
# DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/test-database

PAYLOAD_SECRET=your-secret-here-min-32-chars
# ... other required variables
```

### Run Tests

```bash
pnpm test:int tests/int/conversation-history-loading.int.spec.ts
```

**Note:** Tests using testcontainers will automatically unset DATABASE_URL and start their own container. If you want to use an existing MongoDB instance, you may need to modify the test setup.

## Test Files

### Conversation History Loading Tests

Tests in `tests/int/conversation-history-loading.int.spec.ts` validate:

- ✅ User message storage
- ✅ Conversation history loading via REST API
- ✅ Access control enforcement (users only see their own conversations)
- ✅ REST API access control filters by user ID
- ✅ REST API query matches frontend implementation
- ✅ Payload REST API endpoint structure validation
- ✅ Sort order validation
- ✅ Edge cases

### Running Specific Tests

```bash
# Run conversation history tests
pnpm test:int tests/int/conversation-history-loading.int.spec.ts

# Run with verbose output
pnpm test:int tests/int/conversation-history-loading.int.spec.ts --reporter=verbose

# Run with UI mode
pnpm test:ui
```

## CI/CD Integration

In CI/CD environments, ensure:

1. Docker is available in the CI environment
2. Docker daemon is running
3. Testcontainers can access Docker socket

Most CI platforms (GitHub Actions, GitLab CI, etc.) support Docker out of the box.

## Troubleshooting

### Tests Skip Automatically

If tests are skipped, check:

1. Is `DATABASE_URL` set? (For manual MongoDB)
2. Is Docker running? (For testcontainers)
3. Check test output for skip reasons

### MongoDB Connection Errors

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions:**
- Ensure MongoDB is running: `docker ps | grep mongo`
- Check DATABASE_URL in `.env` file
- Verify MongoDB is accessible: `mongosh mongodb://127.0.0.1:27017`

### Testcontainers Errors

```
Error: Could not find a working container runtime strategy
```

**Solutions:**
- Install Docker Desktop or Docker Engine
- Ensure Docker daemon is running: `docker ps`
- On Linux: Add user to docker group: `sudo usermod -aG docker $USER`
- Restart terminal/session after adding to docker group

## Best Practices

1. **Use Testcontainers**: Prefer testcontainers for automatic setup/teardown
2. **Isolated Tests**: Each test should clean up after itself
3. **Fast Tests**: Keep tests fast by using in-memory or containerized databases
4. **CI Ready**: Tests should work in CI without manual setup

## Additional Resources

- [Testcontainers Documentation](https://testcontainers.com/)
- [Payload CMS Testing Guide](https://payloadcms.com/docs)
- [Vitest Documentation](https://vitest.dev/)
