'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { GeometrySpecV1 } from '@/infra/contracts'
import { renderGeometrySpec } from '../../graphics/geometryElements'
import { computeBoardSize } from '@/infra/utils/graphics/board-sizing'
import { useSketchMaxHeight } from '../../context/SketchMaxHeightContext'

const JSXGraphBoard = dynamic(
  () => import('../../graphics/JSXGraphBoard').then((m) => ({ default: m.JSXGraphBoard })),
  {
    ssr: false,
    loading: () => <div className="w-full h-64 bg-muted animate-pulse rounded-lg" />,
  },
)

// Legacy display-size enum kept for prop compatibility; sizing is now a single
// container-relative rule in `board-sizing.ts` (fixed 330px height, aspect-
// driven width, min 280px, max 75% of container). `xsmall` matches Admin's
// expanded enum so content with that value type-checks.
export type DisplaySize = 'xsmall' | 'small' | 'medium' | 'large' | 'full'

interface GeometryRendererProps {
  blockId: string
  spec: GeometrySpecV1
  /** Legacy — see note on `DisplaySize` above. Unused in sizing math. */
  displaySize?: DisplaySize
}

export function GeometryRenderer({ blockId, spec }: GeometryRendererProps) {
  const handleBoardReady = useCallback(
    (board: JXG.Board) => {
      renderGeometrySpec(board, spec)
    },
    [spec],
  )

  const { canvas } = spec
  const boundingBox = useMemo<[number, number, number, number]>(
    () => canvas.boundingBox ?? [0, canvas.height, canvas.width, 0],
    [canvas.boundingBox, canvas.width, canvas.height],
  )

  // Size the container to match the bounding box aspect ratio so 1 unit on
  // x and 1 unit on y produce the same pixel length. Without this the
  // container was left at canvas.width × canvas.height and CSS max-width
  // stretched it to whatever the parent gave — unit circles rendered as
  // ~1.2:1 ellipses on the default 600×400 canvas.
  const [bbXMin, bbYMax, bbXMax, bbYMin] = boundingBox
  const xRange = Math.abs(bbXMax - bbXMin)
  const yRange = Math.abs(bbYMax - bbYMin)

  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: canvas.width, height: canvas.height })
  const maxHeight = useSketchMaxHeight()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const recompute = () => {
      // Pass the raw container width — board-sizing applies the 75%-of-
      // container cap, min width, and narrow-screen fallbacks itself.
      const size = computeBoardSize({
        xRange,
        yRange,
        availableWidth: container.clientWidth,
        maxHeight,
      })
      setDimensions(size)
    }
    recompute()
    // JSXGraphBoard rebuilds the whole board (freeBoard + initBoard +
    // renderGeometrySpec) whenever width/height change. Without an rAF
    // gate, a window drag fires ResizeObserver at animation-frame cadence
    // and every tick triggers a full O(elements) rebuild — heavy specs
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
    const observer = new ResizeObserver(scheduleRecompute)
    observer.observe(container)
    return () => {
      observer.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [xRange, yRange, maxHeight])

  // When the board shrinks below the container width, center the fixed-
  // pixel JSXGraph child so it doesn't sit flush against the inline-start
  // edge (SvgRenderer centers its scaled wrapper the same way via mx-auto —
  // this keeps svg / geometry / axis sketches visually consistent when
  // authored side-by-side).
  return (
    <div className="w-full flex justify-center my-4" ref={containerRef}>
      <JSXGraphBoard
        id={blockId}
        width={dimensions.width}
        height={dimensions.height}
        boundingBox={boundingBox}
        showGrid={canvas.grid ?? false}
        showAxis={canvas.axis ?? false}
        onBoardReady={handleBoardReady}
        interactive={spec.interactive !== false}
        className="border-border"
      />
    </div>
  )
}
