#!/usr/bin/env ts-node
// pipeline-spec.ts - Runs spec + clarify (Phase 1)
// Usage: pnpm pipeline:spec <task-id>

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const taskId = process.argv[2]

if (!taskId) {
  console.log('Usage: pnpm pipeline:spec <task-id>')
  console.log('Example: pnpm pipeline:spec 260214-version-footer')
  process.exit(1)
}

const projectDir = process.cwd()
const taskDir = path.join(projectDir, '.tasks', taskId)

// Always run: spec → clarify
const stages = ['spec', 'clarify']

console.log(`=== Pipeline Spec: ${taskId} ===`)

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
console.log('STOP: Clarification required')
console.log('')
console.log('1. Read questions:')
console.log(`   ${taskDir}/questions.md`)
console.log('')
console.log('2. Write answers:')
console.log(`   ${taskDir}/clarified.md`)
console.log('')
console.log('When ready, run: pnpm pipeline:impl <task-id>')
console.log('========================================')
console.log('')
