Applied two targeted fixes to PR #7 (bump node from 22-alpine to 26-alpine):

1. CI node-version: All 7 `setup-node` actions in `.github/workflows/ci.yml` had their `node-version` updated from `'22'` to `'26'`. This closes the CI validation gap where the production Node 26 image was never tested in the pipeline before merge.

2. Dockerfile.dev pinning: Changed line 19 from floating `node:26-alpine` to exact `node:26.3.0-alpine`, matching the exact version already used in `Dockerfile:4`. This aligns the two Dockerfiles' versioning strategy.

No other changes made. Quality gates (typecheck, lint, tests) pass.
