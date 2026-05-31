## Root Cause

The CI E2E Gate job was failing because the `webServer` command in `playwright.e2e-gate.config.ts` checked for `.next` directory existence (`test -d .next`) before starting the production server. However, the CI build job's cache restoration can produce an incomplete `.next` directory (directory exists but missing `BUILD_ID` and other build artifacts). When `next start` ran against an incomplete build, it failed with "Could not find a production build in the '.next' directory".

## Fix Applied

Changed the webServer command from:
```
'(test -d .next || pnpm build) && pnpm start'
```
to:
```
'(test -f .next/BUILD_ID || pnpm build) && pnpm start'
```

This ensures that if the `.next` directory exists but is missing the `BUILD_ID` file (indicating an incomplete or corrupted cache restore), the build will be re-run before attempting to start the server.

## Verification

All quality gates pass: typecheck, lint, and tests pass locally.
