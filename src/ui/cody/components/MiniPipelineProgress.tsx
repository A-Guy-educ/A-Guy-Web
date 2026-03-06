/**
 * @fileType component
 * @domain cody
 * @pattern pipeline-progress
 * @ai-summary Compact inline pipeline progress indicator for task cards — shows stage dots, current stage label, and elapsed time
 */
'use client'

import { useState, useEffect } from 'react'
import { cn } from '../utils'
import type { CodyTask } from '../types'
import { ALL_STAGES } from '../constants'
import { calculatePipelineProgress, stageLabels, formatElapsed } from '../pipeline-utils'
import { Loader2, Timer, Pause, ExternalLink } from 'lucide-react'

interface MiniPipelineProgressProps {
  task: CodyTask
  className?: string
}

/**
 * Compact pipeline progress for task list cards.
 *
 * Rendering priority:
 * 1. Pipeline running with currentStage → rich stage dots + label + step counter
 * 2. Pipeline running without currentStage → shimmer bar (just started)
 * 3. Pipeline paused → stage dots up to pause point + "Paused" label
 * 4. Pipeline completed/failed → progress bar + state label
 * 5. No pipeline data → spinner with workflow status text
 */
export function MiniPipelineProgress({ task, className }: MiniPipelineProgressProps) {
  const [, setTick] = useState(0)
  const isActive = task.column === 'building' || task.column === 'retrying'

  // Tick every 5 seconds to keep elapsed time fresh for active tasks
  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => setTick((t) => t + 1), 5000)
    return () => clearInterval(interval)
  }, [isActive])

  // Not a building/retrying task — don't show progress
  if (!isActive) return null

  const pipeline = task.pipeline
  const workflowRun = task.workflowRun

  // Determine the highest stage index that's been touched
  const getHighestStageIndex = (): number => {
    if (!pipeline?.stages) return -1
    let highest = -1
    for (const [stageName, stageData] of Object.entries(pipeline.stages)) {
      if (stageData.state !== 'pending') {
        const idx = ALL_STAGES.indexOf(stageName as (typeof ALL_STAGES)[number])
        if (idx > highest) highest = idx
      }
    }
    return highest
  }

  // ── Case 1: Pipeline data with running state + currentStage ──
  if (pipeline && pipeline.state === 'running' && pipeline.currentStage) {
    const progress = calculatePipelineProgress(pipeline)

    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <StageDots currentIndex={progress.currentStageIndex} state="running" />
        <span className="text-[11px] text-blue-400 font-medium truncate max-w-28">
          {progress.currentStageLabel}
        </span>
        <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
          {progress.stepNumber}/{progress.totalStages}
        </span>
        <ElapsedBadge since={pipeline.startedAt} />
      </div>
    )
  }

  // ── Case 2: Pipeline data with running state but no currentStage ──
  if (pipeline && pipeline.state === 'running') {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-blue-500/0 via-blue-400 to-blue-500/0 rounded-full animate-shimmer" />
        </div>
        <span className="text-[11px] text-blue-400/80">Starting...</span>
        <ElapsedBadge since={pipeline.startedAt} />
      </div>
    )
  }

  // ── Case 3: Pipeline paused (at a gate) ──
  if (pipeline && pipeline.state === 'paused') {
    const pausedIdx = getHighestStageIndex()

    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <StageDots currentIndex={pausedIdx} state="paused" />
        <Pause className="w-3 h-3 text-yellow-400" />
        <span className="text-[11px] text-yellow-400 font-medium">Awaiting approval</span>
        <ElapsedBadge since={pipeline.startedAt} />
      </div>
    )
  }

  // ── Case 4: Pipeline completed/failed/timeout with stage data ──
  if (pipeline && Object.keys(pipeline.stages || {}).length > 0) {
    const stages = pipeline.stages || {}
    const total = ALL_STAGES.length
    const completed = Object.values(stages).filter((s) => s.state === 'completed').length
    const pct = Math.round((completed / total) * 100)

    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              pipeline.state === 'failed' ? 'bg-red-500' : 'bg-emerald-500',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
          {completed}/{total}
        </span>
        <StateLabel state={pipeline.state} />
      </div>
    )
  }

  // ── Case 5: No pipeline data — show workflow run status ──
  const startTime = workflowRun?.created_at || task.updatedAt
  const wfStatus = workflowRun?.status

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
      <span className="text-[11px] text-blue-400/80">
        {wfStatus === 'in_progress'
          ? 'Pipeline running...'
          : wfStatus === 'queued'
            ? 'Queued...'
            : wfStatus === 'completed'
              ? 'Finishing up...'
              : 'Starting...'}
      </span>
      {workflowRun?.html_url && (
        <a
          href={workflowRun.html_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-zinc-500 hover:text-blue-400 transition-colors"
          title="View workflow run"
        >
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}
      <ElapsedBadge since={startTime} />
    </div>
  )
}

// ── Subcomponents ──

/** Compact row of stage dots showing pipeline progress */
function StageDots({ currentIndex, state }: { currentIndex: number; state: 'running' | 'paused' }) {
  return (
    <div className="flex items-center gap-[3px]">
      {ALL_STAGES.map((stage, i) => {
        const isCompleted = i < currentIndex
        const isCurrent = i === currentIndex
        const isPending = i > currentIndex

        return (
          <div
            key={stage}
            className={cn(
              'rounded-full transition-all duration-300',
              // Size: current dot is slightly larger
              isCurrent ? 'w-2 h-2' : 'w-1.5 h-1.5',
              // Colors
              isCompleted && 'bg-blue-500',
              isCurrent &&
                state === 'running' &&
                'bg-blue-400 animate-pulse shadow-[0_0_4px_rgba(96,165,250,0.6)]',
              isCurrent &&
                state === 'paused' &&
                'bg-yellow-400 shadow-[0_0_4px_rgba(250,204,21,0.5)]',
              isPending && 'bg-zinc-600/60',
            )}
            title={stageLabels[stage] || stage}
          />
        )
      })}
    </div>
  )
}

/** Pipeline state label chip */
function StateLabel({ state }: { state: string }) {
  return (
    <span
      className={cn(
        'text-[10px] font-medium',
        state === 'completed' && 'text-emerald-400',
        state === 'failed' && 'text-red-400',
        state === 'timeout' && 'text-orange-400',
        state === 'paused' && 'text-yellow-400',
      )}
    >
      {state === 'completed' && '✓ done'}
      {state === 'failed' && '✗ failed'}
      {state === 'timeout' && '⏰ timeout'}
      {state === 'paused' && '⏸ paused'}
    </span>
  )
}

/** Elapsed time badge with timer icon */
function ElapsedBadge({ since }: { since?: string | null }) {
  if (!since) return null
  return (
    <span className="text-[10px] text-zinc-500 font-mono tabular-nums flex items-center gap-0.5">
      <Timer className="w-2.5 h-2.5" />
      {formatElapsed(new Date(since))}
    </span>
  )
}
