#!/usr/bin/env ts-node
// pipeline-impl.ts - Runs plan through PR (Phase 2)
// Usage: pnpm pipeline:impl <task-id>

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const taskId = process.argv[2]

if (!taskId) {
  console.log('Usage: pnpm pipeline:impl <task-id>')
  console.log('Example: pnpm pipeline:impl 260214-version-footer')
  process.exit(1)
}

const projectDir = process.cwd()
const taskDir = path.join(projectDir, '.tasks', taskId)

// Check that clarification exists
if (!fs.existsSync(path.join(taskDir, 'clarified.md'))) {
  console.error(`Error: ${taskDir}/clarified.md not found`)
  console.log('Run "pnpm pipeline:spec <task-id>" first to generate questions.')
  process.exit(1)
}

// Always run: plan → build → test → verify → auditor → pr
const stages = ['plan', 'build', 'test', 'verify', 'auditor', 'pr']

console.log(`=== Pipeline Impl: ${taskId} ===`)

for (let i = 0; i < stages.length; i++) {
  const stage = stages[i]

  // Skip if output already exists
  const outputFile = path.join(taskDir, `${stage}.md`)
  if (fs.existsSync(outputFile)) {
    console.log(`[${i + 1}/${stages.length}] ${stage} already exists, skipping`)
    continue
  }

  console.log(`[${i + 1}/${stages.length}] Running ${stage} agent...`)

  execSync(`ocode run --agent ${stage} "Execute ${stage} for ${taskId}"`, {
    cwd: projectDir,
    stdio: 'inherit',
  })

  console.log(`✓ ${stage} complete`)
}

console.log('')
console.log('========================================')
console.log(`✓ Pipeline complete: ${taskId}`)
console.log('========================================')
console.log('')
