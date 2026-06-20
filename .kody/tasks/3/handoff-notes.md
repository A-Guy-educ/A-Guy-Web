## What was done

Added a "Verify runner version" step to `.github/workflows/self-hosted-smoke.yml` (between the pre-checkout audit and the checkout step). The step reads `$RUNNER_ROOT/.runner_version`, parses the semver, and fails with a clear error if the runner is before v2.329.0 — the minimum required for `actions/checkout@v6`.

## Why

The review flagged that `actions/checkout@v6` requires GitHub Actions runner >= v2.329.0, but the self-hosted runners targeted by `self-hosted-smoke.yml` (labels `local` and `docker`) could be on older versions. The existing PR diff updated all `uses: actions/checkout@v4` → `@v6` correctly across 11 workflow files; no further changes were needed there. The new step gates the checkout action so outdated runners fail fast rather than producing obscure git/credential errors at runtime.

## Follow-up required (infrastructure, not code)

Someone with access to the self-hosted runner machines must upgrade the runner software to >= v2.329.0. The workflow version check added here will enforce this going forward.

## Files changed

- `.github/workflows/self-hosted-smoke.yml`: inserted "Verify runner version" step before checkout step
