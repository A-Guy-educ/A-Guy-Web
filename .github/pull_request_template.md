## Summary

This PR fixes two issues with the exercise conversion feature:

### 1. LessonConversionPanel not detecting PDF files

**Problem**: The `useFormFields` hook selector was incorrect, causing `contentFiles` to always be `undefined`.

**Fix**: Changed the selector from:

```typescript
const contentFilesField = useFormFields((context: any) => context.contentFiles)
```

to:

```typescript
const contentFilesField = useFormFields(([fields]: any[]) => fields?.contentFiles)
```

The `useFormFields` hook passes an **array** of form fields to the selector callback, not a context object.

### 2. Jobs collection access error in run-immediate endpoint

**Problem**: The `getJobsCollection` function was using the wrong API to access the MongoDB collection.

**Fix**: Changed from direct config access to using the Payload instance:

```typescript
// Before (broken):
const db = (resolvedConfig as { db?: { connection?: {...} } }).db
const coll = db?.connection?.collection?.('payload-jobs')

// After (fixed):
const payload = await getPayload({ config: resolvedConfig })
const db = payload.db as any
const coll = db.collections?.jobs || db.collection?.('jobs') || db.connection?.collection?.('payload-jobs')
```

## Testing

- [ ] Verify LessonConversionPanel shows PDF files correctly
- [ ] Verify `/api/jobs/run-immediate` endpoint works without errors
