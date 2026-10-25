'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { AxisSpecV1 } from '@/infra/contracts'
import { renderAxisSpec } from '../../graphics/axisElements'
import { resolveViewport } from '@/infra/utils/graphics/viewport-utils'
import { computeBoardSize } from '@/infra/utils/graphics/board-sizing'
import { useSketchMaxHeight } from '../../context/SketchMaxHeightContext'

const JSXGraphBoard = dynamic(
  () => import('../../graphics/JSXGraphBoard').then((m) => ({ default: m.JSXGraphBoard })),
  {
    ssr: false,
    loading: () => <div className="w-full h-64 bg-muted animate-pulse rounded-lg" />,
  },
)

// Legacy display-size enum kept for backward compatibility — the renderer no
// longer multiplies the container width by this value. Sizing is now a single
// container-relative rule in `board-sizing.ts` (fixed 330px height,
// aspect-driven width, min 280px, max 75% of container). `xsmall` matches
// Admin's expanded enum so admin-authored content with the finer size round-
// trips cleanly.
export type DisplaySize = 'xsmall' | 'small' | 'medium' | 'large' | 'full'

interface AxisRendererProps {
  blockId: string
  spec: AxisSpecV1
  /** Legacy — see note on `DisplaySize` above. Unused in sizing math. */
  displaySize?: DisplaySize
}

export function AxisRenderer({ blockId, spec }: AxisRendererProps) {
  const handleBoardReady = useCallback(
    (board: JXG.Board) => {
      renderAxisSpec(board, spec)
    },
    [spec],
  )

  const boundingBox = useMemo<[number, number, number, number]>(() => {
    const resolved = resolveViewport(spec)
    return [resolved.xMin, resolved.yMax, resolved.xMax, resolved.yMin]
  }, [spec])

  // Container ref for responsive sizing
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 })
  const maxHeight = useSketchMaxHeight()

  // Derive the board's aspect ratio from the mathematical viewport (times
  // the optional x/y proportion) instead of a fixed 3:2 container. Without
  // this the container was hardcoded to 600x400 and JSXGraph stretched x-
  // units ~1.5x wider than y-units even when the viewport was symmetric —
  // grid squares came out as rectangles and unit circles as ellipses.
  const proportion = spec.proportion ?? 1
  const viewportSize = useMemo(() => {
    const v = resolveViewport(spec)
    return { xRange: v.xMax - v.xMin, yRange: v.yMax - v.yMin }
  }, [spec])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const recompute = () => {
      // Pass the raw container width — board-sizing now handles the
      // 75%-of-container cap, min width, and narrow-screen fallbacks
      // internally.
      const size = computeBoardSize({
        xRange: viewportSize.xRange,
        yRange: viewportSize.yRange,
        availableWidth: container.clientWidth,
        proportion,
        maxHeight,
      })
      setDimensions(size)
    }

    recompute()
    // JSXGraphBoard rebuilds the whole board (freeBoard + initBoard +
    // renderAxisSpec) whenever width/height change. Without an rAF gate,
    // a window drag fires ResizeObserver at animation-frame cadence and
    // every tick triggers a full O(elements) rebuild — heavy specs
    // visibly stutter. Coalescing consecutive ticks into one paint means
    // at most one rebuild per frame.
    let rafId: number | null = null
    const scheduleRecompute = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        recompute()
      })
    }
    const resizeObserver = new ResizeObserver(scheduleRecompute)
    resizeObserver.observe(container)
    return () => {
      resizeObserver.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [viewportSize.xRange, viewportSize.yRange, proportion, maxHeight])

  // See GeometryRenderer for the centering rationale — shrunk boards
  // sit flush left inside `w-full` unless we center the fixed-pixel
  // JSXGraph child.
  return (
    <div className="w-full flex justify-center my-4" ref={containerRef}>
      <JSXGraphBoard
        id={blockId}
        width={dimensions.width}
        height={dimensions.height}
        boundingBox={boundingBox}
        showGrid={spec.grid.enabled}
        showAxis
        axisConfig={{
          showNumbers: spec.axes.showNumbers,
          showLabels: spec.axes.showLabels,
          ticks: spec.axes.ticks,
          labels: spec.axes.labels,
          tickPosition: spec.axes.tickPosition ?? { x: 'default', y: 'default' },
          origin: spec.axes.origin,
        }}
        onBoardReady={handleBoardReady}
        className="border-border"
      />
    </div>
  )
}
