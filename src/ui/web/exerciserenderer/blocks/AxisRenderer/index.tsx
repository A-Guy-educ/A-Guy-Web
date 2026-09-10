'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { AxisSpecV1 } from '@/infra/contracts'
import { renderAxisSpec } from '../../graphics/axisElements'
import { resolveViewport } from '@/infra/utils/graphics/viewport-utils'
import { computeBoardSize } from '@/infra/utils/graphics/board-sizing'

const JSXGraphBoard = dynamic(
  () => import('../../graphics/JSXGraphBoard').then((m) => ({ default: m.JSXGraphBoard })),
  {
    ssr: false,
    loading: () => <div className="w-full h-64 bg-muted animate-pulse rounded-lg" />,
  },
)

// Display size to percentage mapping
const SIZE_MAP = {
  small: 0.33,
  medium: 0.5,
  large: 0.75,
  full: 1,
} as const

export type DisplaySize = 'small' | 'medium' | 'large' | 'full'

interface AxisRendererProps {
  blockId: string
  spec: AxisSpecV1
  displaySize?: DisplaySize
}

export function AxisRenderer({ blockId, spec, displaySize = 'full' }: AxisRendererProps) {
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

    const percentage = SIZE_MAP[displaySize]

    const recompute = () => {
      const availableWidth = container.clientWidth * percentage
      const size = computeBoardSize({
        xRange: viewportSize.xRange,
        yRange: viewportSize.yRange,
        availableWidth,
        proportion,
        maxWidth: 600,
        maxHeight: 600,
        minWidth: 200,
        minHeight: 200,
      })
      setDimensions(size)
    }

    recompute()
    const resizeObserver = new ResizeObserver(recompute)
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [displaySize, viewportSize.xRange, viewportSize.yRange, proportion])

  // Determine container width style based on displaySize
  const containerWidth = displaySize === 'full' ? 'w-full' : ''

  return (
    <div className={`my-4 flex justify-center ${containerWidth}`} ref={containerRef}>
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
