#!/bin/bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

SMOKE_BASE_URLS="${SMOKE_BASE_URLS:-$BASE_URL}" pnpm tsx scripts/smoke-web-api.ts
